/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@nusafood/types",
    "@nusafood/api-client",
    "@nusafood/database",
  ],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "drive.google.com" },
      { protocol: "https", hostname: "**.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
