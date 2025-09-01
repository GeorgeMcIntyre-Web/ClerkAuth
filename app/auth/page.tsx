'use client'

import { useUser } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function UniversalAuthPage() {
  const { user, isLoaded } = useUser()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'authorized' | 'unauthorized' | 'error'>('loading')
  const [siteInfo, setSiteInfo] = useState<{ name: string; url: string } | null>(null)

  const requestedSite = searchParams.get('site')
  const redirectUrl = searchParams.get('redirect_url')

  useEffect(() => {
    if (isLoaded) {
      handleUniversalAuth()
    }
  }, [isLoaded, requestedSite, user]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleUniversalAuth = async () => {
    if (!user) {
      // Redirect to sign-in with return URL
      const signInUrl = `/sign-in?redirect_url=${encodeURIComponent(window.location.href)}`
      window.location.href = signInUrl
      return
    }

    if (!requestedSite || !redirectUrl) {
      setStatus('error')
      return
    }

    try {
      // Call universal authorization API
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
        setSiteInfo({ 
          name: requestedSite,
          url: result.redirectUrl 
        })
        setStatus('authorized')
        
        // Auto-redirect after 2 seconds
        setTimeout(() => {
          window.location.href = result.redirectUrl
        }, 2000)
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
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
        <div className="text-center">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">NitroAuth</h1>
            <p className="text-sm text-gray-600 mt-2">Universal Authentication Gateway</p>
          </div>

          {status === 'loading' && (
            <div>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Verifying access permissions...</p>
              {requestedSite && (
                <p className="text-sm text-gray-500 mt-2">
                  Requested site: <span className="font-medium">{requestedSite}</span>
                </p>
              )}
            </div>
          )}

          {status === 'authorized' && siteInfo && (
            <div>
              <div className="text-green-600 text-5xl mb-4">✅</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Access Granted</h2>
              <p className="text-gray-600 mb-4">
                You have been authorized to access:
              </p>
              <div className="bg-green-50 p-4 rounded-lg mb-4">
                <p className="font-medium text-green-800">{siteInfo.name}</p>
                <p className="text-sm text-green-600 mt-1 break-all">{redirectUrl}</p>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Redirecting automatically...
              </p>
              <a 
                href={siteInfo.url}
                className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
              >
                Continue to Application
              </a>
            </div>
          )}

          {status === 'unauthorized' && (
            <div>
              <div className="text-orange-500 text-5xl mb-4">🔒</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Access Required</h2>
              <div className="bg-orange-50 p-4 rounded-lg mb-4">
                <p className="text-orange-800 font-medium">
                  Application: <span className="font-normal">{requestedSite}</span>
                </p>
                <p className="text-sm text-orange-600 mt-2">
                  You need permission to access this application
                </p>
              </div>
              <p className="text-gray-600 mb-6">
                Contact your administrator to request access, or try signing in with a different account.
              </p>
              <div className="space-y-3">
                <a 
                  href="/dashboard"
                  className="block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Go to Dashboard
                </a>
                <a 
                  href="/sign-out"
                  className="block text-gray-500 hover:text-gray-700 text-sm"
                >
                  Sign out and try different account
                </a>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div>
              <div className="text-red-500 text-5xl mb-4">⚠️</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Authentication Error</h2>
              <p className="text-gray-600 mb-6">
                Unable to process authentication request. This may be due to invalid parameters or a system error.
              </p>
              <div className="bg-gray-50 p-4 rounded-lg mb-4 text-left">
                <p className="text-sm text-gray-700">
                  <strong>Requested Site:</strong> {requestedSite || 'Not specified'}
                </p>
                <p className="text-sm text-gray-700 break-all">
                  <strong>Redirect URL:</strong> {redirectUrl || 'Not specified'}
                </p>
              </div>
              <div className="space-y-3">
                <button 
                  onClick={() => window.location.reload()}
                  className="block w-full bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Try Again
                </button>
                <a 
                  href="/dashboard"
                  className="block text-gray-500 hover:text-gray-700 text-sm"
                >
                  Return to Dashboard
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}