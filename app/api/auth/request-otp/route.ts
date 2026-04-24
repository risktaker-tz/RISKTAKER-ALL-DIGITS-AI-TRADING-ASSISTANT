import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { rateLimit } from "@/lib/rate-limit";
import { createOtpCode, createOtpToken, normalizePhoneNumber } from "@/lib/otp";

const requestOtpSchema = z.object({
  phoneNumber: z.string().regex(/^\+\d{8,15}$/, "Use international phone format"),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9._]+$/)
});

export async function POST(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const clientKey =
    forwardedFor?.split(",")[0]?.trim() ||
    realIp ||
    "local:request-otp";

  const limit = rateLimit(clientKey, 5, 10 * 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many OTP requests" }, { status: 429 });
  }

  const body = await request.json();
  const parsed = requestOtpSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const normalizedPhoneNumber = normalizePhoneNumber(parsed.data.phoneNumber);
  const otpCode = createOtpCode();
  const otpToken = await createOtpToken({
    phoneNumber: normalizedPhoneNumber,
    otpCode
  });

  return NextResponse.json({
    otpToken,
    devOtpCode: otpCode
  });
}
