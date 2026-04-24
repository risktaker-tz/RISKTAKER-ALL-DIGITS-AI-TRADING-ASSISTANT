import Image from "next/image";
import { Bookmark, Heart, MessageCircle, Repeat2, ShieldCheck } from "lucide-react";

import type { FeedPost } from "@/types";
import { formatCount, formatRelative } from "@/lib/utils";

function MediaRenderer({ post }: { post: FeedPost }) {
  const item = post.media[0];

  if (item.type === "image") {
    return (
      <div className="relative mt-4 h-[420px] overflow-hidden rounded-[28px]">
        <Image src={item.url} alt={post.caption} fill className="object-cover" />
      </div>
    );
  }

  if (item.type === "video") {
    return (
      <video
        controls
        playsInline
        className="mt-4 max-h-[420px] w-full rounded-[28px] bg-black object-cover"
        src={item.url}
      />
    );
  }

  return (
    <div className="mt-4 rounded-[28px] border border-white/10 bg-gradient-to-br from-cyan/20 to-coral/20 p-5">
      <div className="mb-4 h-40 rounded-[24px] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.25),transparent_55%)]" />
      <audio controls className="w-full" src={item.url} />
    </div>
  );
}

export function FeedCard({ post }: { post: FeedPost }) {
  return (
    <article className="rounded-[32px] border border-white/15 bg-white/8 p-5 shadow-glass backdrop-blur">
      <div className="flex items-center gap-3">
        <Image
          src={post.author.avatarUrl}
          alt={post.author.username}
          width={48}
          height={48}
          className="h-12 w-12 rounded-2xl object-cover"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium">{post.author.username}</p>
            {post.author.verified ? <ShieldCheck className="h-4 w-4 text-cyan" /> : null}
          </div>
          <p className="text-sm text-slate-300">{formatRelative(post.createdAt)}</p>
        </div>
      </div>

      <p className="mt-4 text-slate-100">{post.caption}</p>
      <MediaRenderer post={post} />

      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-200">
        <span className="inline-flex items-center gap-2">
          <Heart className="h-4 w-4" />
          {formatCount(post.stats.likes)}
        </span>
        <span className="inline-flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          {formatCount(post.stats.comments)}
        </span>
        <span className="inline-flex items-center gap-2">
          <Repeat2 className="h-4 w-4" />
          {formatCount(post.stats.shares)}
        </span>
        <span className="inline-flex items-center gap-2">
          <Bookmark className="h-4 w-4" />
          {formatCount(post.stats.saves)}
        </span>
      </div>
    </article>
  );
}
