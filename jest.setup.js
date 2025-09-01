import '@testing-library/jest-dom'

// Mock Clerk
jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn(),
  clerkClient: {
    users: {
      getUser: jest.fn(),
      getUserList: jest.fn(),
      updateUserMetadata: jest.fn(),
    },
  },
}))

// Mock Next.js
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
  useSearchParams: jest.fn(),
}))

// Mock environment variables
process.env.JWT_SECRET = 'test-secret'
process.env.NODE_ENV = 'test'