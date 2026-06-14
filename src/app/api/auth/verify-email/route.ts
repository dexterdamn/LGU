import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateTotpSecret, generateQrCodeDataUrl } from "@/lib/totp";

const schema = z.object({
  userId: z.string(),
  code: z.string().length(6),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, code } = schema.parse(body);

    const otp = await prisma.emailOtp.findFirst({
      where: {
        userId,
        code,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otp) {
      return NextResponse.json({ error: "Invalid or expired verification code" }, { status: 400 });
    }

    await prisma.emailOtp.update({ where: { id: otp.id }, data: { used: true } });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let secret = user.totpSecret;
    if (!secret) {
      secret = generateTotpSecret();
      await prisma.user.update({
        where: { id: userId },
        data: { totpSecret: secret, status: "PENDING_TOTP" },
      });
    }

    const qrCode = await generateQrCodeDataUrl(user.email, secret);

    return NextResponse.json({
      success: true,
      qrCode,
      message: "Email verified. Set up Google Authenticator.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Verify email error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
