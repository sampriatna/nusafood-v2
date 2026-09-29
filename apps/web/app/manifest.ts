import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NF3 Operasional",
    short_name: "NF3",
    description: "Tugas, SOP, dan koordinasi operasional NF3",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ea580c",
    orientation: "portrait",
  };
}
