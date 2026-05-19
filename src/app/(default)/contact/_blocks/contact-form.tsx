import { Section } from '@/components/section'
import { Heading } from '@/components/heading'
import { Paragraph } from '@/components/paragraph'
import {
  Form,
  FormFirstName,
  FormLastName,
  FormInput,
  FormTextArea,
  FormButton,
} from '@/components/form'

export default function ContactForm() {
  return (
    <Section className="bg-body pb-10">
      <div className="max-w-3xl">
        <Heading as="h2">For inquiries, feedback, and correspondence.</Heading>
        <Paragraph margin="mb-4">
          Use the form below to get in touch. Every message is read personally,
          and we aim to respond within a few business days.
        </Paragraph>
        <Form
          gap="gap-3"
          honeypot
        >
          <FormInput
            name="emailSubject"
            defaultValue="Contact Form"
            label="Email Subject"
            hidden
          />
          <div className="flex flex-col md:flex-row gap-3">
            <FormFirstName
              name="firstName"
              placeholder="First name"
              label="First name"
            />
            <FormLastName
              name="lastName"
              placeholder="Last name"
              label="Last name"
            />
          </div>
          <FormInput
            name="email"
            type="email"
            placeholder="Your email address"
            label="Email"
            required
          />
          <FormTextArea
            name="message"
            placeholder="Message*"
            rows={6}
            label="Message"
            required
          />
          <FormButton
            name="submit"
            label="Send Message"
            className="!text-xs !px-4 !py-2"
          />
        </Form>
      </div>
    </Section>
  )
}
