'use client'

import { useState, useEffect } from 'react'
import { useInView } from 'react-intersection-observer'

const colors = [
  'bg-pink-400',
  'bg-yellow-400',
  'bg-purple-400',
  'bg-teal-400',
  'bg-orange-400',
  'bg-rose-400',
  'bg-sky-400',
  'bg-lime-400',
  'bg-fuchsia-400',
  'bg-amber-400',
]

const shapes = [
  { width: 'w-2', height: 'h-1', rounded: 'rounded-none' }, // Horizontal ribbon
  { width: 'w-3', height: 'h-1', rounded: 'rounded-none' }, // Wide ribbon
  { width: 'w-4', height: 'h-1.5', rounded: 'rounded-none' }, // Long ribbon
  { width: 'w-1', height: 'h-2', rounded: 'rounded-none' }, // Vertical strip
  { width: 'w-1', height: 'h-3', rounded: 'rounded-none' }, // Tall strip
  { width: 'w-1.5', height: 'h-3', rounded: 'rounded-none' }, // Medium strip
]

const rotations = [
  'rotate-0',
  'rotate-12',
  '-rotate-12',
  'rotate-45',
  '-rotate-45',
]

interface ConfettiPiece {
  id: number
  left: number
  top: number
  color: string
  shape: (typeof shapes)[0]
  rotation: string
  delay: number
  duration: number
}

function generateConfetti(count: number): ConfettiPiece[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 40, // Start in top 40% of container
    color: colors[Math.floor(Math.random() * colors.length)] ?? 'bg-pink-400',
    shape: shapes[Math.floor(Math.random() * shapes.length)] ?? shapes[0]!,
    rotation:
      rotations[Math.floor(Math.random() * rotations.length)] ?? 'rotate-0',
    delay: 0, // No delay - all burst at once
    duration: 4 + Math.random() * 4, // 4-8 seconds to fall
  }))
}

export default function BackgroundConfetti() {
  const [hasPlayed, setHasPlayed] = useState(false)
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([])

  const { ref, inView } = useInView({
    threshold: 0.3, // 30% visible triggers animation
    triggerOnce: true, // Only trigger once
  })

  // Generate confetti only on client side to avoid hydration mismatch
  useEffect(() => {
    setConfetti(generateConfetti(80))
  }, [])

  useEffect(() => {
    if (inView && !hasPlayed) {
      setHasPlayed(true)
    }
  }, [inView, hasPlayed])

  return (
    <div
      ref={ref}
      className="absolute inset-0 z-40 pointer-events-none overflow-hidden"
    >
      {confetti.map((piece) => (
        <div
          key={piece.id}
          className={`absolute ${piece.shape.width} ${piece.shape.height} ${piece.color} ${piece.shape.rounded} ${piece.rotation} ${
            hasPlayed ? 'animate-confetti-fall' : 'opacity-0'
          }`}
          style={{
            left: `${piece.left}%`,
            top: `${piece.top}%`,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
          }}
        />
      ))}
    </div>
  )
}
