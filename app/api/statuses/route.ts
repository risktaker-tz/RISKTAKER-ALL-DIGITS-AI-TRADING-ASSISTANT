import { NextResponse } from "next/server";
import { MediaType } from "@prisma/client";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

const statusSchema = z.object({
  text: z.string().max(500).optional(),
  expiresInHours: z.number().int().min(1).max(24).optional(),
  media: z
    .array(
      z.object({
        type: z.nativeEnum(MediaType),
        url: z.string().url(),
        storageKey: z.string(),
        previewUrl: z.string().url().optional()
      })
    )
    .default([])
});

export async function POST(request: Request) {
  const session = await requireSession();
  const body = await request.json();
  const parsed = statusSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const expiresAt = parsed.data.expiresInHours
    ? new Date(Date.now() + parsed.data.expiresInHours * 60 * 60 * 1000)
    : null;

  const status = await db.status.create({
    data: {
      authorId: session.userId,
      text: parsed.data.text,
      expiresAt,
      media: {
        create: parsed.data.media
      }
    },
    include: { media: true }
  });

  return NextResponse.json({ status }, { status: 201 });
}
