import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Navigation } from '@/components/navigation'
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

  const userRole = (user.publicMetadata?.role as string) || USER_ROLES.GUEST
  const isAdmin = userRole === USER_ROLES.ADMIN || userRole === USER_ROLES.SUPER_ADMIN

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation showAdminLink={isAdmin} currentPage="dashboard" />

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">NitroAuth Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Centralized Authentication Hub</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* User Info Card */}
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                Your Profile
              </h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</dt>
                  <dd className="text-sm text-gray-900 dark:text-white">{user?.emailAddresses[0]?.emailAddress}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</dt>
                  <dd className="text-sm text-gray-900 dark:text-white">{user?.firstName} {user?.lastName}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Role</dt>
                  <dd className="text-sm text-gray-900 dark:text-white">
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
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Member since</dt>
                  <dd className="text-sm text-gray-900 dark:text-white">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                Quick Actions
              </h3>
              <div className="space-y-3">
                {!isAdmin && (
                  <div className="text-center py-8">
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      🔒 Access Restricted
                    </h4>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Contact admin to request access to additional sites and tools.
                    </p>
                  </div>
                )}
                
                {isAdmin && (
                  <div>
                    <Link 
                      href="/admin"
                      className="block w-full text-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 transition-colors"
                    >
                      Manage Users & Permissions
                    </Link>
                  </div>
                )}
                
                <div className="text-center pt-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Your current role: <strong>{userRole.replace('_', ' ')}</strong>
                  </p>
                  {userRole === USER_ROLES.GUEST && (
                    <div>
                      <p className="text-xs text-red-600 mt-1">
                        Limited access - contact admin for promotion
                      </p>
                      <a 
                        href="/setup-admin" 
                        className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
                      >
                        First time? Setup admin access
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}