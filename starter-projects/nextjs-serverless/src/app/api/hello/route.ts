import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'Hello from Next.js API route on Lambda!',
    timestamp: new Date().toISOString()
  });
}
