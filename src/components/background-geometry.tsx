import clsx from 'clsx'

export interface BackgroundGeometryProps {
  className?: string
}

export function BackgroundGeometry({ className }: BackgroundGeometryProps) {
  return (
    <div
      className={clsx(
        'absolute left-1/2 -translate-x-1/2 opacity-20',
        className
      )}
    >
      {/* Concentric dotted circles */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border border-dashed border-contrast" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full border border-dashed border-contrast" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full border border-dotted border-contrast" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-md h-112 rounded-full border border-dashed border-contrast" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-152 h-152 rounded-full border border-dotted border-contrast" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-200 h-200 rounded-full border border-dashed border-contrast" />

      {/* Crosshair lines */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-200 border-l border-dashed border-contrast" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-200 h-px border-t border-dashed border-contrast" />

      {/* Diagonal crosshairs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-200 h-px border-t border-dotted border-contrast rotate-45" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-200 h-px border-t border-dotted border-contrast -rotate-45" />
    </div>
  )
}
