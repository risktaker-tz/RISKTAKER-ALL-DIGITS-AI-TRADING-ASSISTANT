"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type FollowButtonProps = {
  targetUserId: string;
  initialIsFollowing: boolean;
  disabled?: boolean;
};

export function FollowButton({
  targetUserId,
  initialIsFollowing,
  disabled = false
}: FollowButtonProps) {
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const action = isFollowing ? "unfollow" : "follow";

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={disabled || isPending}
        onClick={() => {
          setError("");
          startTransition(async () => {
            const nextValue = !isFollowing;
            setIsFollowing(nextValue);

            const response = await fetch("/api/follows", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                targetUserId,
                action
              })
            });

            if (!response.ok) {
              setIsFollowing(!nextValue);
              const data = await response.json().catch(() => null);
              setError(data?.error ?? "Unable to update follow state");
              return;
            }

            router.refresh();
          });
        }}
        className={`rounded-full px-5 py-3 font-medium transition ${
          isFollowing ? "bg-white/10 text-white" : "bg-cyan text-ink"
        } disabled:opacity-50`}
      >
        {isPending ? "Updating..." : isFollowing ? "Following" : "Follow"}
      </button>
      {error ? <p className="text-sm text-coral">{error}</p> : null}
    </div>
  );
}
