export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="w-20 h-6 bg-gray-300 rounded animate-pulse"></div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-32 h-6 bg-gray-300 rounded animate-pulse"></div>
              <div className="w-8 h-8 bg-gray-300 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="w-48 h-8 bg-gray-300 rounded animate-pulse mb-2"></div>
          <div className="w-64 h-4 bg-gray-300 rounded animate-pulse"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="w-32 h-6 bg-gray-300 rounded animate-pulse mb-4"></div>
              <div className="space-y-3">
                <div className="w-full h-4 bg-gray-300 rounded animate-pulse"></div>
                <div className="w-3/4 h-4 bg-gray-300 rounded animate-pulse"></div>
                <div className="w-1/2 h-4 bg-gray-300 rounded animate-pulse"></div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="w-32 h-6 bg-gray-300 rounded animate-pulse"></div>
                  <div className="w-24 h-8 bg-gray-300 rounded animate-pulse"></div>
                </div>
                <div className="space-y-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="w-3/4 h-6 bg-gray-300 rounded animate-pulse mb-2"></div>
                    <div className="w-full h-4 bg-gray-300 rounded animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}