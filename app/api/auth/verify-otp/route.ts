import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { SESSION_COOKIE } from "@/lib/auth";
import { signSession } from "@/lib/jwt";
import { createPhoneHash, normalizePhoneNumber, verifyOtpToken } from "@/lib/otp";

const verifyOtpSchema = z.object({
  phoneNumber: z.string().regex(/^\+\d{8,15}$/),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9._]+$/),
  otpCode: z.string().length(6),
  otpToken: z.string().min(20),
  offlineSmsOptIn: z.boolean().default(false)
});

function encryptPhoneNumber(phoneNumber: string) {
  return createHash("sha256").update(`masked:${phoneNumber}`).digest("hex");
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = verifyOtpSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const normalizedPhoneNumber = normalizePhoneNumber(parsed.data.phoneNumber);
  const otpPayload = await verifyOtpToken(parsed.data.otpToken).catch(() => null);

  if (!otpPayload || otpPayload.phoneNumber !== normalizedPhoneNumber || otpPayload.otpCode !== parsed.data.otpCode) {
    return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 401 });
  }

  const phoneNumberHash = createPhoneHash(normalizedPhoneNumber);

  const user = await db.user.upsert({
    where: { phoneNumberHash },
    update: {
      username: parsed.data.username,
      offlineSmsOptIn: parsed.data.offlineSmsOptIn
    },
    create: {
      phoneNumberEncrypted: encryptPhoneNumber(normalizedPhoneNumber),
      phoneNumberHash,
      username: parsed.data.username,
      offlineSmsOptIn: parsed.data.offlineSmsOptIn
    }
  });

  const session = await signSession({
    userId: user.id,
    username: user.username,
    locale: user.locale
  });

  const response = NextResponse.json({
    success: true,
    user: {
      id: user.id,
      username: user.username
    }
  });

  response.cookies.set(SESSION_COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/"
  });

  return response;
}
