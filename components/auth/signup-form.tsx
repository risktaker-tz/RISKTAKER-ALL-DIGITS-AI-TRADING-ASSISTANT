"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type SignupFormProps = {
  locale: string;
};

export function SignupForm({ locale }: SignupFormProps) {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("+255");
  const [username, setUsername] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [offlineSmsOptIn, setOfflineSmsOptIn] = useState(false);

  async function requestOtp() {
    const response = await fetch("/api/auth/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber, username })
    });

    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error ?? "Unable to send OTP");
      return;
    }

    setOtpRequested(true);
    setOtpToken(data.otpToken);
    setStatus(`OTP sent. Demo code: ${data.devOtpCode}`);
  }

  async function verifyOtp() {
    const response = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber, username, otpCode, otpToken, offlineSmsOptIn })
    });

    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error ?? "Unable to verify OTP");
      return;
    }

    router.push(`/${locale}/feed`);
    router.refresh();
  }

  return (
    <div className="rounded-[32px] border border-white/15 bg-white/8 p-6 shadow-glass backdrop-blur sm:p-8">
      <div className="space-y-5">
        <div>
          <label className="mb-2 block text-sm text-slate-200">Phone number</label>
          <input
            value={phoneNumber}
            onChange={(event) => setPhoneNumber(event.target.value)}
            className="w-full rounded-2xl border border-white/15 bg-slate-950/30 px-4 py-3 text-white outline-none placeholder:text-slate-400"
            placeholder="+255700000000"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-slate-200">Username</label>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="w-full rounded-2xl border border-white/15 bg-slate-950/30 px-4 py-3 text-white outline-none placeholder:text-slate-400"
            placeholder="your.handle"
          />
        </div>

        <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={offlineSmsOptIn}
            onChange={(event) => setOfflineSmsOptIn(event.target.checked)}
          />
          Send messages via mobile network if I am offline
        </label>

        {!otpRequested ? (
          <button
            type="button"
            onClick={requestOtp}
            className="w-full rounded-2xl bg-cyan px-4 py-3 font-medium text-ink"
          >
            Send OTP
          </button>
        ) : (
          <>
            <div>
              <label className="mb-2 block text-sm text-slate-200">OTP code</label>
              <input
                value={otpCode}
                onChange={(event) => setOtpCode(event.target.value)}
                className="w-full rounded-2xl border border-white/15 bg-slate-950/30 px-4 py-3 text-white outline-none placeholder:text-slate-400"
                placeholder="123456"
              />
            </div>
            <button
              type="button"
              onClick={verifyOtp}
              className="w-full rounded-2xl bg-coral px-4 py-3 font-medium text-white"
            >
              Verify OTP
            </button>
          </>
        )}

        {status ? <p className="text-sm text-cyan">{status}</p> : null}
      </div>
    </div>
  );
}
