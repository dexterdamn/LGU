import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, validatePassword } from "@/lib/password";

const schema = z.object({
  userId: z.string(),
  password: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, password } = schema.parse(body);

    const validation = validatePassword(password);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.message }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.totpVerified) {
      return NextResponse.json({ error: "Complete previous steps first" }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const isAdmin = user.role === "ADMIN";

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        status: isAdmin ? "ACTIVE" : "PENDING_APPROVAL",
        ...(isAdmin && { approvedAt: new Date() }),
      },
    });

    return NextResponse.json({
      success: true,
      message: isAdmin
        ? "Registration complete! You can now log in."
        : "Registration complete! Await admin approval before logging in.",
      requiresApproval: !isAdmin,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Set password error:", error);
    return NextResponse.json({ error: "Failed to set password" }, { status: 500 });
  }
}
