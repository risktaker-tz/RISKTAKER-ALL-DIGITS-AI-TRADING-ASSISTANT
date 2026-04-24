import { db } from "@/lib/db";

export async function hasMutualFollow(userId: string, otherUserId: string) {
  const [first, second] = await Promise.all([
    db.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: otherUserId
        }
      }
    }),
    db.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: otherUserId,
          followingId: userId
        }
      }
    })
  ]);

  return Boolean(first && second);
}
