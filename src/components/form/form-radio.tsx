import { Paragraph } from '@/components/paragraph'

// ============================================================================
// FormRadioGroup Component
// ============================================================================

export type FormRadioProps = {
  heading?: string
  name: string
  options: string[]
  required?: boolean
  defaultValue?: string
  label?: string
}

export function FormRadioGroup({
  heading,
  name,
  options,
  required = false,
  defaultValue,
  label,
}: FormRadioProps) {
  return (
    <fieldset className="space-y-2">
      {heading && (
        <Paragraph
          color="text-contrast"
          margin="mb-3"
        >
          {heading}
        </Paragraph>
      )}
      <div className="flex flex-col gap-3">
        {options.map((option) => (
          <label
            key={option}
            className="flex items-center gap-2 cursor-pointer select-none"
          >
            <input
              type="radio"
              name={name}
              value={option}
              defaultChecked={defaultValue === option}
              required={required}
              data-label={label}
              className="h-5 w-5 shrink-0 appearance-none rounded-full border border-accent2 checked:bg-accent2 checked:border-accent2 focus:outline-none focus:ring-2 focus:ring-accent2 cursor-pointer transition-colors"
            />
            <span className="font-body font-medium text-contrast">
              {option}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
