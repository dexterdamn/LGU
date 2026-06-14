import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyTotpToken } from "@/lib/totp";

const schema = z.object({
  userId: z.string(),
  token: z.string().length(6),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, token } = schema.parse(body);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.totpSecret) {
      return NextResponse.json({ error: "User not found or TOTP not set up" }, { status: 404 });
    }

    const valid = verifyTotpToken(token, user.totpSecret);
    if (!valid) {
      return NextResponse.json({ error: "Invalid authenticator code" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { totpVerified: true, status: "PENDING_PASSWORD" },
    });

    return NextResponse.json({
      success: true,
      message: "Authenticator verified. Set your password.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Verify TOTP error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
