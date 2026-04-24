import { Prisma, type MediaType } from "@prisma/client";

import { db } from "@/lib/db";
import { hasMutualFollow } from "@/lib/tuchati";
import type { FeedPost } from "@/types";

type FeedPostWithRelations = Prisma.PostGetPayload<{
  include: {
    author: true;
    media: true;
    _count: {
      select: {
        likes: true;
        comments: true;
      };
    };
  };
}>;

function mapMediaType(type: MediaType): "image" | "video" | "audio" {
  switch (type) {
    case "VIDEO":
      return "video";
    case "AUDIO":
      return "audio";
    case "IMAGE":
    default:
      return "image";
  }
}

export function mapPostToFeedPost(post: FeedPostWithRelations): FeedPost {
  return {
    id: post.id,
    author: {
      id: post.author.id,
      username: post.author.username,
      avatarUrl:
        post.author.avatarUrl ||
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=300&auto=format&fit=crop",
      verified: post.author.isVerified
    },
    caption: post.caption || "",
    createdAt: post.createdAt.toISOString(),
    media: post.media.map((item) => ({
      id: item.id,
      type: mapMediaType(item.type),
      url: item.url,
      previewUrl: item.previewUrl || undefined
    })),
    stats: {
      likes: post._count.likes,
      comments: post._count.comments,
      shares: 0,
      saves: 0
    }
  };
}

export async function getFeedPosts(viewerId: string) {
  const posts = await db.post.findMany({
    where: {
      OR: [
        { authorId: viewerId },
        {
          author: {
            followers: {
              some: {
                followerId: viewerId
              }
            }
          }
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
    take: 30
  });

  return posts.map(mapPostToFeedPost);
}

export async function getSuggestedUsers(viewerId: string) {
  const followingRows = await db.follow.findMany({
    where: { followerId: viewerId },
    select: { followingId: true }
  });

  const followingIds = followingRows.map((row) => row.followingId);

  const users = await db.user.findMany({
    where: {
      id: {
        notIn: [viewerId, ...followingIds]
      }
    },
    select: {
      id: true,
      username: true,
      bio: true,
      avatarUrl: true,
      _count: {
        select: {
          followers: true
        }
      }
    },
    take: 12,
    orderBy: [
      {
        followers: {
          _count: "desc"
        }
      },
      {
        createdAt: "desc"
      }
    ]
  });

  const candidateIds = users.map((user) => user.id);
  const mutualRows =
    followingIds.length > 0 && candidateIds.length > 0
      ? await db.follow.findMany({
          where: {
            followerId: {
              in: followingIds
            },
            followingId: {
              in: candidateIds
            }
          },
          select: {
            followingId: true
          }
        })
      : [];

  const mutualCounts = mutualRows.reduce<Record<string, number>>((accumulator, row) => {
    accumulator[row.followingId] = (accumulator[row.followingId] ?? 0) + 1;
    return accumulator;
  }, {});

  return users.map((user) => ({
    id: user.id,
    username: user.username,
    bio: user.bio || "New on TUCHATI",
    avatarUrl:
      user.avatarUrl ||
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=300&auto=format&fit=crop",
    mutualFollowers: mutualCounts[user.id] ?? 0
  }));
}

export async function getProfileData(viewerId: string | null, username: string) {
  const user = await db.user.findUnique({
    where: { username },
    include: {
      posts: {
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
        take: 12
      },
      _count: {
        select: {
          followers: true,
          following: true,
          posts: true
        }
      }
    }
  });

  if (!user) {
    return null;
  }

  const isOwnProfile = viewerId === user.id;

  const [isFollowing, followsYou, tuchatiUnlocked] = viewerId
    ? await Promise.all([
        db.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: viewerId,
              followingId: user.id
            }
          }
        }),
        db.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: user.id,
              followingId: viewerId
            }
          }
        }),
        isOwnProfile ? Promise.resolve(true) : hasMutualFollow(viewerId, user.id)
      ])
    : [null, null, false];

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    bio: user.bio,
    avatarUrl:
      user.avatarUrl ||
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=300&auto=format&fit=crop",
    isVerified: user.isVerified,
    isOwnProfile,
    isFollowing: Boolean(isFollowing),
    followsYou: Boolean(followsYou),
    tuchatiUnlocked,
    counts: user._count,
    posts: user.posts.map(mapPostToFeedPost)
  };
}
