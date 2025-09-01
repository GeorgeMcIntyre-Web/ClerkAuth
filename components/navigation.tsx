'use client'

import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import { useUser } from '@clerk/nextjs'
import { ThemeToggle } from './theme-toggle'
import { USER_ROLES } from '@/lib/auth-config'

interface NavigationProps {
  showAdminLink?: boolean
  currentPage?: string
}

export function Navigation({ showAdminLink = false, currentPage }: NavigationProps) {
  const { user } = useUser()

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-xl font-bold text-blue-600 dark:text-blue-400">
              ClerkAuth
            </Link>
            {showAdminLink && (
              <Link 
                href="/admin" 
                className="px-3 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 transition-colors"
              >
                Admin Panel
              </Link>
            )}
            {currentPage === 'admin' && (
              <Link
                href="/admin/access"
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors text-sm"
              >
                🌐 Universal Access
              </Link>
            )}
            {currentPage === 'access' && (
              <Link
                href="/admin"
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition-colors text-sm"
              >
                ← Back to Admin
              </Link>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            {currentPage === 'dashboard' && (
              <span className="text-gray-700 dark:text-gray-300">
                Welcome, {user?.firstName || 'User'}!
              </span>
            )}
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </div>
    </nav>
  )
}