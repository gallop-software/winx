import { Section } from '@/components/section'
import { Heading } from '@/components/heading'
import { ProfileForm } from '@/components/account/profile-form'

export default function Profile() {
  return (
    <Section className="pt-7 pb-10">
      <div className="max-w-4xl mx-auto">
        <Heading as="h1" margin="mb-6">
          Your profile
        </Heading>
        <ProfileForm />
      </div>
    </Section>
  )
}
