import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TUCHATI",
    short_name: "TUCHATI",
    description: "A multimedia social app with private TUCHATI messaging after mutual follow.",
    start_url: "/en/feed",
    display: "standalone",
    background_color: "#07111F",
    theme_color: "#07111F",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml"
      }
    ]
  };
}
