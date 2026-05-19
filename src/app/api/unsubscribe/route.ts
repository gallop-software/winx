import { prisma } from '@/utils/prisma'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}

type Field = { value: string; label?: string | null } | string | undefined

function unwrap(field: Field): string {
  if (typeof field === 'string') return field
  return field?.value ?? ''
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const email = unwrap(body.email).trim().toLowerCase()

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ message: 'Invalid email format.' }, { status: 400 })
  }

  try {
    await prisma.subscriber.upsert({
      where: { email },
      create: { email, subscribed: false },
      update: { subscribed: false },
    })

    return NextResponse.json({ message: 'You have been unsubscribed.' })
  } catch (error) {
    console.error('Error unsubscribing email:', error)
    return NextResponse.json({ message: 'Failed to unsubscribe' }, { status: 500 })
  }
}
