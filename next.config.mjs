/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  // Configure `pageExtensions` to include TSX files
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  // Optionally, add any other Next.js config below
  // Cloudflare Workers: keep Prisma out of the Next.js bundle so the OpenNext
  // bundler resolves its "workerd" build, which is the one that runs on D1.
  serverExternalPackages: ['@prisma/client', '.prisma/client'],
  async redirects() {
    // The addresses WordPress serves a site at, for a site that moved here
    // from WordPress: still in search engines and in links elsewhere.
    // Archives were paged as /page/N/ (the home page's own /page/N/ is answered by the catch-all
    // route, since a destination of /?page=N does not compile here); a
    // post's address could carry the day; feeds came in several
    // flavours. What only WordPress itself can answer (uploads, the admin,
    // the API) goes to it, with a bare rule for each, since an empty :path*
    // is left in the address as it is. ?s=, ?p=N and ?page_id=N on the home
    // page are answered by the home page itself: ?p= and ?page_id= need the
    // content index, and a query rule here would be compiled for every
    // request to / by OpenNext's router and throw when the key is absent.
    // Without NEXT_PUBLIC_WORDPRESS_URL there is nowhere to send them, and
    // those rules are left out.
    const wordpress = (process.env.NEXT_PUBLIC_WORDPRESS_URL ?? '').replace(
      /\/+$/,
      ''
    )
    const legacy = [
      {
        source: '/:kind(category|tag|author)/:slug/page/:n(\\d+)/',
        destination: '/:kind/:slug/?page=:n',
      },
      {
        source: '/:year(\\d{4})/page/:n(\\d+)/',
        destination: '/:year/?page=:n',
      },
      {
        source: '/:year(\\d{4})/:month(\\d{2})/page/:n(\\d+)/',
        destination: '/:year/:month/?page=:n',
      },
      {
        source: '/:year(\\d{4})/:month(\\d{2})/:day(\\d{2})/:slug/',
        destination: '/:year/:month/:slug/',
      },
      {
        source: '/:year(\\d{4})/:month(\\d{2})/:day(\\d{2})/',
        destination: '/:year/:month/',
      },
      { source: '/comments/feed/', destination: '/feed/' },
      { source: '/feed/:type(rss|rss2|atom|rdf)/', destination: '/feed/' },
      {
        source: '/:kind(category|tag|author)/:slug/feed/',
        destination: '/feed/',
      },
      ...(wordpress
        ? [
            ...['wp-content', 'wp-includes', 'wp-admin', 'wp-json'].flatMap(
              (folder) => [
                {
                  source: `/${folder}/`,
                  destination: `${wordpress}/${folder}/`,
                },
                {
                  source: `/${folder}/:path+`,
                  destination: `${wordpress}/${folder}/:path+`,
                },
              ]
            ),
            {
              source: '/wp-login.php',
              destination: `${wordpress}/wp-login.php`,
            },
            { source: '/xmlrpc.php', destination: `${wordpress}/xmlrpc.php` },
          ]
        : []),
    ].map((rule) => ({ ...rule, permanent: true }))

    return legacy
  },
}

export default nextConfig

// Cloudflare Workers (OpenNext) — enables getCloudflareContext()/bindings during
// `next dev`. No-op in production builds.
import('@opennextjs/cloudflare').then((m) => m.initOpenNextCloudflareForDev())
