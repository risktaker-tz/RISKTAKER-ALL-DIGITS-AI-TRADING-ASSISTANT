import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { FollowButton } from "@/components/social/follow-button";
import { getCurrentUser } from "@/lib/auth";
import { getSuggestedUsers } from "@/lib/social";

export default async function DiscoverPage({
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
  const suggestedUsers = await getSuggestedUsers(viewer.id);

  return (
    <section className="grid gap-6 lg:grid-cols-2">
      {suggestedUsers.length === 0 ? (
        <article className="rounded-[32px] border border-dashed border-white/20 bg-white/6 p-8 text-center lg:col-span-2">
          <h1 className="text-3xl font-semibold">Discovery will grow with your network</h1>
          <p className="mt-3 text-slate-200">
            There are no follow suggestions yet. Invite users, finish signup flows, or seed a few test accounts.
          </p>
        </article>
      ) : null}
      {suggestedUsers.map((user) => (
        <article
          key={user.id}
          className="rounded-[32px] border border-white/15 bg-white/8 p-5 shadow-glass backdrop-blur"
        >
          <div className="flex items-center gap-4">
            <Image
              src={user.avatarUrl}
              alt={user.username}
              width={72}
              height={72}
              className="h-[72px] w-[72px] rounded-3xl object-cover"
            />
            <div>
              <h2 className="text-xl font-semibold">{user.username}</h2>
              <p className="mt-1 text-sm text-slate-300">{user.mutualFollowers} mutual follows</p>
            </div>
          </div>
          <p className="mt-4 text-slate-200">{user.bio}</p>
          <div className="mt-5 flex gap-3">
            <FollowButton targetUserId={user.id} initialIsFollowing={false} />
            <Link href={`/${locale}/profile/${user.username}`} className="rounded-full border border-white/15 px-5 py-3">
              View profile
            </Link>
          </div>
        </article>
      ))}
    </section>
  );
}
