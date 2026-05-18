import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

export async function POST(req: NextRequest) {
  const { path } = await req.json()

  if (!path) {
    return NextResponse.json(
      { revalidated: false, message: 'No path provided' },
      { status: 400 }
    )
  }

  try {
    revalidatePath(path)
    return NextResponse.json({ revalidated: true, now: Date.now() })
  } catch (error) {
    return NextResponse.json(
      { revalidated: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}
