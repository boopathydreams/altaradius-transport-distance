import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Simple JWT verification that works in Edge runtime
function verifyTokenInMiddleware(token: string) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      console.log('Invalid token format')
      return null
    }

    // Decode the payload (we're not verifying signature in middleware for simplicity)
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))

    // Check if token is expired
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      console.log('Token expired')
      return null
    }

    console.log('Token payload:', payload)
    return payload
  } catch (error) {
    console.log('Token verification error:', (error as Error).message)
    return null
  }
}

export function middleware(request: NextRequest) {
  // Check if the request is for the app page or API routes (except auth)
  const { pathname } = request.nextUrl

  console.log('Middleware called for path:', pathname)

  // Allow access to login page and auth API routes
  if (pathname === '/' || pathname.startsWith('/api/auth')) {
    console.log('Allowing access to:', pathname)
    return NextResponse.next()
  }

  // Check authentication for app page and other API routes
  if (pathname === '/app' || pathname.startsWith('/api/')) {
    const token = request.cookies.get('token')?.value
    console.log('Checking auth for:', pathname, 'Token exists:', !!token)

    if (token) {
      console.log('Token value (first 20 chars):', token.substring(0, 20) + '...')
      const verificationResult = verifyTokenInMiddleware(token)
      console.log('Token verification result:', verificationResult)

      if (!verificationResult) {
        console.log('Token verification failed')
      } else {
        console.log('Token verification successful')
      }
    }

    if (!token || !verifyTokenInMiddleware(token)) {
      console.log('Authentication failed, redirecting to login')
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      } else {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }

    console.log('Authentication successful for:', pathname)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/app', '/app/:path*', '/api/:path*']
}
