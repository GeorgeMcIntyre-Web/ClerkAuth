import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { USER_ROLES } from '@/lib/auth-config'

export default async function Dashboard() {
  const { userId } = auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  const user = await currentUser()
  if (!user) {
    redirect('/sign-in')
  }

  // Check if user is admin (simplified - no database dependency)
  const userRole = (user.publicMetadata?.role as string) || USER_ROLES.GUEST
  const isAdmin = userRole === USER_ROLES.ADMIN || userRole === USER_ROLES.SUPER_ADMIN

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-xl font-bold text-blue-600">
                NitroAuth
              </Link>
              {isAdmin && (
                <Link 
                  href="/admin" 
                  className="px-3 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700"
                >
                  Admin Panel
                </Link>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">
                Welcome, {user?.firstName || 'User'}!
              </span>
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">NitroAuth Dashboard</h1>
          <p className="text-gray-600 mt-2">Centralized Authentication Hub</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* User Info Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Your Profile
              </h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="text-sm text-gray-900">{user?.emailAddresses[0]?.emailAddress}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Name</dt>
                  <dd className="text-sm text-gray-900">{user?.firstName} {user?.lastName}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Role</dt>
                  <dd className="text-sm text-gray-900">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      userRole === USER_ROLES.SUPER_ADMIN ? 'bg-red-100 text-red-800' :
                      userRole === USER_ROLES.ADMIN ? 'bg-purple-100 text-purple-800' :
                      userRole === USER_ROLES.PREMIUM ? 'bg-yellow-100 text-yellow-800' :
                      userRole === USER_ROLES.STANDARD ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {userRole.replace('_', ' ').toUpperCase()}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Member since</dt>
                  <dd className="text-sm text-gray-900">
                    {new Date(user?.createdAt || 0).toLocaleDateString()}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Quick Actions
              </h3>
              <div className="space-y-3">
                {!isAdmin && (
                  <div className="text-center py-8">
                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                      🔒 Access Restricted
                    </h4>
                    <p className="text-gray-600 mb-4">
                      Contact admin to request access to additional sites and tools.
                    </p>
                  </div>
                )}
                
                {isAdmin && (
                  <>
                    <Link 
                      href="/admin"
                      className="block w-full text-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
                    >
                      Manage Users & Permissions
                    </Link>
                    <button 
                      onClick={() => window.open('/api/admin/setup', '_blank')}
                      className="block w-full text-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Setup Super Admin (First Time)
                    </button>
                  </>
                )}
                
                <div className="text-center pt-4">
                  <p className="text-sm text-gray-500">
                    Your current role: <strong>{userRole.replace('_', ' ')}</strong>
                  </p>
                  {userRole === USER_ROLES.GUEST && (
                    <p className="text-xs text-red-600 mt-1">
                      Limited access - contact admin for promotion
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Setup Instructions */}
        {userRole === USER_ROLES.GUEST && (
          <div className="mt-8 bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-yellow-800 mb-3">
                  <strong>First time setup?</strong> Click the button below to make yourself Super Admin,
                  then refresh this page to access the Admin Panel.
                </p>
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/admin/setup', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                      })
                      const result = await response.json()
                      if (result.success) {
                        alert('Success! You are now a Super Admin. Please refresh the page.')
                        window.location.reload()
                      } else {
                        alert('Error: ' + result.error)
                      }
                    } catch (error) {
                      alert('Setup failed: ' + error)
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                >
                  Make Me Super Admin
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}