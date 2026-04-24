import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSession } from "@/lib/auth";
import { createSignedUploadUrl } from "@/lib/media";

const signUploadSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.enum([
    "image/jpeg",
    "image/png",
    "image/webp",
    "video/mp4",
    "video/webm",
    "audio/mpeg",
    "audio/mp4",
    "audio/wav"
  ]),
  contentLength: z.number().positive()
});

export async function POST(request: Request) {
  await requireSession();
  const body = await request.json();
  const parsed = signUploadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const upload = await createSignedUploadUrl(parsed.data);
  return NextResponse.json(upload);
}
