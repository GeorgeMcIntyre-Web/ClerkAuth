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
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-red-600">Error</h1>
        <p className="text-xl text-gray-600 mt-4">Something went wrong</p>
        <p className="text-gray-500 mt-2">An unexpected error occurred. Please try again.</p>
        <button
          onClick={reset}
          className="inline-block mt-6 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-4"
        >
          Try Again
        </button>
        <a
          href="/"
          className="inline-block mt-6 bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
        >
          Go Home
        </a>
      </div>
    </div>
  )
}