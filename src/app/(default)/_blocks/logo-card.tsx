import { Section } from '@/components/section'
import { Image } from '@/components/image'

export default function LogoCard() {
  return (
    <Section className="bg-body2 py-7">
      <div className="bg-accent rounded-sm p-12 flex items-center justify-center max-w-4xl mx-auto">
        <Image
          src="/founder_notes_transparent_logo.png"
          alt="Founder Notes"
          size="medium"
          rounded="rounded-none"
          className="w-80 md:w-96 h-auto"
        />
      </div>
    </Section>
  )
}
