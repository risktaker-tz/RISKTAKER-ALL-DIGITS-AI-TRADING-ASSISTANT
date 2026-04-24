"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Music4, Video } from "lucide-react";

type ComposerProps = {
  avatarUrl?: string | null;
};

export function FeedComposer({ avatarUrl }: ComposerProps) {
  const router = useRouter();
  const [caption, setCaption] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"IMAGE" | "VIDEO" | "AUDIO">("IMAGE");
  const [hashtags, setHashtags] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <section className="rounded-[32px] border border-white/15 bg-white/8 p-5 shadow-glass backdrop-blur">
      <div className="flex items-start gap-4">
        <div
          className="h-12 w-12 rounded-2xl bg-cover bg-center bg-no-repeat"
          style={{
            backgroundColor: "rgba(42, 212, 255, 0.2)",
            backgroundImage: avatarUrl ? `url(${avatarUrl})` : undefined
          }}
        />
        <div className="flex-1">
          <textarea
            rows={3}
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            placeholder="Share a photo drop, a short film, or a new track."
            className="w-full resize-none rounded-3xl border border-white/15 bg-slate-950/30 px-4 py-3 text-white outline-none placeholder:text-slate-400"
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-[150px_1fr]">
            <select
              value={mediaType}
              onChange={(event) => setMediaType(event.target.value as "IMAGE" | "VIDEO" | "AUDIO")}
              className="rounded-2xl border border-white/15 bg-slate-950/30 px-4 py-3 text-white outline-none"
            >
              <option value="IMAGE">Image</option>
              <option value="VIDEO">Video</option>
              <option value="AUDIO">Audio</option>
            </select>
            <input
              value={mediaUrl}
              onChange={(event) => setMediaUrl(event.target.value)}
              placeholder="Paste a public media URL for now"
              className="rounded-2xl border border-white/15 bg-slate-950/30 px-4 py-3 text-white outline-none placeholder:text-slate-400"
            />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input
              value={hashtags}
              onChange={(event) => setHashtags(event.target.value)}
              placeholder="#music #travel"
              className="rounded-2xl border border-white/15 bg-slate-950/30 px-4 py-3 text-white outline-none placeholder:text-slate-400"
            />
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Location (optional)"
              className="rounded-2xl border border-white/15 bg-slate-950/30 px-4 py-3 text-white outline-none placeholder:text-slate-400"
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm">
              <ImagePlus className="h-4 w-4" />
              Image
            </button>
            <button type="button" className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm">
              <Video className="h-4 w-4" />
              Video
            </button>
            <button type="button" className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm">
              <Music4 className="h-4 w-4" />
              Audio
            </button>
            <button
              type="button"
              disabled={isPending || !mediaUrl.trim()}
              onClick={() => {
                setStatus("");
                startTransition(async () => {
                  const response = await fetch("/api/feed", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      caption: caption.trim() || undefined,
                      hashtags: hashtags
                        .split(/\s+/)
                        .map((item) => item.replace(/^#/, "").trim())
                        .filter(Boolean),
                      location: location.trim() || undefined,
                      media: [
                        {
                          type: mediaType,
                          url: mediaUrl.trim(),
                          storageKey: `manual/${Date.now()}`
                        }
                      ]
                    })
                  });

                  const data = await response.json().catch(() => null);
                  if (!response.ok) {
                    setStatus(data?.error?.formErrors?.[0] ?? data?.error ?? "Unable to publish post");
                    return;
                  }

                  setCaption("");
                  setMediaUrl("");
                  setHashtags("");
                  setLocation("");
                  setStatus("Post published.");
                  router.refresh();
                });
              }}
              className="ml-auto rounded-full bg-cyan px-5 py-2 text-sm font-medium text-ink disabled:opacity-50"
            >
              {isPending ? "Posting..." : "Post"}
            </button>
          </div>
          {status ? <p className="mt-3 text-sm text-cyan">{status}</p> : null}
        </div>
      </div>
    </section>
  );
}
