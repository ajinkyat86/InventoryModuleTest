import React from 'react'
import Sidebar from './Sidebar'

export default function Layout({ children }) {
  return (
    <div className="flex min-h-screen bg-primary-gray-light">
      <Sidebar />
      <main className="flex-1 ml-64 min-h-screen overflow-y-auto">
        <div className="max-w-7xl mx-auto px-8 py-6">
          {children}
        </div>
      </main>
    </div>
  )
}
