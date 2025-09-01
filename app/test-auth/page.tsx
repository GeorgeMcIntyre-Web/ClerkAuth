'use client'

import { useUser } from '@clerk/nextjs'
import { useEffect, useState } from 'react'

export default function TestAuth() {
  const { user, isLoaded } = useUser()
  const [authResult, setAuthResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testHouseAtreidesAccess = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      const response = await fetch('/api/auth/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestedSite: 'houseatreides',
          redirectUrl: 'https://www.houseatreides.space/auth/callback'
        })
      })
      
      const result = await response.json()
      setAuthResult(result)
    } catch (error) {
      console.error('Test failed:', error)
      setAuthResult({ error: 'Test failed', details: error })
    } finally {
      setLoading(false)
    }
  }

  if (!isLoaded) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-6">🧪 Test House Atreides Access</h1>
          
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Current User Info:</h2>
            <div className="bg-gray-50 p-4 rounded">
              <p><strong>Email:</strong> {user?.emailAddresses[0]?.emailAddress}</p>
              <p><strong>Role:</strong> {(user?.publicMetadata?.role as string) || 'No role'}</p>
              <p><strong>Site Access:</strong> {JSON.stringify(user?.publicMetadata?.siteAccess) || 'None'}</p>
            </div>
          </div>

          <button
            onClick={testHouseAtreidesAccess}
            disabled={loading || !user}
            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '🔄 Testing...' : '🏠 Test House Atreides Access'}
          </button>

          {authResult && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Test Result:</h3>
              <div className={`p-4 rounded ${authResult.authorized ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                {authResult.authorized ? (
                  <div>
                    <p className="text-green-800 font-semibold">✅ Access Granted!</p>
                    <p className="text-sm text-green-700 mt-2">
                      <strong>Redirect URL:</strong> 
                      <a href={authResult.redirectUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-2">
                        {authResult.redirectUrl}
                      </a>
                    </p>
                    <p className="text-sm text-green-700">
                      <strong>User Role:</strong> {authResult.userRole}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-red-800 font-semibold">🔒 Access Denied</p>
                    <p className="text-sm text-red-700 mt-2">
                      <strong>Error:</strong> {authResult.error}
                    </p>
                  </div>
                )}
              </div>
              
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-gray-600">Show Raw Response</summary>
                <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto">
                  {JSON.stringify(authResult, null, 2)}
                </pre>
              </details>
            </div>
          )}

          <div className="mt-8 p-4 bg-blue-50 rounded">
            <h3 className="font-semibold text-blue-900 mb-2">🔧 How This Works:</h3>
            <ol className="text-sm text-blue-800 space-y-1">
              <li>1. This test calls the same API that external sites would use</li>
              <li>2. It checks if your user has access to &quot;houseatreides&quot; site</li>
              <li>3. If approved, it generates a secure JWT token</li>
              <li>4. External sites would validate this token to grant access</li>
            </ol>
          </div>

          <div className="mt-4 text-center">
            <a href="/admin" className="text-blue-600 hover:underline">
              ← Back to Admin Panel
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}