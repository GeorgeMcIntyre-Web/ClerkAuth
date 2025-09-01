'use client'

import { useUser } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { USER_ROLES } from '@/lib/auth-config'

interface Site {
  id: string
  name: string
  url: string
  description?: string
  category: 'premium' | 'standard' | 'admin'
  createdAt: string
}

interface UserAccess {
  userId: string
  userName: string
  email: string
  accessibleSites: string[]
}

export default function SitesAdmin() {
  const { user, isLoaded } = useUser()
  const [sites, setSites] = useState<Site[]>([])
  const [userAccess, setUserAccess] = useState<UserAccess[]>([])
  const [showAddSite, setShowAddSite] = useState(false)
  const [newSite, setNewSite] = useState({
    name: '',
    url: '',
    description: '',
    category: 'standard' as 'premium' | 'standard' | 'admin'
  })

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
    loadSites()
    loadUserAccess()
  }, [])

  const loadSites = async () => {
    try {
      const response = await fetch('/api/admin/sites')
      if (response.ok) {
        const data = await response.json()
        setSites(data)
      }
    } catch (error) {
      console.error('Failed to load sites:', error)
    }
  }

  const loadUserAccess = async () => {
    try {
      const response = await fetch('/api/admin/users')
      if (response.ok) {
        const users = await response.json()
        setUserAccess(users.map((u: any) => ({
          userId: u.clerkId,
          userName: `${u.firstName} ${u.lastName}`,
          email: u.email,
          accessibleSites: u.siteAccess || []
        })))
      }
    } catch (error) {
      console.error('Failed to load user access:', error)
    }
  }

  const addSite = async () => {
    if (!newSite.name || !newSite.url) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const response = await fetch('/api/admin/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSite)
      })

      if (response.ok) {
        loadSites()
        setShowAddSite(false)
        setNewSite({ name: '', url: '', description: '', category: 'standard' })
        alert('Site added successfully!')
      } else {
        alert('Failed to add site')
      }
    } catch (error) {
      console.error('Error adding site:', error)
      alert('Error adding site')
    }
  }

  const grantUserAccess = async (userId: string, siteUrl: string) => {
    try {
      const user = userAccess.find(u => u.userId === userId)
      if (!user) return

      const newAccess = [...user.accessibleSites, siteUrl]
      
      const response = await fetch('/api/admin/users/update-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, siteAccess: newAccess })
      })

      if (response.ok) {
        loadUserAccess()
        alert('Access granted!')
      } else {
        alert('Failed to grant access')
      }
    } catch (error) {
      console.error('Error granting access:', error)
    }
  }

  const revokeUserAccess = async (userId: string, siteUrl: string) => {
    try {
      const user = userAccess.find(u => u.userId === userId)
      if (!user) return

      const newAccess = user.accessibleSites.filter(site => site !== siteUrl)
      
      const response = await fetch('/api/admin/users/update-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, siteAccess: newAccess })
      })

      if (response.ok) {
        loadUserAccess()
        alert('Access revoked!')
      } else {
        alert('Failed to revoke access')
      }
    } catch (error) {
      console.error('Error revoking access:', error)
    }
  }

  if (!isLoaded) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Site Management</h1>
            <p className="text-gray-600 mt-2">Add websites and manage user access to any URL</p>
          </div>
          <button
            onClick={() => setShowAddSite(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Add New Site
          </button>
        </div>

        {/* Sites List */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Registered Sites</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Site</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">URL</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Users with Access</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sites.map((site) => (
                  <tr key={site.id}>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{site.name}</div>
                        <div className="text-sm text-gray-500">{site.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <a href={site.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {site.url}
                      </a>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        site.category === 'premium' ? 'bg-yellow-100 text-yellow-800' :
                        site.category === 'admin' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {site.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {userAccess
                          .filter(u => u.accessibleSites.includes(site.url))
                          .map(u => (
                            <span key={u.userId} className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                              {u.userName}
                            </span>
                          ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Access Management */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">User Access Management</h2>
          </div>
          <div className="p-6">
            {userAccess.map((user) => (
              <div key={user.userId} className="mb-6 p-4 border rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h3 className="font-medium">{user.userName}</h3>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                  <span className="text-sm text-gray-500">
                    {user.accessibleSites.length} sites
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sites.map((site) => {
                    const hasAccess = user.accessibleSites.includes(site.url)
                    return (
                      <div key={site.id} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <div className="text-sm font-medium">{site.name}</div>
                          <div className="text-xs text-gray-500">{site.category}</div>
                        </div>
                        <button
                          onClick={() => hasAccess 
                            ? revokeUserAccess(user.userId, site.url)
                            : grantUserAccess(user.userId, site.url)
                          }
                          className={`px-3 py-1 text-xs rounded ${
                            hasAccess
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {hasAccess ? 'Revoke' : 'Grant'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add Site Modal */}
        {showAddSite && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Add New Site</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Site Name *</label>
                  <input
                    type="text"
                    value={newSite.name}
                    onChange={(e) => setNewSite({...newSite, name: e.target.value})}
                    className="w-full border rounded-md px-3 py-2"
                    placeholder="My Awesome Site"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Site URL *</label>
                  <input
                    type="url"
                    value={newSite.url}
                    onChange={(e) => setNewSite({...newSite, url: e.target.value})}
                    className="w-full border rounded-md px-3 py-2"
                    placeholder="https://www.myawesomesite.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <input
                    type="text"
                    value={newSite.description}
                    onChange={(e) => setNewSite({...newSite, description: e.target.value})}
                    className="w-full border rounded-md px-3 py-2"
                    placeholder="Premium content site"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Category</label>
                  <select
                    value={newSite.category}
                    onChange={(e) => setNewSite({...newSite, category: e.target.value as any})}
                    className="w-full border rounded-md px-3 py-2"
                  >
                    <option value="standard">Standard</option>
                    <option value="premium">Premium</option>
                    <option value="admin">Admin Only</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddSite(false)}
                  className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={addSite}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add Site
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}