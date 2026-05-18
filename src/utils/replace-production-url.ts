export function replaceProductionUrl(link: string) {
  if (link) {
    link = link.replaceAll(
      'https://wp.douglasnewby.com',
      process.env.NEXT_PUBLIC_PRODUCTION_URL!
    )
  }
  return link
}
