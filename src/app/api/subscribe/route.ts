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
  const body = await req.json()
  const firstName = unwrap(body.firstName).trim()
  const lastName = unwrap(body.lastName).trim()
  const email = unwrap(body.email).trim()

  if (!firstName || !lastName || !email) {
    return Response.json({ message: 'Please fill in all fields.' }, { status: 400 })
  }

  if (!isValidEmail(email)) {
    return Response.json({ message: 'Invalid email format.' }, { status: 400 })
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_ADMIN_URL}/api/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, email }),
    })

    const result = await response.json()

    if (!response.ok) {
      return Response.json(
        { message: result.message || 'Failed to subscribe email' },
        { status: response.status }
      )
    }

    return Response.json({
      message: result.message || 'You have been subscribed successfully.',
    })
  } catch (error) {
    console.error(error)
    return Response.json(
      { message: 'Failed to subscribe email' },
      { status: 500 }
    )
  }
}
