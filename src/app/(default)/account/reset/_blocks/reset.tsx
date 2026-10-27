import { Section } from '@/components/section'
import { Heading } from '@/components/heading'
import { ResetPasswordForm } from '@/components/account/reset-password-form'

export default function Reset() {
  return (
    <Section className="pt-7 pb-10">
      <div className="max-w-4xl mx-auto">
        <Heading as="h1" margin="mb-6">
          Choose a new password
        </Heading>
        <ResetPasswordForm />
      </div>
    </Section>
  )
}
