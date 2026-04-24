import { FeedCard } from "@/components/feed/feed-card";
import type { FeedPost } from "@/types";

export function ProfilePosts({ posts }: { posts: FeedPost[] }) {
  if (posts.length === 0) {
    return (
      <section className="rounded-[32px] border border-dashed border-white/20 bg-white/6 p-8 text-center">
        <h2 className="text-2xl font-semibold">No posts yet</h2>
        <p className="mt-3 text-slate-200">
          This profile has not published any multimedia content yet.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <FeedCard key={post.id} post={post} />
      ))}
    </div>
  );
}
