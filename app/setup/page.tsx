'use client'

import { useState, useEffect } from 'react'

export default function SetupPage() {
  const [envStatus, setEnvStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    // Check environment variables
    const checkEnv = async () => {
      try {
        const res = await fetch('/api/debug/env')
        const data = await res.json()
        setEnvStatus(data)
      } catch (error) {
        console.error('Failed to check environment:', error)
      } finally {
        setLoading(false)
      }
    }
    
    checkEnv()
  }, [])
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }
  
  const isClerkDev = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.includes('pk_test_')
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">ClerkAuth Setup Guide</h1>
        
        {isClerkDev && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">⚠️</div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  You are using Clerk development keys. For production, you need to use production keys from your Clerk dashboard.
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Environment Variables Status</h2>
          
          {envStatus && (
            <div className="space-y-3">
              <div>
                <h3 className="font-medium mb-2">Clerk Configuration:</h3>
                <ul className="space-y-1 ml-4">
                  <li className={envStatus.environment?.clerk?.publishableKey ? 'text-green-600' : 'text-red-600'}>
                    {envStatus.environment?.clerk?.publishableKey ? '✅' : '❌'} NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
                  </li>
                  <li className={envStatus.environment?.clerk?.secretKey ? 'text-green-600' : 'text-red-600'}>
                    {envStatus.environment?.clerk?.secretKey ? '✅' : '❌'} CLERK_SECRET_KEY
                  </li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Database Configuration:</h3>
                <ul className="space-y-1 ml-4">
                  <li className={envStatus.environment?.database?.url ? 'text-green-600' : 'text-red-600'}>
                    {envStatus.environment?.database?.url ? '✅' : '❌'} DATABASE_URL
                  </li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Security Configuration:</h3>
                <ul className="space-y-1 ml-4">
                  <li className={envStatus.environment?.jwt?.secret ? 'text-green-600' : 'text-red-600'}>
                    {envStatus.environment?.jwt?.secret ? '✅' : '❌'} JWT_SECRET
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Setup Instructions</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">1. Clerk Authentication (Required)</h3>
              <p className="text-gray-600 mb-2">Get your keys from the Clerk Dashboard:</p>
              <ol className="list-decimal ml-6 space-y-1 text-sm">
                <li>Go to <a href="https://dashboard.clerk.com" target="_blank" className="text-blue-600 hover:underline">dashboard.clerk.com</a></li>
                <li>Select your application (or create one)</li>
                <li>For production, switch to &quot;Production&quot; mode in Clerk</li>
                <li>Copy the API Keys from the dashboard</li>
                <li>Add them to Vercel Environment Variables</li>
              </ol>
              <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono">
                NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...<br/>
                CLERK_SECRET_KEY=sk_live_...
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">2. Database (Required)</h3>
              <p className="text-gray-600 mb-2">Set up Neon PostgreSQL:</p>
              <ol className="list-decimal ml-6 space-y-1 text-sm">
                <li>Go to <a href="https://neon.tech" target="_blank" className="text-blue-600 hover:underline">neon.tech</a></li>
                <li>Create a new database</li>
                <li>Copy the connection string</li>
              </ol>
              <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono">
                DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">3. JWT Secret (Required)</h3>
              <p className="text-gray-600 mb-2">Generate a secure random string:</p>
              <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono">
                JWT_SECRET=your-32-character-secret-key-here
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Generate with: <code className="bg-gray-200 px-1">openssl rand -base64 32</code>
              </p>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">4. Add to Vercel</h3>
              <ol className="list-decimal ml-6 space-y-1 text-sm">
                <li>Go to your Vercel dashboard</li>
                <li>Select your project</li>
                <li>Go to Settings → Environment Variables</li>
                <li>Add each variable for &quot;Production&quot; environment</li>
                <li>Redeploy your application</li>
              </ol>
            </div>
          </div>
        </div>
        
        {envStatus?.issues?.length > 0 && (
          <div className="mt-6 bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">❌</div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Missing Configuration</h3>
                <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                  {envStatus.issues.map((issue: string, i: number) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}