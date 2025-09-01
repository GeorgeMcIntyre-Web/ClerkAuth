import { GET, POST, PUT, DELETE } from '../route'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { USER_ROLES } from '@/lib/auth-config'
import { eq } from 'drizzle-orm'
import { 
  createMockUser, 
  createMockRequest,
  createMockSite,
  TEST_ERRORS,
  TEST_DATA 
} from '@/lib/test-utils'

// Mock the modules
jest.mock('@clerk/nextjs/server')
jest.mock('@/lib/db')
jest.mock('@/lib/schema')

const mockAuth = auth as jest.MockedFunction<typeof auth>
const mockClerkClient = clerkClient as jest.Mocked<typeof clerkClient>

// Mock database functions
const mockDb = {
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  returning: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis()
}

describe('Admin Sites API Endpoints', () => {
  const mockAdminId = 'user_admin123'
  const mockSuperAdminId = 'user_superadmin123'
  const mockStandardUserId = 'user_standard123'

  const mockAdminUser = createMockUser({
    id: mockAdminId,
    email: 'admin@example.com',
    role: USER_ROLES.ADMIN
  })

  const mockSuperAdminUser = createMockUser({
    id: mockSuperAdminId,
    email: 'superadmin@example.com',
    role: USER_ROLES.SUPER_ADMIN
  })

  const mockStandardUser = createMockUser({
    id: mockStandardUserId,
    email: 'user@example.com',
    role: USER_ROLES.STANDARD
  })

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock database
    require('@/lib/db').db.mockReturnValue(mockDb)
    
    // Mock schema
    const mockSites = { isActive: 'isActive' }
    require('@/lib/schema').sites = mockSites
    require('@/lib/schema').insertSiteSchema = {
      safeParse: jest.fn().mockReturnValue({ success: true, data: {} })
    }
  })

  describe('GET /api/admin/sites', () => {
    describe('Authentication and Authorization', () => {
      test('should return 401 when user is not authenticated', async () => {
        mockAuth.mockReturnValue({ userId: null })

        const response = await GET()
        expect(response.status).toBe(401)

        const body = await response.json()
        expect(body.error).toBe(TEST_ERRORS.UNAUTHORIZED)
      })

      test('should return 403 when user is not admin or super admin', async () => {
        mockAuth.mockReturnValue({ userId: mockStandardUserId })
        mockClerkClient.users.getUser.mockResolvedValue(mockStandardUser as any)

        const response = await GET()
        expect(response.status).toBe(403)

        const body = await response.json()
        expect(body.error).toBe(TEST_ERRORS.ADMIN_ACCESS_REQUIRED)
      })

      test('should allow access for admin users', async () => {
        mockAuth.mockReturnValue({ userId: mockAdminId })
        mockClerkClient.users.getUser.mockResolvedValue(mockAdminUser as any)
        mockDb.select.mockResolvedValue([createMockSite()])

        const response = await GET()
        expect(response.status).toBe(200)
      })

      test('should allow access for super admin users', async () => {
        mockAuth.mockReturnValue({ userId: mockSuperAdminId })
        mockClerkClient.users.getUser.mockResolvedValue(mockSuperAdminUser as any)
        mockDb.select.mockResolvedValue([createMockSite()])

        const response = await GET()
        expect(response.status).toBe(200)
      })
    })

    describe('Site Data Retrieval', () => {
      beforeEach(() => {
        mockAuth.mockReturnValue({ userId: mockAdminId })
        mockClerkClient.users.getUser.mockResolvedValue(mockAdminUser as any)
      })

      test('should return only active sites', async () => {
        const mockSites = [
          createMockSite({ id: '1', name: 'Active Site 1', isActive: true }),
          createMockSite({ id: '2', name: 'Active Site 2', isActive: true })
        ]
        
        mockDb.select.mockResolvedValue(mockSites)

        const response = await GET()
        expect(response.status).toBe(200)

        const body = await response.json()
        expect(body).toEqual(mockSites)
        expect(mockDb.where).toHaveBeenCalledWith(eq(require('@/lib/schema').sites.isActive, true))
      })

      test('should handle empty site list', async () => {
        mockDb.select.mockResolvedValue([])

        const response = await GET()
        expect(response.status).toBe(200)

        const body = await response.json()
        expect(body).toEqual([])
      })

      test('should handle database errors', async () => {
        mockAuth.mockReturnValue({ userId: mockAdminId })
        mockClerkClient.users.getUser.mockResolvedValue(mockAdminUser as any)
        mockDb.select.mockRejectedValue(new Error('Database error'))

        const response = await GET()
        expect(response.status).toBe(500)

        const body = await response.json()
        expect(body.error).toBe(TEST_ERRORS.FAILED_TO_FETCH_SITES)
      })
    })
  })

  describe('POST /api/admin/sites', () => {
    describe('Authentication and Authorization', () => {
      test('should return 401 when user is not authenticated', async () => {
        mockAuth.mockReturnValue({ userId: null })

        const request = createMockRequest('http://localhost/api/admin/sites', {
          body: { name: 'Test Site', url: 'https://test.com' }
        })

        const response = await POST(request)
        expect(response.status).toBe(401)

        const body = await response.json()
        expect(body.error).toBe(TEST_ERRORS.UNAUTHORIZED)
      })

      test('should return 403 when user is not admin or super admin', async () => {
        mockAuth.mockReturnValue({ userId: mockStandardUserId })
        mockClerkClient.users.getUser.mockResolvedValue(mockStandardUser as any)

        const request = createMockRequest('http://localhost/api/admin/sites', {
          body: { name: 'Test Site', url: 'https://test.com' }
        })

        const response = await POST(request)
        expect(response.status).toBe(403)

        const body = await response.json()
        expect(body.error).toBe(TEST_ERRORS.ADMIN_ACCESS_REQUIRED)
      })
    })

    describe('Site Creation', () => {
      beforeEach(() => {
        mockAuth.mockReturnValue({ userId: mockAdminId })
        mockClerkClient.users.getUser.mockResolvedValue(mockAdminUser as any)
      })

      test('should successfully create a new site', async () => {
        const newSiteData = {
          name: 'Test Site',
          url: 'https://test.example.com',
          description: 'Test site description',
          category: 'standard'
        }

        const mockInsertSiteSchema = require('@/lib/schema').insertSiteSchema
        mockInsertSiteSchema.safeParse.mockReturnValue({
          success: true,
          data: newSiteData
        })

        // Mock URL validation (site doesn't exist)
        mockDb.select.mockResolvedValue([])
        
        // Mock successful insertion
        const createdSite = createMockSite(newSiteData)
        mockDb.returning.mockResolvedValue([createdSite])

        const request = createMockRequest('http://localhost/api/admin/sites', {
          body: newSiteData
        })

        const response = await POST(request)
        expect(response.status).toBe(200)

        const body = await response.json()
        expect(body.success).toBe(true)
        expect(body.site).toEqual(createdSite)
      })

      test('should return 400 for invalid input data', async () => {
        const mockInsertSiteSchema = require('@/lib/schema').insertSiteSchema
        mockInsertSiteSchema.safeParse.mockReturnValue({
          success: false,
          error: { errors: [{ message: 'Invalid data' }] }
        })

        const request = createMockRequest('http://localhost/api/admin/sites', {
          body: { name: '', url: 'invalid-url' }
        })

        const response = await POST(request)
        expect(response.status).toBe(400)

        const body = await response.json()
        expect(body.error).toBe(TEST_ERRORS.INVALID_INPUT_DATA)
        expect(body.details).toBeDefined()
      })

      test('should return 400 for invalid URL format', async () => {
        const mockInsertSiteSchema = require('@/lib/schema').insertSiteSchema
        mockInsertSiteSchema.safeParse.mockReturnValue({
          success: true,
          data: { name: 'Test', url: 'not-a-valid-url', category: 'standard' }
        })

        const request = createMockRequest('http://localhost/api/admin/sites', {
          body: { name: 'Test', url: 'not-a-valid-url', category: 'standard' }
        })

        const response = await POST(request)
        expect(response.status).toBe(400)

        const body = await response.json()
        expect(body.error).toBe('Invalid URL format')
      })

      test('should return 400 when site URL already exists', async () => {
        const existingSite = createMockSite({ url: 'https://existing.com' })
        
        const mockInsertSiteSchema = require('@/lib/schema').insertSiteSchema
        mockInsertSiteSchema.safeParse.mockReturnValue({
          success: true,
          data: { name: 'Test', url: 'https://existing.com', category: 'standard' }
        })

        // Mock existing site found
        mockDb.select.mockResolvedValue([existingSite])

        const request = createMockRequest('http://localhost/api/admin/sites', {
          body: { name: 'Test', url: 'https://existing.com', category: 'standard' }
        })

        const response = await POST(request)
        expect(response.status).toBe(400)

        const body = await response.json()
        expect(body.error).toBe(TEST_ERRORS.SITE_URL_EXISTS)
      })

      test('should handle various valid URL formats', async () => {
        const validUrls = TEST_DATA.VALID_SITES

        for (const url of validUrls) {
          const mockInsertSiteSchema = require('@/lib/schema').insertSiteSchema
          mockInsertSiteSchema.safeParse.mockReturnValue({
            success: true,
            data: { name: 'Test', url, category: 'standard' }
          })

          mockDb.select.mockResolvedValue([]) // No existing site
          mockDb.returning.mockResolvedValue([createMockSite({ url })])

          const request = createMockRequest('http://localhost/api/admin/sites', {
            body: { name: 'Test', url, category: 'standard' }
          })

          const response = await POST(request)
          expect(response.status).toBe(200)
        }
      })

      test('should log site creation action', async () => {
        const newSiteData = {
          name: 'Test Site',
          url: 'https://test.example.com',
          category: 'standard'
        }

        const mockInsertSiteSchema = require('@/lib/schema').insertSiteSchema
        mockInsertSiteSchema.safeParse.mockReturnValue({
          success: true,
          data: newSiteData
        })

        mockDb.select.mockResolvedValue([])
        const createdSite = createMockSite(newSiteData)
        mockDb.returning.mockResolvedValue([createdSite])

        const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation()

        const request = createMockRequest('http://localhost/api/admin/sites', {
          body: newSiteData
        })

        await POST(request)

        expect(mockConsoleLog).toHaveBeenCalledWith(
          expect.stringContaining('ADMIN ACTION: Site "Test Site" (https://test.example.com) added by admin@example.com')
        )

        mockConsoleLog.mockRestore()
      })
    })

    describe('Security Tests for Site Creation', () => {
      beforeEach(() => {
        mockAuth.mockReturnValue({ userId: mockAdminId })
        mockClerkClient.users.getUser.mockResolvedValue(mockAdminUser as any)
      })

      test('should reject malicious URLs', async () => {
        const maliciousUrls = [
          'javascript:alert(1)',
          'data:text/html,<script>alert(1)</script>',
          'vbscript:msgbox(1)',
          'file:///etc/passwd'
        ]

        for (const maliciousUrl of maliciousUrls) {
          const mockInsertSiteSchema = require('@/lib/schema').insertSiteSchema
          mockInsertSiteSchema.safeParse.mockReturnValue({
            success: true,
            data: { name: 'Test', url: maliciousUrl, category: 'standard' }
          })

          const request = createMockRequest('http://localhost/api/admin/sites', {
            body: { name: 'Test', url: maliciousUrl, category: 'standard' }
          })

          const response = await POST(request)
          expect(response.status).toBe(400)

          const body = await response.json()
          expect(body.error).toBe('Invalid URL format')
        }
      })

      test('should handle XSS attempts in site data', async () => {
        const xssAttempts = TEST_DATA.XSS_ATTEMPTS

        for (const xssPayload of xssAttempts) {
          const mockInsertSiteSchema = require('@/lib/schema').insertSiteSchema
          mockInsertSiteSchema.safeParse.mockReturnValue({
            success: true,
            data: { name: xssPayload, url: 'https://test.com', category: 'standard' }
          })

          mockDb.select.mockResolvedValue([])
          mockDb.returning.mockResolvedValue([createMockSite({ name: xssPayload })])

          const request = createMockRequest('http://localhost/api/admin/sites', {
            body: { name: xssPayload, url: 'https://test.com', category: 'standard' }
          })

          // Should either sanitize or reject, but not crash
          const response = await POST(request)
          expect([200, 400]).toContain(response.status)
        }
      })
    })
  })

  describe('PUT /api/admin/sites', () => {
    describe('Site Updates', () => {
      beforeEach(() => {
        mockAuth.mockReturnValue({ userId: mockAdminId })
        mockClerkClient.users.getUser.mockResolvedValue(mockAdminUser as any)
      })

      test('should successfully update an existing site', async () => {
        const siteId = 'site123'
        const updateData = { name: 'Updated Site Name', description: 'Updated description' }
        const existingSite = createMockSite({ id: siteId })
        const updatedSite = { ...existingSite, ...updateData }

        const url = new URL('http://localhost/api/admin/sites')
        url.searchParams.set('id', siteId)

        const mockUpdateSchema = { 
          safeParse: jest.fn().mockReturnValue({ success: true, data: updateData })
        }
        require('@/lib/schema').insertSiteSchema = {
          partial: () => ({ omit: () => mockUpdateSchema })
        }

        mockDb.select.mockResolvedValue([existingSite]) // Site exists
        mockDb.returning.mockResolvedValue([updatedSite])

        const request = createMockRequest(url.toString(), {
          method: 'PUT',
          body: updateData
        })

        const response = await PUT(request)
        expect(response.status).toBe(200)

        const body = await response.json()
        expect(body.success).toBe(true)
        expect(body.site).toEqual(updatedSite)
      })

      test('should return 400 when site ID is missing', async () => {
        const request = createMockRequest('http://localhost/api/admin/sites', {
          method: 'PUT',
          body: { name: 'Updated Name' }
        })

        const response = await PUT(request)
        expect(response.status).toBe(400)

        const body = await response.json()
        expect(body.error).toBe('Site ID required')
      })

      test('should return 404 when site does not exist', async () => {
        const siteId = 'nonexistent-site'
        const url = new URL('http://localhost/api/admin/sites')
        url.searchParams.set('id', siteId)

        const mockUpdateSchema = { 
          safeParse: jest.fn().mockReturnValue({ success: true, data: {} })
        }
        require('@/lib/schema').insertSiteSchema = {
          partial: () => ({ omit: () => mockUpdateSchema })
        }

        mockDb.select.mockResolvedValue([]) // Site not found

        const request = createMockRequest(url.toString(), {
          method: 'PUT',
          body: { name: 'Updated Name' }
        })

        const response = await PUT(request)
        expect(response.status).toBe(404)

        const body = await response.json()
        expect(body.error).toBe(TEST_ERRORS.SITE_NOT_FOUND)
      })

      test('should validate URL updates and prevent duplicates', async () => {
        const siteId = 'site123'
        const existingSite = createMockSite({ id: siteId, url: 'https://original.com' })
        const duplicateUrl = 'https://existing-other.com'

        const url = new URL('http://localhost/api/admin/sites')
        url.searchParams.set('id', siteId)

        const mockUpdateSchema = { 
          safeParse: jest.fn().mockReturnValue({ 
            success: true, 
            data: { url: duplicateUrl }
          })
        }
        require('@/lib/schema').insertSiteSchema = {
          partial: () => ({ omit: () => mockUpdateSchema })
        }

        // Mock existing site with same URL but different ID
        mockDb.select
          .mockResolvedValueOnce([existingSite]) // For site existence check
          .mockResolvedValueOnce([createMockSite({ id: 'other-site', url: duplicateUrl })]) // For URL duplicate check

        const request = createMockRequest(url.toString(), {
          method: 'PUT',
          body: { url: duplicateUrl }
        })

        const response = await PUT(request)
        expect(response.status).toBe(400)

        const body = await response.json()
        expect(body.error).toBe(TEST_ERRORS.SITE_URL_EXISTS)
      })
    })
  })

  describe('DELETE /api/admin/sites', () => {
    describe('Authorization for Deletion', () => {
      test('should require super admin access for deletion', async () => {
        mockAuth.mockReturnValue({ userId: mockAdminId })
        mockClerkClient.users.getUser.mockResolvedValue(mockAdminUser as any) // Regular admin

        const url = new URL('http://localhost/api/admin/sites')
        url.searchParams.set('id', 'site123')
        const request = createMockRequest(url.toString(), { method: 'DELETE' })

        const response = await DELETE(request)
        expect(response.status).toBe(403)

        const body = await response.json()
        expect(body.error).toBe(TEST_ERRORS.SUPER_ADMIN_ACCESS_REQUIRED)
      })

      test('should allow super admin to delete sites', async () => {
        mockAuth.mockReturnValue({ userId: mockSuperAdminId })
        mockClerkClient.users.getUser.mockResolvedValue(mockSuperAdminUser as any)

        const siteId = 'site123'
        const existingSite = createMockSite({ id: siteId })

        const url = new URL('http://localhost/api/admin/sites')
        url.searchParams.set('id', siteId)

        mockDb.select.mockResolvedValue([existingSite])

        const request = createMockRequest(url.toString(), { method: 'DELETE' })

        const response = await DELETE(request)
        expect(response.status).toBe(200)

        const body = await response.json()
        expect(body.success).toBe(true)
      })
    })

    describe('Site Deletion', () => {
      beforeEach(() => {
        mockAuth.mockReturnValue({ userId: mockSuperAdminId })
        mockClerkClient.users.getUser.mockResolvedValue(mockSuperAdminUser as any)
      })

      test('should perform soft delete by setting isActive to false', async () => {
        const siteId = 'site123'
        const existingSite = createMockSite({ id: siteId, isActive: true })

        const url = new URL('http://localhost/api/admin/sites')
        url.searchParams.set('id', siteId)

        mockDb.select.mockResolvedValue([existingSite])

        const request = createMockRequest(url.toString(), { method: 'DELETE' })

        await DELETE(request)

        expect(mockDb.update).toHaveBeenCalled()
        expect(mockDb.set).toHaveBeenCalledWith({
          isActive: false,
          updatedAt: expect.any(Date)
        })
      })

      test('should return 400 when site ID is missing', async () => {
        const request = createMockRequest('http://localhost/api/admin/sites', { method: 'DELETE' })

        const response = await DELETE(request)
        expect(response.status).toBe(400)

        const body = await response.json()
        expect(body.error).toBe('Site ID required')
      })

      test('should return 404 when site does not exist', async () => {
        const url = new URL('http://localhost/api/admin/sites')
        url.searchParams.set('id', 'nonexistent-site')

        mockDb.select.mockResolvedValue([]) // Site not found

        const request = createMockRequest(url.toString(), { method: 'DELETE' })

        const response = await DELETE(request)
        expect(response.status).toBe(404)

        const body = await response.json()
        expect(body.error).toBe(TEST_ERRORS.SITE_NOT_FOUND)
      })

      test('should log deletion action', async () => {
        const siteId = 'site123'
        const existingSite = createMockSite({ 
          id: siteId, 
          name: 'Test Site',
          url: 'https://test.com'
        })

        const url = new URL('http://localhost/api/admin/sites')
        url.searchParams.set('id', siteId)

        mockDb.select.mockResolvedValue([existingSite])

        const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation()

        const request = createMockRequest(url.toString(), { method: 'DELETE' })

        await DELETE(request)

        expect(mockConsoleLog).toHaveBeenCalledWith(
          expect.stringContaining('ADMIN ACTION: Site "Test Site" (https://test.com) deleted by superadmin@example.com')
        )

        mockConsoleLog.mockRestore()
      })
    })
  })

  describe('General Error Handling', () => {
    test('should handle database connection failures', async () => {
      mockAuth.mockReturnValue({ userId: mockAdminId })
      mockClerkClient.users.getUser.mockRejectedValue(new Error('Database connection failed'))

      const response = await GET()
      expect(response.status).toBe(500)

      const body = await response.json()
      expect(body.error).toBe(TEST_ERRORS.FAILED_TO_FETCH_SITES)
    })

    test('should handle Clerk service outages', async () => {
      mockAuth.mockReturnValue({ userId: mockAdminId })
      mockClerkClient.users.getUser.mockRejectedValue(new Error('Clerk service unavailable'))

      const response = await GET()
      expect(response.status).toBe(500)
    })

    test('should handle malformed request data', async () => {
      mockAuth.mockReturnValue({ userId: mockAdminId })
      mockClerkClient.users.getUser.mockResolvedValue(mockAdminUser as any)

      // Invalid JSON in request body
      const request = new Request('http://localhost/api/admin/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"invalid": json}'
      })

      const response = await POST(request)
      expect(response.status).toBe(500)

      const body = await response.json()
      expect(body.error).toBe(TEST_ERRORS.FAILED_TO_ADD_SITE)
    })
  })
})