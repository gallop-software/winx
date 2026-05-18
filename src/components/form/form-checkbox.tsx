import { Paragraph } from '@/components/paragraph'

// ============================================================================
// FormCheckboxGroup Component
// ============================================================================

export type FormCheckboxProps = {
  heading?: string
  name: string
  options: string[]
  defaultSelected?: string[]
  label?: string
}

export function FormCheckboxGroup({
  heading,
  name,
  options,
  defaultSelected = [],
  label,
}: FormCheckboxProps) {
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
              type="checkbox"
              name={`${name}[]`}
              value={option}
              defaultChecked={defaultSelected.includes(option)}
              data-label={label}
              className="h-5 w-5 appearance-none rounded-md border border-accent2 checked:bg-accent2 checked:border-accent2 focus:outline-none focus:ring-2 focus:ring-accent2 cursor-pointer transition-colors"
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
