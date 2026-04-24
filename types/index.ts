export type FeedMedia = {
  id: string;
  type: "image" | "video" | "audio";
  url: string;
  previewUrl?: string;
};

export type FeedPost = {
  id: string;
  author: {
    id: string;
    username: string;
    avatarUrl: string;
    verified: boolean;
  };
  caption: string;
  createdAt: string;
  media: FeedMedia[];
  stats: {
    likes: number;
    comments: number;
    shares: number;
    saves: number;
  };
};

export type SuggestedUser = {
  id: string;
  username: string;
  bio: string;
  avatarUrl: string;
  mutualFollowers: number;
};
