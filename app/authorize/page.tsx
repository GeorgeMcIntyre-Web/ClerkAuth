'use client'

import { useUser } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { SITE_PERMISSIONS } from '@/lib/auth-config'

export default function AuthorizePage() {
  const { user, isLoaded } = useUser()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'authorized' | 'unauthorized' | 'error'>('loading')
  const [siteInfo, setSiteInfo] = useState<{ name: string; url: string } | null>(null)

  const requestedSite = searchParams.get('site')
  const redirectUrl = searchParams.get('redirect_url')

  useEffect(() => {
    if (isLoaded && requestedSite) {
      handleAuthorization()
    }
  }, [isLoaded, requestedSite, user]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAuthorization = async () => {
    if (!user) {
      // Redirect to sign-in with return URL
      const signInUrl = `/sign-in?redirect_url=${encodeURIComponent(window.location.href)}`
      window.location.href = signInUrl
      return
    }

    try {
      // Call authorization API
      const response = await fetch('/api/auth/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestedSite,
          redirectUrl
        })
      })

      const result = await response.json()

      if (result.authorized) {
        setSiteInfo({ name: requestedSite || 'Unknown Site', url: result.redirectUrl })
        setStatus('authorized')
        
        // Auto-redirect after 3 seconds
        setTimeout(() => {
          window.location.href = result.redirectUrl
        }, 3000)
      } else {
        setStatus('unauthorized')
      }
    } catch (error) {
      console.error('Authorization error:', error)
      setStatus('error')
    }
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">NitroAuth</h1>
          <p className="text-sm text-gray-600 mb-6">Centralized Authentication Hub</p>

          {status === 'loading' && (
            <div>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Checking authorization...</p>
            </div>
          )}

          {status === 'authorized' && siteInfo && (
            <div>
              <div className="text-green-600 text-4xl mb-4">✅</div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Access Granted!</h2>
              <p className="text-gray-600 mb-4">
                You have been authorized to access <strong>{siteInfo.name}</strong>
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Redirecting you now...
              </p>
              <a 
                href={siteInfo.url}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
              >
                Continue to Site
              </a>
            </div>
          )}

          {status === 'unauthorized' && (
            <div>
              <div className="text-red-600 text-4xl mb-4">🔒</div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h2>
              <p className="text-gray-600 mb-4">
                You don&apos;t have permission to access <strong>{requestedSite}</strong>
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Contact your administrator to request access.
              </p>
              <a 
                href="/dashboard"
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
              >
                Back to Dashboard
              </a>
            </div>
          )}

          {status === 'error' && (
            <div>
              <div className="text-red-600 text-4xl mb-4">⚠️</div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Authorization Error</h2>
              <p className="text-gray-600 mb-4">
                Something went wrong during authorization.
              </p>
              <button 
                onClick={() => window.location.reload()}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}