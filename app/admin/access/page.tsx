'use client'

import { useUser } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { USER_ROLES } from '@/lib/auth-config'

interface User {
  id: string
  clerkId: string
  email: string
  firstName: string | null
  lastName: string | null
  role: string
  siteAccess: string[]
}

export default function DynamicAccessManager() {
  const { user, isLoaded } = useUser()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [newPermission, setNewPermission] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')

  // Check if current user is admin
  useEffect(() => {
    if (isLoaded && user) {
      const userRole = user.publicMetadata?.role as string
      if (userRole !== USER_ROLES.ADMIN && userRole !== USER_ROLES.SUPER_ADMIN) {
        window.location.href = '/dashboard'
      }
    }
  }, [isLoaded, user])

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      if (response.ok) {
        const userData = await response.json()
        setUsers(userData)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  const grantSiteAccess = async (userId: string, newSiteAccess: string) => {
    try {
      const user = users.find(u => u.clerkId === userId)
      if (!user) return

      const updatedAccess = [...(user.siteAccess || []), newSiteAccess]
      
      const response = await fetch('/api/admin/users/update-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, siteAccess: updatedAccess })
      })

      if (response.ok) {
        fetchUsers()
        setNewPermission('')
        alert(`✅ Access granted to ${newSiteAccess}`)
      } else {
        alert('❌ Failed to grant access')
      }
    } catch (error) {
      console.error('Error granting access:', error)
    }
  }

  const revokeSiteAccess = async (userId: string, siteAccessToRemove: string) => {
    try {
      const user = users.find(u => u.clerkId === userId)
      if (!user) return

      const updatedAccess = (user.siteAccess || []).filter(access => access !== siteAccessToRemove)
      
      const response = await fetch('/api/admin/users/update-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, siteAccess: updatedAccess })
      })

      if (response.ok) {
        fetchUsers()
        alert(`✅ Access revoked from ${siteAccessToRemove}`)
      } else {
        alert('❌ Failed to revoke access')
      }
    } catch (error) {
      console.error('Error revoking access:', error)
    }
  }

  const quickGrantAccess = (userId: string, accessType: string) => {
    const accessMappings: Record<string, string> = {
      'all_sites': 'all_sites',
      'premium_sites': 'premium_sites', 
      'standard_sites': 'standard_sites',
      'admin_access': 'admin_access'
    }
    
    grantSiteAccess(userId, accessMappings[accessType])
  }

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading access manager...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Universal Access Manager</h1>
              <p className="text-gray-600 mt-2">Grant access to any application dynamically</p>
            </div>
            <a
              href="/admin"
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              ← Back to Admin
            </a>
          </div>
        </div>

        {/* Quick Grant Access Form */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Grant New Site Access</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select User</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full border rounded-md px-3 py-2"
              >
                <option value="">Choose user...</option>
                {users.map(user => (
                  <option key={user.clerkId} value={user.clerkId}>
                    {user.firstName} {user.lastName} ({user.email})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Site/URL/Permission</label>
              <input
                type="text"
                value={newPermission}
                onChange={(e) => setNewPermission(e.target.value)}
                placeholder="example.com, myapp, https://site.com, etc."
                className="w-full border rounded-md px-3 py-2"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  if (selectedUserId && newPermission) {
                    grantSiteAccess(selectedUserId, newPermission)
                  } else {
                    alert('Please select a user and enter a permission')
                  }
                }}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Grant Access
              </button>
            </div>
          </div>
          
          {selectedUserId && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Quick Access Templates:</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => quickGrantAccess(selectedUserId, 'standard_sites')}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm hover:bg-blue-200"
                >
                  Standard Sites Access
                </button>
                <button
                  onClick={() => quickGrantAccess(selectedUserId, 'premium_sites')}
                  className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm hover:bg-yellow-200"
                >
                  Premium Sites Access
                </button>
                <button
                  onClick={() => quickGrantAccess(selectedUserId, 'admin_access')}
                  className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm hover:bg-red-200"
                >
                  Admin Site Access
                </button>
                <button
                  onClick={() => quickGrantAccess(selectedUserId, 'all_sites')}
                  className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm hover:bg-green-200"
                >
                  All Sites Access
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Users Access Matrix */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Current User Access</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Site Access Permissions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((userData) => (
                  <tr key={userData.clerkId}>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {userData.firstName} {userData.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{userData.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        userData.role === 'super_admin' ? 'bg-red-100 text-red-800' :
                        userData.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                        userData.role === 'premium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {userData.role.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-1">
                          {(userData.siteAccess || []).map((access, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 group"
                            >
                              {access}
                              <button
                                onClick={() => revokeSiteAccess(userData.clerkId, access)}
                                className="ml-1 hover:bg-red-100 hover:text-red-600 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Revoke access"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                          {(!userData.siteAccess || userData.siteAccess.length === 0) && (
                            <span className="text-gray-400 text-sm italic">No site access granted</span>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Usage Instructions */}
        <div className="mt-8 bg-blue-50 border-l-4 border-blue-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                💡 How Universal Access Works
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Domain Access:</strong> Grant access by domain (e.g., "example.com")</li>
                  <li><strong>App Name Access:</strong> Grant access by app name (e.g., "myapp", "blog")</li>
                  <li><strong>URL Access:</strong> Grant access to specific URLs (e.g., "https://site.com")</li>
                  <li><strong>Universal Permissions:</strong> Use "all_sites", "premium_sites", "standard_sites" for broad access</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}