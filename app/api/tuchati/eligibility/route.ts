import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSession } from "@/lib/auth";
import { hasMutualFollow } from "@/lib/tuchati";

const eligibilitySchema = z.object({
  targetUserId: z.string().min(1)
});

export async function POST(request: Request) {
  const session = await requireSession();
  const body = await request.json();
  const parsed = eligibilitySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const unlocked = await hasMutualFollow(session.userId, parsed.data.targetUserId);
  return NextResponse.json({
    unlocked
  });
}
