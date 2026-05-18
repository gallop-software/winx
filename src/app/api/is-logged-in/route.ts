import { NextResponse } from 'next/server'

const WP_JSON = process.env.WORDPRESS_API_URL || ''

export async function POST(req: Request) {
  if (!WP_JSON) {
    return NextResponse.json(
      { error: 'WORDPRESS_API_URL not configured' },
      { status: 500 }
    )
  }

  const { username, password } = await req.json()

  try {
    const res = await fetch(`${WP_JSON}/gallop/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    const json = await res.json()

    if (!res.ok) {
      return NextResponse.json(
        { error: json?.code ?? 'login_failed', message: json?.message },
        { status: res.status }
      )
    }

    return NextResponse.json({ user: json.user })
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}
