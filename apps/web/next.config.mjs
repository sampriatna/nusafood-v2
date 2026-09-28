/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@nusafood/types",
    "@nusafood/api-client",
    "@nusafood/database",
  ],
  // Halaman HTML mentah (mis. dokumen surat A4) & browser lama tetap meminta /favicon.ico.
  async rewrites() {
    return [{ source: "/favicon.ico", destination: "/icon.svg" }];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "drive.google.com" },
      { protocol: "https", hostname: "**.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
