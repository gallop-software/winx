import type { ReactNode } from 'react'
import { Accent } from '@/components/accent'

export interface BackgroundGeometry2Props {
  children?: ReactNode
}

export function BackgroundGeometry2({ children }: BackgroundGeometry2Props) {
  return (
    <>
      <div className="absolute inset-0 opacity-30 sm:opacity-50 bg-repeat bg-top-left bg-size-[700px] bg-[url('https://speedwell-cdn.gallop.software/images/geometric-md.jpg')]"></div>
      <div className="absolute inset-0 bg-linear-to-r from-body to-transparent bg-[linear-gradient(to_right,var(--color-body)_0%,rgb(255_255_255/0%)_100%),linear-gradient(to_bottom,var(--color-body)_0%,rgb(255_255_255/0%)_100%),linear-gradient(to_top,var(--color-body)_0%,rgb(255_255_255/0%)_70%)]"></div>
      {children && (
        <Accent
          className="absolute left-[130%] sm:left-[120%] md:left-[110%] xl:left-full top-30 transform rotate-90 origin-top-left z-0 whitespace-nowrap opacity-5 sm:opacity-10"
          color="text-accent"
          fontSize="text-[10rem] lg:text-[12rem]"
        >
          {children}
        </Accent>
      )}
    </>
  )
}
