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
  // Cloudflare Workers: `pg` (used by @prisma/adapter-pg) requires
  // pg-cloudflare under the "workerd" build condition, but file tracing only
  // sees the "default" entry (dist/empty.js). Include the whole dist so the
  // OpenNext bundler can resolve it. A no-op on Node/Vercel.
  outputFileTracingIncludes: {
    '**': ['./node_modules/pg-cloudflare/dist/**'],
  },
  async redirects() {
    return []
  },
}

export default nextConfig

// Cloudflare Workers (OpenNext) — enables getCloudflareContext()/bindings during
// `next dev`. No-op in production builds, so Vercel is unaffected.
import('@opennextjs/cloudflare').then((m) => m.initOpenNextCloudflareForDev())
