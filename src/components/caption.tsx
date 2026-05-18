import clsx from 'clsx'

interface CaptionProps {
  className?: string
  children?: React.ReactNode
  html?: string
}

export function Caption({ className, children, html }: CaptionProps) {
  const classes = clsx(
    'text-xs text-caption text-left font-normal italic mt-2',
    className
  )

  if (html) {
    return (
      <figcaption
        className={classes}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    )
  }

  return <figcaption className={classes}>{children}</figcaption>
}
