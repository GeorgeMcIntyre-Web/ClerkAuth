import { SignedIn, SignedOut, SignInButton, SignUpButton } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import { ThemeToggle } from '@/components/theme-toggle'

export default function Home() {
  // Try to redirect authenticated users, but handle errors gracefully
  try {
    const { userId } = auth()
    if (userId) {
      redirect('/dashboard')
    }
  } catch (error) {
    // If auth() fails, continue to render the page
    console.warn('Auth check failed, continuing with page render')
  }
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">ClerkAuth</h1>
              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Centralized Authentication Hub</span>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <Link 
                href="/sign-up"
                className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Sign Up
              </Link>
              <SignInButton mode="modal">
                <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors">
                  Sign In
                </button>
              </SignInButton>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white sm:text-5xl sm:tracking-tight lg:text-6xl">
            ClerkAuth
          </h2>
          <p className="max-w-2xl mt-5 mx-auto text-xl text-gray-500 dark:text-gray-400">
            Universal Authentication System - One login for all your applications. Secure, scalable, and seamless access management.
          </p>
          
          {/* Features Section */}
          <div className="mt-12 max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-md bg-blue-500 text-white text-2xl mb-4">
                  🔐
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Secure Authentication</h3>
                <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
                  Enterprise-grade security with JWT tokens and role-based access control.
                </p>
              </div>
              
              <div className="text-center">
                <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-md bg-green-500 text-white text-2xl mb-4">
                  🌐
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Universal Access</h3>
                <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
                  Grant access to any application dynamically without code changes.
                </p>
              </div>
              
              <div className="text-center">
                <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-md bg-purple-500 text-white text-2xl mb-4">
                  ⚡
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Admin Control</h3>
                <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
                  Comprehensive user management with real-time permission updates.
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-12">
            <p className="text-gray-600 dark:text-gray-400 mb-6">Create an account or sign in to access your dashboard</p>
            <div className="flex justify-center space-x-4">
              <Link 
                href="/sign-up"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors"
              >
                Create Account
              </Link>
              <SignInButton mode="modal">
                <button className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors">
                  Sign In
                </button>
              </SignInButton>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}