import { Heading } from '@/components/heading'
import { Button } from '@/components/button'

export default function NotFound() {
  return (
    <div className="px-6 lg:px-8 mx-auto max-w-3xl text-center mb-40 pt-24">
      <Heading as="h1">Page Not Found</Heading>
      <Button
        variant="outline"
        href="/"
        native
      >
        Return Home
      </Button>
    </div>
  )
}
