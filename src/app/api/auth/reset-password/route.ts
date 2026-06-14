import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, validatePassword } from "@/lib/password";
import { createAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/request";

const schema = z.object({
  token: z.string(),
  password: z.string(),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  try {
    const { token, password } = schema.parse(await req.json());

    const validation = validatePassword(password);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.message }, { status: 400 });
    }

    const resetToken = await prisma.passwordResetToken.findFirst({
      where: { token, used: false, expiresAt: { gt: new Date() } },
      include: { user: true },
    });

    if (!resetToken) {
      return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      }),
    ]);

    await createAuditLog({
      action: "PASSWORD_RESET_COMPLETE",
      userId: resetToken.user.id,
      userEmail: resetToken.user.email,
      userName: resetToken.user.nickname,
      ipAddress: ip,
    });

    return NextResponse.json({ success: true, message: "Password updated. You can now log in." });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Reset failed" }, { status: 500 });
  }
}
