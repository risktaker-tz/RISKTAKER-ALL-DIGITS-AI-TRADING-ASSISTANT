import { NextResponse } from "next/server";
import { z } from "zod";
import { MediaType } from "@prisma/client";

import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { mapPostToFeedPost } from "@/lib/social";

const createPostSchema = z.object({
  caption: z.string().max(2200).optional(),
  hashtags: z.array(z.string()).default([]),
  location: z.string().max(120).optional(),
  media: z
    .array(
      z.object({
        type: z.nativeEnum(MediaType),
        url: z.string().url(),
        previewUrl: z.string().url().optional(),
        storageKey: z.string().min(1)
      })
    )
    .min(1)
});

export async function GET() {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return NextResponse.json({ items: [] });
  }

  const posts = await db.post.findMany({
    where: {
      OR: [
        {
          author: {
            followers: {
              some: {
                followerId: session.userId
              }
            }
          }
        },
        {
          authorId: session.userId
        }
      ]
    },
    include: {
      author: true,
      media: true,
      _count: {
        select: {
          likes: true,
          comments: true
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 20
  });

  return NextResponse.json({ items: posts.map(mapPostToFeedPost) });
}

export async function POST(request: Request) {
  const session = await requireSession();
  const body = await request.json();
  const parsed = createPostSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const post = await db.post.create({
    data: {
      authorId: session.userId,
      caption: parsed.data.caption,
      hashtags: parsed.data.hashtags,
      location: parsed.data.location,
      media: {
        create: parsed.data.media
      }
    },
    include: {
      media: true
    }
  });

  return NextResponse.json({ post }, { status: 201 });
}
