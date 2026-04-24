import type { FeedPost, SuggestedUser } from "@/types";

export const sampleFeed: FeedPost[] = [
  {
    id: "post-1",
    author: {
      id: "user-1",
      username: "amina.wav",
      avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=300&auto=format&fit=crop",
      verified: true
    },
    caption: "Late-night studio session. Dropping the teaser tomorrow.",
    createdAt: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
    media: [
      {
        id: "media-1",
        type: "audio",
        url: "https://cdn.pixabay.com/download/audio/2022/03/15/audio_4abdfb4f04.mp3?filename=lofi-study-112191.mp3",
        previewUrl: ""
      }
    ],
    stats: {
      likes: 4200,
      comments: 183,
      shares: 77,
      saves: 932
    }
  },
  {
    id: "post-2",
    author: {
      id: "user-2",
      username: "leo.frames",
      avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=300&auto=format&fit=crop",
      verified: false
    },
    caption: "Street launch film for the new collection.",
    createdAt: new Date(Date.now() - 1000 * 60 * 52).toISOString(),
    media: [
      {
        id: "media-2",
        type: "video",
        url: "https://www.w3schools.com/html/mov_bbb.mp4",
        previewUrl: ""
      }
    ],
    stats: {
      likes: 2870,
      comments: 92,
      shares: 114,
      saves: 515
    }
  },
  {
    id: "post-3",
    author: {
      id: "user-3",
      username: "mila.canvas",
      avatarUrl: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?q=80&w=300&auto=format&fit=crop",
      verified: true
    },
    caption: "New cover art and teaser stills.",
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    media: [
      {
        id: "media-3",
        type: "image",
        url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=1200&auto=format&fit=crop",
        previewUrl: ""
      }
    ],
    stats: {
      likes: 12800,
      comments: 502,
      shares: 210,
      saves: 2700
    }
  }
];

export const suggestedUsers: SuggestedUser[] = [
  {
    id: "u1",
    username: "tune.safari",
    bio: "Afro-fusion artist and live performance clips.",
    avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=300&auto=format&fit=crop",
    mutualFollowers: 12
  },
  {
    id: "u2",
    username: "nairobi.cut",
    bio: "Short-form cinema, behind-the-scenes, and edits.",
    avatarUrl: "https://images.unsplash.com/photo-1504593811423-6dd665756598?q=80&w=300&auto=format&fit=crop",
    mutualFollowers: 5
  }
];
