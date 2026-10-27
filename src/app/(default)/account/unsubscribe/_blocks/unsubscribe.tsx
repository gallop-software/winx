import { Section } from '@/components/section'
import { Heading } from '@/components/heading'
import { UnsubscribeConfirm } from '@/components/account/unsubscribe-confirm'

export default function Unsubscribe() {
  return (
    <Section className="pt-7 pb-10">
      <div className="max-w-4xl mx-auto">
        <Heading as="h1" margin="mb-6">
          Unsubscribe
        </Heading>
        <UnsubscribeConfirm />
      </div>
    </Section>
  )
}
