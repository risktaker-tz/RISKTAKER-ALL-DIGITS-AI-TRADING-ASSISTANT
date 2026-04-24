import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { TuchatiLock } from "@/components/chat/tuchati-lock";
import { ProfilePosts } from "@/components/profile/profile-posts";
import { FollowButton } from "@/components/social/follow-button";
import { getCurrentUser } from "@/lib/auth";
import { getProfileData } from "@/lib/social";
import { formatCount } from "@/lib/utils";

export default async function ProfilePage({
  params
}: {
  params: Promise<{ locale: string; username: string }>;
}) {
  const { locale, username } = await params;
  const currentUser = await getCurrentUser();

  if (username === "you") {
    if (!currentUser) {
      redirect(`/${locale}/signup`);
    }
    redirect(`/${locale}/profile/${currentUser.username}`);
  }

  const profile = await getProfileData(currentUser?.id ?? null, username);

  if (!profile) {
    notFound();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <section className="rounded-[32px] border border-white/15 bg-white/8 p-6 shadow-glass backdrop-blur">
          <div className="flex flex-wrap items-center gap-5">
            <Image
              src={profile.avatarUrl}
              alt={profile.username}
              width={96}
              height={96}
              className="h-24 w-24 rounded-[28px] object-cover"
            />
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl font-semibold">{profile.displayName || profile.username}</h1>
              <p className="mt-1 text-sm text-cyan/90">@{profile.username}</p>
              <p className="mt-3 max-w-xl text-slate-200">
                {profile.bio || "This creator has not written a bio yet."}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-6 text-sm text-slate-100">
            <span>{formatCount(profile.counts.posts)} posts</span>
            <span>{formatCount(profile.counts.followers)} followers</span>
            <span>{formatCount(profile.counts.following)} following</span>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {profile.isOwnProfile ? (
              <Link href={`/${locale}/feed`} className="rounded-full bg-cyan px-5 py-3 font-medium text-ink">
                Create post
              </Link>
            ) : (
              <FollowButton targetUserId={profile.id} initialIsFollowing={profile.isFollowing} disabled={!currentUser} />
            )}
            {profile.tuchatiUnlocked && !profile.isOwnProfile ? (
              <Link
                href={`/${locale}/messages/demo-chat`}
                className="rounded-full bg-coral px-5 py-3 font-medium text-white"
              >
                Open TUCHATI
              </Link>
            ) : null}
          </div>
        </section>

        <ProfilePosts posts={profile.posts} />
      </div>

      <div className="space-y-6">
        <TuchatiLock enabled={profile.tuchatiUnlocked} />
        <section className="rounded-[32px] border border-white/15 bg-white/8 p-5 shadow-glass backdrop-blur">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan/80">Connection state</p>
          <p className="mt-3 text-slate-200">
            {profile.isOwnProfile
              ? "This is your own profile."
              : profile.isFollowing
                ? "You already follow this account."
                : "Follow this account to move toward TUCHATI unlock."}
          </p>
          {!profile.isOwnProfile ? (
            <p className="mt-3 text-sm text-slate-300">
              {profile.followsYou
                ? "They already follow you back."
                : "They do not follow you back yet."}
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
