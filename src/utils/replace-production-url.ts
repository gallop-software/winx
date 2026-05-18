export function replaceProductionUrl(link: string) {
  if (link && process.env.NEXT_PUBLIC_WORDPRESS_URL) {
    link = link.replaceAll(
      process.env.NEXT_PUBLIC_WORDPRESS_URL,
      process.env.NEXT_PUBLIC_PRODUCTION_URL!
    )
  }
  return link
}
