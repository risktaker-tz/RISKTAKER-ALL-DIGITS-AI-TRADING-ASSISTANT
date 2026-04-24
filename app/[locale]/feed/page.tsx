import { redirect } from "next/navigation";

import { EmptyFeed } from "@/components/feed/empty-feed";
import { FeedCard } from "@/components/feed/feed-card";
import { FeedComposer } from "@/components/feed/feed-composer";
import { getCurrentUser } from "@/lib/auth";
import { getFeedPosts, getSuggestedUsers } from "@/lib/social";
import Image from "next/image";
import Link from "next/link";

export default async function FeedPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect(`/${locale}/signup`);
  }

  const viewer = currentUser;

  const [feedPosts, suggestedUsers] = await Promise.all([
    getFeedPosts(viewer.id),
    getSuggestedUsers(viewer.id)
  ]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <FeedComposer avatarUrl={viewer.avatarUrl} />
        {feedPosts.length === 0 ? <EmptyFeed locale={locale} /> : null}
        {feedPosts.map((post) => (
          <FeedCard key={post.id} post={post} />
        ))}
      </div>

      <aside className="space-y-6">
        <section className="rounded-[32px] border border-white/15 bg-white/8 p-5 shadow-glass backdrop-blur">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan/80">Status</p>
          <h2 className="mt-3 text-xl font-semibold">24h updates</h2>
          <p className="mt-3 text-sm text-slate-200">
            Text, images, short videos, and audio snippets can expire automatically after one day.
          </p>
        </section>

        <section className="rounded-[32px] border border-white/15 bg-white/8 p-5 shadow-glass backdrop-blur">
          <p className="text-sm uppercase tracking-[0.3em] text-coral/80">Suggested follows</p>
          <div className="mt-4 space-y-4">
            {suggestedUsers.length === 0 ? (
              <p className="text-sm text-slate-200">No suggestions yet. As more users join, they will appear here.</p>
            ) : (
              suggestedUsers.slice(0, 4).map((user) => (
                <Link
                  key={user.id}
                  href={`/${locale}/profile/${user.username}`}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3"
                >
                  <Image
                    src={user.avatarUrl}
                    alt={user.username}
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-2xl object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{user.username}</p>
                    <p className="truncate text-sm text-slate-300">{user.bio}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      </aside>
    </div>
  );
}
