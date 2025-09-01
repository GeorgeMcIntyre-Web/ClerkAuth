'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error details in development only
    if (process.env.NODE_ENV === 'development') {
      console.error('Application Error:', error)
    }
  }, [error])

  // Check for specific error types
  const isEnvError = error.message?.toLowerCase().includes('environment') || 
                     error.message?.toLowerCase().includes('jwt_secret') ||
                     error.message?.toLowerCase().includes('database_url')
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md mx-auto p-6">
        <h1 className="text-6xl font-bold text-red-600">Error</h1>
        <p className="text-xl text-gray-600 mt-4">Something went wrong</p>
        <p className="text-gray-500 mt-2">An unexpected error occurred. Please try again.</p>
        
        {isEnvError && process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              Configuration issue detected. Please check your environment variables.
            </p>
          </div>
        )}
        
        <div className="mt-6 space-x-4">
          <button
            onClick={reset}
            className="inline-block bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Try Again
          </button>
          <a
            href="/"
            className="inline-block bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
          >
            Go Home
          </a>
        </div>
      </div>
    </div>
  )
}