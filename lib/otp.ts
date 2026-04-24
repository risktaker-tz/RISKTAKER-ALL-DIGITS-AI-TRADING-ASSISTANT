import { createHash } from "crypto";

import { SignJWT, jwtVerify } from "jose";

const encoder = new TextEncoder();

type OtpPayload = {
  phoneNumber: string;
  otpCode: string;
};

function getOtpSecret() {
  const secret = process.env.OTP_SIGNING_SECRET;
  if (!secret) {
    throw new Error("OTP_SIGNING_SECRET is not configured");
  }
  return encoder.encode(secret);
}

export function normalizePhoneNumber(phoneNumber: string) {
  return phoneNumber.replace(/\s+/g, "").trim();
}

export function createPhoneHash(phoneNumber: string) {
  return createHash("sha256").update(normalizePhoneNumber(phoneNumber)).digest("hex");
}

export function createOtpCode() {
  return `${Math.floor(100000 + Math.random() * 900000)}`;
}

export async function createOtpToken(payload: OtpPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(getOtpSecret());
}

export async function verifyOtpToken(token: string) {
  const { payload } = await jwtVerify(token, getOtpSecret());
  return payload as unknown as OtpPayload;
}
