import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getDb } from '@/lib/db'
import { users, posts, type Post } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'

export default async function Dashboard() {
  const { userId } = auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  const user = await currentUser()
  const db = getDb()
  
  // Get or create user in database
  let dbUser = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1)
  
  if (dbUser.length === 0 && user) {
    // Create user in database
    await db.insert(users).values({
      clerkId: userId,
      email: user.emailAddresses[0]?.emailAddress || '',
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
    })
    
    dbUser = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1)
  }

  // Get user's posts
  const userPosts = await db
    .select()
    .from(posts)
    .where(eq(posts.authorId, dbUser[0].id))
    .orderBy(posts.createdAt)

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-blue-600">
                Home
              </Link>
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
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage your account and posts</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* User Info Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Profile Information
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
                  <dt className="text-sm font-medium text-gray-500">Member since</dt>
                  <dd className="text-sm text-gray-900">
                    {new Date(user?.createdAt || 0).toLocaleDateString()}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Posts Section */}
          <div className="lg:col-span-2">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Your Posts ({userPosts.length})
                  </h3>
                  <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                    New Post
                  </button>
                </div>
                
                {userPosts.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    You haven&apos;t created any posts yet.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {userPosts.map((post: Post) => (
                      <div key={post.id} className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900">{post.title}</h4>
                        {post.content && (
                          <p className="text-gray-600 mt-2 line-clamp-3">{post.content}</p>
                        )}
                        <div className="mt-3 flex justify-between items-center text-sm text-gray-500">
                          <span>
                            {post.published ? (
                              <span className="text-green-600 font-medium">Published</span>
                            ) : (
                              <span className="text-yellow-600 font-medium">Draft</span>
                            )}
                          </span>
                          <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* API Testing Section */}
        <div className="mt-8 bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              API Testing
            </h3>
            <p className="text-gray-600 mb-4">
              Test the protected API endpoints:
            </p>
            <div className="space-x-4">
              <button 
                onClick={() => fetch('/api/protected/user').then(r => r.json()).then(console.log)}
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              >
                Test User API
              </button>
              <button 
                onClick={() => fetch('/api/protected/posts').then(r => r.json()).then(console.log)}
                className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
              >
                Test Posts API
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Check the browser console for API responses
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}