import { Section } from '@/components/section'
import { Heading } from '@/components/heading'
import { ConfirmSubscription } from '@/components/account/confirm-subscription'

export default function Confirm() {
  return (
    <Section className="pt-7 pb-10">
      <div className="max-w-4xl mx-auto">
        <Heading as="h1" margin="mb-6">
          Confirm your subscription
        </Heading>
        <ConfirmSubscription />
      </div>
    </Section>
  )
}
