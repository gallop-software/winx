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
  async redirects() {
    return []
  },
}

export default nextConfig
