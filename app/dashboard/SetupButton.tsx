'use client'

export default function SetupButton() {
  const handleSetup = async () => {
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
  }

  return (
    <button
      onClick={handleSetup}
      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
    >
      Make Me Super Admin
    </button>
  )
}