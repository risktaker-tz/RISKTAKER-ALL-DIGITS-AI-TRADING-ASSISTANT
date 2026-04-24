import { NextResponse } from "next/server";
import { MessageType } from "@prisma/client";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { relayOfflineMessage } from "@/lib/sms/fallback";
import { hasMutualFollow } from "@/lib/tuchati";

const createMessageSchema = z.object({
  chatId: z.string().min(1),
  recipientId: z.string().min(1),
  body: z.string().max(5000).optional(),
  type: z.nativeEnum(MessageType).default(MessageType.TEXT),
  noInternet: z.boolean().default(false),
  media: z
    .array(
      z.object({
        type: z.enum(["IMAGE", "VIDEO", "AUDIO"]),
        url: z.string().url(),
        storageKey: z.string().min(1),
        previewUrl: z.string().url().optional()
      })
    )
    .default([])
});

export async function POST(request: Request) {
  const session = await requireSession();
  const body = await request.json();
  const parsed = createMessageSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const unlocked = await hasMutualFollow(session.userId, parsed.data.recipientId);
  if (!unlocked) {
    return NextResponse.json({ error: "TUCHATI requires mutual follow" }, { status: 403 });
  }

  let smsRelayReference: string | undefined;
  let deliveredViaSms = false;

  if (parsed.data.noInternet && parsed.data.body) {
    const relay = await relayOfflineMessage({
      chatId: parsed.data.chatId,
      senderId: session.userId,
      recipientId: parsed.data.recipientId,
      body: parsed.data.body
    });
    smsRelayReference = relay.reference;
    deliveredViaSms = true;
  }

  const message = await db.message.create({
    data: {
      chatId: parsed.data.chatId,
      senderId: session.userId,
      body: parsed.data.body,
      type: parsed.data.type,
      deliveredViaSms,
      smsRelayReference,
      media: {
        create: parsed.data.media
      }
    },
    include: {
      media: true
    }
  });

  return NextResponse.json({ message }, { status: 201 });
}
