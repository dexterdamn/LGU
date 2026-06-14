import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { createAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/request";

const schema = z.object({ email: z.string().email() });
const MAX_DAILY_ATTEMPTS = 5;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  try {
    const { email } = schema.parse(await req.json());

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const attempts = await prisma.passwordResetAttempt.count({
      where: { email, createdAt: { gte: dayAgo } },
    });

    if (attempts >= MAX_DAILY_ATTEMPTS) {
      await createAuditLog({
        action: "PASSWORD_RESET_LIMIT",
        userEmail: email,
        ipAddress: ip,
        reason: "Daily password reset limit reached",
      });
      return NextResponse.json(
        { error: "Maximum 5 password reset attempts per day. Please try again tomorrow." },
        { status: 429 }
      );
    }

    await prisma.passwordResetAttempt.create({ data: { email, ipAddress: ip } });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.status !== "ACTIVE") {
      return NextResponse.json({
        success: true,
        message: "If an account exists, a reset link has been sent.",
      });
    }

    const token = randomBytes(32).toString("hex");
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    try {
      await sendPasswordResetEmail(email, user.name, resetUrl);
    } catch (e) {
      console.error("Reset email failed:", e);
      if (process.env.NODE_ENV === "development") {
        console.log(`[DEV] Reset URL: ${resetUrl}`);
      }
    }

    await createAuditLog({
      action: "PASSWORD_RESET_REQUEST",
      userId: user.id,
      userEmail: user.email,
      userName: user.nickname,
      ipAddress: ip,
    });

    return NextResponse.json({
      success: true,
      message: "If an account exists, a reset link has been sent.",
      ...(process.env.NODE_ENV === "development" && { devResetUrl: resetUrl }),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}
