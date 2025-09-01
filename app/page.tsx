import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-blue-600">NitroAuth</h1>
              <span className="ml-2 text-sm text-gray-500">Centralized Authentication Hub</span>
            </div>
            <div className="flex items-center space-x-4">
              <SignedOut>
                <Link 
                  href="/sign-up"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Sign Up
                </Link>
                <SignInButton mode="modal">
                  <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                    Sign In
                  </button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <Link 
                  href="/dashboard"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Dashboard
                </Link>
                <UserButton afterSignOutUrl="/" />
              </SignedIn>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
            NitroAuth
          </h2>
          <p className="max-w-xl mt-5 mx-auto text-xl text-gray-500">
            Your centralized authentication hub. Sign in once, access all your authorized sites.
          </p>
          
          <div className="mt-8">
            <SignedOut>
              <p className="text-gray-600 mb-6">Create an account or sign in to get started</p>
              <div className="flex justify-center space-x-4">
                <Link 
                  href="/sign-up"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-lg"
                >
                  Create Account
                </Link>
                <SignInButton mode="modal">
                  <button className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg text-lg">
                    Sign In
                  </button>
                </SignInButton>
              </div>
            </SignedOut>
            <SignedIn>
              <Link 
                href="/dashboard"
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg text-lg inline-block"
              >
                Go to Dashboard
              </Link>
            </SignedIn>
          </div>
        </div>
      </main>
    </div>
  )
}