'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'

export default function SetupAdminPage() {
  const { user, isLoaded } = useUser()
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const setupAdmin = async () => {
    setStatus('loading')
    try {
      const response = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const result = await response.json()
      if (result.success) {
        setStatus('success')
        setMessage('Success! You are now a Super Admin. You can now go to the dashboard.')
      } else {
        setStatus('error')
        setMessage('Error: ' + result.error)
      }
    } catch (error) {
      setStatus('error')
      setMessage('Setup failed: ' + error)
    }
  }

  if (!isLoaded) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>
  }

  if (!user) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Please sign in first</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Setup Super Admin</h1>
          
          {status === 'idle' && (
            <div>
              <p className="text-gray-600 mb-4">
                Click the button below to make yourself a Super Admin for NitroAuth.
              </p>
              <button
                onClick={setupAdmin}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Make Me Super Admin
              </button>
            </div>
          )}

          {status === 'loading' && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Setting up admin access...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="text-green-600 text-lg mb-4">✅ {message}</div>
              <a 
                href="/dashboard" 
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Go to Dashboard
              </a>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <div className="text-red-600 text-lg mb-4">❌ {message}</div>
              <button
                onClick={setupAdmin}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
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