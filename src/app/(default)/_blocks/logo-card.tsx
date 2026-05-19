import { Section } from '@/components/section'
import { Image } from '@/components/image'

export default function LogoCard() {
  return (
    <Section className="bg-body2 py-7">
      <div className="bg-accent rounded-sm px-12 py-[40px] flex items-center justify-center max-w-4xl mx-auto">
        <Image
          src="/logo.png"
          alt="Founder Notes"
          size="medium"
          rounded="rounded-none"
          className="w-76 md:w-88 h-auto"
        />
      </div>
    </Section>
  )
}
