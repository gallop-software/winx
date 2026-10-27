// Previews of single blocks, for building the site: not for search engines.
export const metadata = { robots: { index: false, follow: false } }

export default function DemoLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <>{children}</>
}
