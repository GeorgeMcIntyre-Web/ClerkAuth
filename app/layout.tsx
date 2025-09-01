import { type Metadata } from 'next'
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/lib/theme-context'
import { ThemeToggle } from '@/components/theme-toggle'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ClerkAuth - Universal Authentication System',
  description: 'Universal authentication and authorization system',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Check if Clerk is configured
  const isClerkConfigured = !!(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && 
    process.env.CLERK_SECRET_KEY
  )
  
  // If Clerk is not configured, show setup instructions
  if (!isClerkConfigured && typeof window !== 'undefined') {
    return (
      <html lang="en">
        <body className={inter.className}>
          <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-2xl mx-auto">
              <h1 className="text-3xl font-bold text-red-600 mb-4">Configuration Required</h1>
              <p className="mb-4">Clerk authentication is not configured. Please set the following environment variables in Vercel:</p>
              <ul className="list-disc ml-6 space-y-2">
                <li><code className="bg-gray-200 px-1">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code></li>
                <li><code className="bg-gray-200 px-1">CLERK_SECRET_KEY</code></li>
              </ul>
              <p className="mt-4">
                Visit <a href="/setup" className="text-blue-600 underline">Setup Guide</a> for detailed instructions.
              </p>
            </div>
          </div>
        </body>
      </html>
    )
  }
  
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={`${inter.className} bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-200`}>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}