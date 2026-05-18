/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  // Configure `pageExtensions` to include TSX files
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  // Enable experimental global not-found page
  experimental: {
    globalNotFound: true,
  },
  // Optionally, add any other Next.js config below
  images: {
    // Image optimization for local images
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  async redirects() {
    return []
  },
}

export default nextConfig
