import { GET } from '../route'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { USER_ROLES } from '@/lib/auth-config'
import { 
  createMockUser, 
  createMockRequest,
  TEST_ERRORS,
  hasRoleAccess 
} from '@/lib/test-utils'

// Mock the modules
jest.mock('@clerk/nextjs/server')

const mockAuth = auth as jest.MockedFunction<typeof auth>
const mockClerkClient = clerkClient as jest.Mocked<typeof clerkClient>

describe('GET /api/admin/users', () => {
  const mockAdminUserId = 'admin_test123'
  const mockAdminUser = {
    id: mockAdminUserId,
    emailAddresses: [{ emailAddress: 'admin@example.com' }],
    publicMetadata: {
      role: USER_ROLES.ADMIN
    }
  }

  const mockUsers = Array.from({ length: 50 }, (_, i) => ({
    id: `user_${i + 1}`,
    emailAddresses: [{ emailAddress: `user${i + 1}@example.com` }],
    firstName: `User${i + 1}`,
    lastName: `Test`,
    publicMetadata: {
      role: i < 5 ? USER_ROLES.ADMIN : USER_ROLES.STANDARD,
      siteAccess: ['standard_sites']
    },
    createdAt: new Date().getTime() - i * 24 * 60 * 60 * 1000, // 1 day apart
    lastSignInAt: new Date().getTime() - i * 12 * 60 * 60 * 1000 // 12 hours apart
  }))

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock auth to return admin user ID
    mockAuth.mockReturnValue({ userId: mockAdminUserId })
    
    // Mock clerkClient.users.getUser for admin check
    mockClerkClient.users.getUser.mockResolvedValue(mockAdminUser as any)
  })

  test('should return 401 if no user ID', async () => {
    mockAuth.mockReturnValue({ userId: null })

    const request = new Request('http://localhost/api/admin/users')
    const response = await GET(request)
    
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('should return 403 if user is not admin', async () => {
    const nonAdminUser = {
      ...mockAdminUser,
      publicMetadata: { role: USER_ROLES.STANDARD }
    }
    mockClerkClient.users.getUser.mockResolvedValue(nonAdminUser as any)

    const request = new Request('http://localhost/api/admin/users')
    const response = await GET(request)
    
    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.error).toBe('Admin access required')
  })

  test('should return paginated users with default parameters', async () => {
    // Mock getUserList with pagination
    mockClerkClient.users.getUserList.mockResolvedValue({
      data: mockUsers.slice(0, 20), // Default limit is 20
      totalCount: mockUsers.length
    } as any)

    const request = new Request('http://localhost/api/admin/users')
    const response = await GET(request)
    
    expect(response.status).toBe(200)
    const body = await response.json()
    
    expect(body.users).toHaveLength(20)
    expect(body.pagination).toEqual({
      currentPage: 1,
      totalPages: Math.ceil(mockUsers.length / 20),
      totalUsers: mockUsers.length,
      limit: 20,
      hasNextPage: true,
      hasPreviousPage: false
    })
    
    // Verify getUserList was called with correct parameters
    expect(mockClerkClient.users.getUserList).toHaveBeenCalledWith({
      limit: 20,
      offset: 0
    })
  })

  test('should handle custom page and limit parameters', async () => {
    const customLimit = 10
    const customPage = 2
    const offset = (customPage - 1) * customLimit
    
    mockClerkClient.users.getUserList.mockResolvedValue({
      data: mockUsers.slice(offset, offset + customLimit),
      totalCount: mockUsers.length
    } as any)

    const request = new Request(`http://localhost/api/admin/users?page=${customPage}&limit=${customLimit}`)
    const response = await GET(request)
    
    expect(response.status).toBe(200)
    const body = await response.json()
    
    expect(body.users).toHaveLength(customLimit)
    expect(body.pagination.currentPage).toBe(customPage)
    expect(body.pagination.limit).toBe(customLimit)
    expect(body.pagination.totalUsers).toBe(mockUsers.length)
    expect(body.pagination.totalPages).toBe(Math.ceil(mockUsers.length / customLimit))
    
    // Verify getUserList was called with correct parameters
    expect(mockClerkClient.users.getUserList).toHaveBeenCalledWith({
      limit: customLimit,
      offset: offset
    })
  })

  test('should enforce maximum limit of 100', async () => {
    mockClerkClient.users.getUserList.mockResolvedValue({
      data: mockUsers.slice(0, 100),
      totalCount: mockUsers.length
    } as any)

    const request = new Request('http://localhost/api/admin/users?limit=200')
    const response = await GET(request)
    
    expect(response.status).toBe(200)
    const body = await response.json()
    
    expect(body.pagination.limit).toBe(100) // Should be capped at 100
    
    // Verify getUserList was called with maximum limit
    expect(mockClerkClient.users.getUserList).toHaveBeenCalledWith({
      limit: 100,
      offset: 0
    })
  })

  test('should handle minimum values for page and limit', async () => {
    mockClerkClient.users.getUserList.mockResolvedValue({
      data: mockUsers.slice(0, 1),
      totalCount: mockUsers.length
    } as any)

    const request = new Request('http://localhost/api/admin/users?page=0&limit=0')
    const response = await GET(request)
    
    expect(response.status).toBe(200)
    const body = await response.json()
    
    expect(body.pagination.currentPage).toBe(1) // Should be minimum 1
    expect(body.pagination.limit).toBe(1) // Should be minimum 1
    
    // Verify getUserList was called with minimum values
    expect(mockClerkClient.users.getUserList).toHaveBeenCalledWith({
      limit: 1,
      offset: 0
    })
  })

  test('should format user data correctly', async () => {
    const singleUser = [mockUsers[0]]
    mockClerkClient.users.getUserList.mockResolvedValue({
      data: singleUser,
      totalCount: 1
    } as any)

    const request = new Request('http://localhost/api/admin/users?limit=1')
    const response = await GET(request)
    
    expect(response.status).toBe(200)
    const body = await response.json()
    
    const returnedUser = body.users[0]
    expect(returnedUser).toEqual({
      id: 1, // Sequential ID
      clerkId: singleUser[0].id,
      email: singleUser[0].emailAddresses[0].emailAddress,
      firstName: singleUser[0].firstName,
      lastName: singleUser[0].lastName,
      role: singleUser[0].publicMetadata.role,
      createdAt: new Date(singleUser[0].createdAt).toISOString(),
      lastActive: new Date(singleUser[0].lastSignInAt).toISOString(),
      siteAccess: singleUser[0].publicMetadata.siteAccess
    })
  })

  test('should handle users without lastSignInAt', async () => {
    const userWithoutLastSignIn = {
      ...mockUsers[0],
      lastSignInAt: null
    }
    
    mockClerkClient.users.getUserList.mockResolvedValue({
      data: [userWithoutLastSignIn],
      totalCount: 1
    } as any)

    const request = new Request('http://localhost/api/admin/users?limit=1')
    const response = await GET(request)
    
    expect(response.status).toBe(200)
    const body = await response.json()
    
    const returnedUser = body.users[0]
    expect(returnedUser.lastActive).toBe(new Date(userWithoutLastSignIn.createdAt).toISOString())
  })

  test('should handle empty user list', async () => {
    mockClerkClient.users.getUserList.mockResolvedValue({
      data: [],
      totalCount: 0
    } as any)

    const request = new Request('http://localhost/api/admin/users')
    const response = await GET(request)
    
    expect(response.status).toBe(200)
    const body = await response.json()
    
    expect(body.users).toHaveLength(0)
    expect(body.pagination).toEqual({
      currentPage: 1,
      totalPages: 0,
      totalUsers: 0,
      limit: 20,
      hasNextPage: false,
      hasPreviousPage: false
    })
  })

  test('should calculate pagination metadata correctly for last page', async () => {
    const totalUsers = 45
    const limit = 20
    const lastPage = 3
    
    // Mock last page data (5 users remaining)
    mockClerkClient.users.getUserList.mockResolvedValue({
      data: mockUsers.slice(40, 45),
      totalCount: totalUsers
    } as any)

    const request = new Request(`http://localhost/api/admin/users?page=${lastPage}&limit=${limit}`)
    const response = await GET(request)
    
    expect(response.status).toBe(200)
    const body = await response.json()
    
    expect(body.users).toHaveLength(5) // Only 5 users on last page
    expect(body.pagination).toEqual({
      currentPage: lastPage,
      totalPages: Math.ceil(totalUsers / limit),
      totalUsers: totalUsers,
      limit: limit,
      hasNextPage: false, // This is the last page
      hasPreviousPage: true
    })
  })

  test('should handle server errors gracefully', async () => {
    mockClerkClient.users.getUserList.mockRejectedValue(new Error('Database connection failed'))

    const request = new Request('http://localhost/api/admin/users')
    const response = await GET(request)
    
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBe('Failed to fetch users')
  })

  test('should allow super admin access', async () => {
    const superAdminUser = {
      ...mockAdminUser,
      publicMetadata: { role: USER_ROLES.SUPER_ADMIN }
    }
    mockClerkClient.users.getUser.mockResolvedValue(superAdminUser as any)
    mockClerkClient.users.getUserList.mockResolvedValue({
      data: mockUsers.slice(0, 20),
      totalCount: mockUsers.length
    } as any)

    const request = new Request('http://localhost/api/admin/users')
    const response = await GET(request)
    
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.users).toHaveLength(20)
  })
})