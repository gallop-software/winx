// Paths WordPress itself serves: uploads, admin, the REST API. They have no
// counterpart on this site, so links to them keep the WordPress host.
const wordPressOnly = /^\/wp-(content|includes|admin|json|login\.php)(\/|\?|#|$)/

export function replaceProductionUrl(link: string) {
  const wordPressUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL
  if (link && wordPressUrl) {
    if (
      link.startsWith(wordPressUrl) &&
      wordPressOnly.test(link.slice(wordPressUrl.length))
    ) {
      return link
    }
    link = link.replaceAll(
      wordPressUrl,
      process.env.NEXT_PUBLIC_PRODUCTION_URL!
    )
  }
  return link
}
