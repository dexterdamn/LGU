import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateOtpCode, sendOtpEmail } from "@/lib/email";
import { createAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/request";

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  nickname: z.string().min(2),
  officeAgency: z.string().min(2),
  sex: z.enum(["MALE", "FEMALE", "OTHER"]),
  birthday: z.string(),
  address: z.string().min(5),
});

export async function GET() {
  const users = await prisma.user.findMany({
    select: { officeAgency: true },
    where: { officeAgency: { not: "" } },
  });

  const officeAgencies = [...new Set(users.map((u) => u.officeAgency).filter(Boolean))].sort();

  return NextResponse.json({ officeAgencies });
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing && existing.status === "ACTIVE") {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    const userCount = await prisma.user.count();
    const isFirstUser = userCount === 0;

    let user;
    if (existing) {
      user = await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: data.name,
          nickname: data.nickname,
          officeAgency: data.officeAgency,
          sex: data.sex,
          birthday: new Date(data.birthday),
          address: data.address,
          status: "PENDING_EMAIL",
          role: isFirstUser ? "ADMIN" : "DATA_ENCODER",
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          email: data.email,
          name: data.name,
          nickname: data.nickname,
          officeAgency: data.officeAgency,
          sex: data.sex,
          birthday: new Date(data.birthday),
          address: data.address,
          status: "PENDING_EMAIL",
          role: isFirstUser ? "ADMIN" : "DATA_ENCODER",
        },
      });
    }

    const code = generateOtpCode();
    await prisma.emailOtp.create({
      data: {
        userId: user.id,
        code,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    try {
      await sendOtpEmail(data.email, code, data.name);
    } catch (emailError) {
      console.error("Email send failed:", emailError);
      if (process.env.NODE_ENV === "development") {
        console.log(`[DEV] OTP for ${data.email}: ${code}`);
      }
    }

    await createAuditLog({
      action: "REGISTER",
      userId: user.id,
      userEmail: user.email,
      userName: user.nickname,
      ipAddress: ip,
      metadata: { role: user.role },
    });

    return NextResponse.json({
      success: true,
      userId: user.id,
      role: user.role,
      isFirstUser,
      message: "Verification code sent to your email",
      ...(process.env.NODE_ENV === "development" && { devOtp: code }),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Register error:", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
