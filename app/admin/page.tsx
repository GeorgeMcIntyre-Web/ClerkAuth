'use client'

import { useUser } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { Navigation } from '@/components/navigation'
import { USER_ROLES, SITE_PERMISSIONS } from '@/lib/auth-config'

interface UserData {
  id: string
  clerkId: string
  email: string
  firstName: string | null
  lastName: string | null
  role: string
  createdAt: string
  lastActive: string
  siteAccess: string[]
}

export default function AdminPanel() {
  const { user, isLoaded } = useUser()
  const [users, setUsers] = useState<UserData[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)
  const [showPermissionModal, setShowPermissionModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [usersPerPage] = useState(10)
  const [showAuditLog, setShowAuditLog] = useState(false)

  // Check if current user is admin
  useEffect(() => {
    if (isLoaded && user) {
      const userRole = user.publicMetadata?.role as string
      if (userRole !== USER_ROLES.ADMIN && userRole !== USER_ROLES.SUPER_ADMIN) {
        window.location.href = '/dashboard'
      }
    }
  }, [isLoaded, user])

  // Fetch all users
  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      if (response.ok) {
        const userData = await response.json()
        setUsers(userData)
        setFilteredUsers(userData)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter and search users
  useEffect(() => {
    let filtered = users
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    // Apply role filter
    if (roleFilter) {
      filtered = filtered.filter(user => user.role === roleFilter)
    }
    
    setFilteredUsers(filtered)
    setCurrentPage(1) // Reset to first page when filters change
  }, [users, searchTerm, roleFilter])

  const updateUserRole = async (userId: string, newRole: string) => {
    // Security: Prevent self-modification
    if (user?.id === userId) {
      alert('🚫 You cannot modify your own role for security reasons.')
      return
    }
    
    // Find the target user
    const targetUser = users.find(u => u.clerkId === userId)
    if (!targetUser) return
    
    // Security: Prevent demoting the last super admin
    const currentUserRole = user?.publicMetadata?.role as string
    const superAdmins = users.filter(u => u.role === USER_ROLES.SUPER_ADMIN)
    
    if (targetUser.role === USER_ROLES.SUPER_ADMIN && superAdmins.length === 1 && newRole !== USER_ROLES.SUPER_ADMIN) {
      alert('🚫 Cannot demote the last Super Admin. Promote another user first.')
      return
    }
    
    // Security: Only super admins can create other super admins
    if (newRole === USER_ROLES.SUPER_ADMIN && currentUserRole !== USER_ROLES.SUPER_ADMIN) {
      alert('🚫 Only Super Admins can promote users to Super Admin.')
      return
    }
    
    // Confirmation for critical role changes
    const isDowngrade = getRolePriority(newRole) < getRolePriority(targetUser.role)
    const confirmMessage = isDowngrade 
      ? `⚠️ Downgrade ${targetUser.firstName} ${targetUser.lastName} from ${targetUser.role} to ${newRole}?\n\nThis will remove their current permissions.`
      : `Promote ${targetUser.firstName} ${targetUser.lastName} to ${newRole}?`
      
    if (!confirm(confirmMessage)) return
    
    try {
      const response = await fetch('/api/admin/users/update-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId, 
          role: newRole,
          auditLog: {
            action: 'role_change',
            from: targetUser.role,
            to: newRole,
            adminId: user?.id,
            timestamp: new Date().toISOString()
          }
        })
      })
      
      if (response.ok) {
        fetchUsers() // Refresh user list
        alert('✅ User role updated successfully!')
        logAuditEvent('role_change', `Changed ${targetUser.email} role from ${targetUser.role} to ${newRole}`)
      } else {
        const error = await response.json()
        alert(`❌ Failed to update user role: ${error.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error updating user role:', error)
      alert('❌ Error updating user role. Please try again.')
    }
  }

  const updateSiteAccess = async (userId: string, sitePermissions: string[]) => {
    const targetUser = users.find(u => u.clerkId === userId)
    if (!targetUser) return
    
    // Validate permissions
    const invalidPermissions = sitePermissions.filter(perm => !isValidPermission(perm))
    if (invalidPermissions.length > 0) {
      alert(`❌ Invalid permissions detected: ${invalidPermissions.join(', ')}`)
      return
    }
    
    try {
      const response = await fetch('/api/admin/users/update-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId, 
          siteAccess: sitePermissions,
          auditLog: {
            action: 'permissions_change',
            userId: targetUser.id,
            permissions: sitePermissions,
            adminId: user?.id,
            timestamp: new Date().toISOString()
          }
        })
      })
      
      if (response.ok) {
        fetchUsers()
        setShowPermissionModal(false)
        alert('✅ Site access updated successfully!')
        logAuditEvent('permissions_change', `Updated permissions for ${targetUser.email}`)
      } else {
        const error = await response.json()
        alert(`❌ Failed to update site access: ${error.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error updating site access:', error)
      alert('❌ Error updating site access. Please try again.')
    }
  }

  // Helper functions
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case USER_ROLES.SUPER_ADMIN: return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case USER_ROLES.ADMIN: return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case USER_ROLES.PREMIUM: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case USER_ROLES.STANDARD: return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    }
  }
  
  const getRolePriority = (role: string): number => {
    switch (role) {
      case USER_ROLES.SUPER_ADMIN: return 5
      case USER_ROLES.ADMIN: return 4
      case USER_ROLES.PREMIUM: return 3
      case USER_ROLES.STANDARD: return 2
      case USER_ROLES.GUEST: return 1
      default: return 0
    }
  }
  
  const isValidPermission = (permission: string): boolean => {
    // Basic validation - can be expanded
    if (permission.startsWith('http://')) return false // Require HTTPS
    if (permission.includes('<script')) return false // Prevent XSS
    if (permission.length > 200) return false // Reasonable length limit
    return true
  }
  
  const logAuditEvent = async (action: string, details: string) => {
    try {
      await fetch('/api/admin/audit-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          details,
          adminId: user?.id,
          adminEmail: user?.emailAddresses[0]?.emailAddress,
          timestamp: new Date().toISOString()
        })
      })
    } catch (error) {
      console.error('Failed to log audit event:', error)
    }
  }
  
  // Pagination logic
  const indexOfLastUser = currentPage * usersPerPage
  const indexOfFirstUser = indexOfLastUser - usersPerPage
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser)
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage)
  
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber)

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation currentPage="admin" />
      
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">NitroAuth Admin Panel</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">Manage users, roles, and site access permissions</p>
              </div>
              <div className="flex space-x-3">
                <a
                  href="/dashboard"
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  ← Dashboard
                </a>
              </div>
            </div>
          </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Users</h3>
            <p className="text-3xl font-bold text-blue-600">{users.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Admins</h3>
            <p className="text-3xl font-bold text-purple-600">
              {users.filter(u => u.role === USER_ROLES.ADMIN || u.role === USER_ROLES.SUPER_ADMIN).length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Premium Users</h3>
            <p className="text-3xl font-bold text-yellow-600">
              {users.filter(u => u.role === USER_ROLES.PREMIUM).length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Standard Users</h3>
            <p className="text-3xl font-bold text-green-600">
              {users.filter(u => u.role === USER_ROLES.STANDARD).length}
            </p>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">All Users</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Site Access
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Active
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((userData) => (
                  <tr key={userData.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {userData.firstName} {userData.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{userData.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={userData.role}
                        onChange={(e) => updateUserRole(userData.clerkId, e.target.value)}
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(userData.role)}`}
                      >
                        {Object.values(USER_ROLES).map((role) => (
                          <option key={role} value={role}>
                            {role.replace('_', ' ').toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {userData.siteAccess?.length || 0} sites
                      </div>
                      <button
                        onClick={() => {
                          setSelectedUser(userData)
                          setShowPermissionModal(true)
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Manage Access
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(userData.lastActive).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedUser(userData)
                          setShowPermissionModal(true)
                        }}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        Edit
                      </button>
                      <button className="text-red-600 hover:text-red-900">
                        Suspend
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Permission Modal */}
        {showPermissionModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-2xl w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">
                Manage Site Access - {selectedUser.firstName} {selectedUser.lastName}
              </h3>
              
              <div className="space-y-6">
                {/* Quick Site Access Templates */}
                <div className="border-b pb-4">
                  <h4 className="font-medium text-gray-900 mb-3">Quick Access Templates</h4>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setSelectedUser({
                          ...selectedUser,
                          siteAccess: [SITE_PERMISSIONS.HOUSE_ATREIDES, SITE_PERMISSIONS.PREMIUM_SITES]
                        })
                      }}
                      className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium hover:bg-yellow-200"
                    >
                      🏠 House Atreides Access
                    </button>
                    <button
                      onClick={() => {
                        setSelectedUser({
                          ...selectedUser,
                          siteAccess: [SITE_PERMISSIONS.STANDARD_SITES]
                        })
                      }}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium hover:bg-blue-200"
                    >
                      📊 Basic Dashboard
                    </button>
                    <button
                      onClick={() => {
                        setSelectedUser({
                          ...selectedUser,
                          siteAccess: Object.values(SITE_PERMISSIONS)
                        })
                      }}
                      className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium hover:bg-green-200"
                    >
                      🔓 All Access
                    </button>
                    <button
                      onClick={() => {
                        setSelectedUser({
                          ...selectedUser,
                          siteAccess: []
                        })
                      }}
                      className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium hover:bg-gray-200"
                    >
                      🚫 No Access
                    </button>
                  </div>
                </div>

                {/* Individual Permissions */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Individual Site Permissions</h4>
                  <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto">
                    {[
                      { key: SITE_PERMISSIONS.STANDARD_SITES, label: '📊 Standard Sites', desc: 'Basic site access' },
                      { key: SITE_PERMISSIONS.PREMIUM_SITES, label: '⭐ Premium Sites', desc: 'Access to premium external sites' },
                      { key: SITE_PERMISSIONS.HOUSE_ATREIDES, label: '🏠 House Atreides', desc: 'Direct access to houseatreides.space' },
                      { key: SITE_PERMISSIONS.ALL_SITES, label: '🌐 All Sites Access', desc: 'Universal access to all sites' },
                      { key: SITE_PERMISSIONS.NITROAUTH_ADMIN, label: '⚙️ NitroAuth Admin', desc: 'Admin panel access' },
                      { key: SITE_PERMISSIONS.ANALYTICS_SITE, label: '📈 Analytics Site', desc: 'Analytics dashboard access' },
                      { key: SITE_PERMISSIONS.CRM_SITE, label: '👥 CRM Site', desc: 'Customer management access' },
                      { key: SITE_PERMISSIONS.CUSTOM_URL_1, label: '🔗 Custom Site 1', desc: 'Custom site access' },
                      { key: SITE_PERMISSIONS.CUSTOM_URL_2, label: '🔗 Custom Site 2', desc: 'Custom site access' }
                    ].map((item) => (
                      <label key={item.key} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={selectedUser.siteAccess?.includes(item.key) || false}
                          onChange={(e) => {
                            const currentAccess = selectedUser.siteAccess || []
                            const newAccess = e.target.checked
                              ? [...currentAccess, item.key]
                              : currentAccess.filter(p => p !== item.key)
                            
                            setSelectedUser({
                              ...selectedUser,
                              siteAccess: newAccess
                            })
                          }}
                          className="mt-1 rounded border-gray-300"
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {item.label}
                          </div>
                          <div className="text-xs text-gray-500">
                            {item.desc}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowPermissionModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => updateSiteAccess(selectedUser.clerkId, selectedUser.siteAccess || [])}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Update Access
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}