import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const status = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: process.env.DATABASE_URL ? 'configured' : 'not_configured',
      environment: process.env.NODE_ENV || 'development'
    }

    return NextResponse.json(status, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error', 
        timestamp: new Date().toISOString(),
        error: 'Health check failed' 
      }, 
      { status: 500 }
    )
  }
}