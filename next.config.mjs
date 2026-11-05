/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  experimental: {
    // BOM uploads go through a server action; the app accepts files up to 4 MB.
    serverActions: { bodySizeLimit: "5mb" },
  },
}

export default nextConfig
