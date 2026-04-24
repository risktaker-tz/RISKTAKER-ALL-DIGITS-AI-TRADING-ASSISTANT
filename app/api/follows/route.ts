import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

const followSchema = z.object({
  targetUserId: z.string().min(1),
  action: z.enum(["follow", "unfollow"])
});

export async function POST(request: Request) {
  const session = await requireSession();
  const body = await request.json();
  const parsed = followSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.targetUserId === session.userId) {
    return NextResponse.json({ error: "You cannot follow yourself" }, { status: 400 });
  }

  if (parsed.data.action === "follow") {
    await db.follow.upsert({
      where: {
        followerId_followingId: {
          followerId: session.userId,
          followingId: parsed.data.targetUserId
        }
      },
      update: {},
      create: {
        followerId: session.userId,
        followingId: parsed.data.targetUserId
      }
    });
  } else {
    await db.follow.deleteMany({
      where: {
        followerId: session.userId,
        followingId: parsed.data.targetUserId
      }
    });
  }

  return NextResponse.json({ success: true });
}
