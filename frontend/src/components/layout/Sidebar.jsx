import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  IoGridOutline,
  IoDocumentTextOutline,
  IoReceiptOutline,
  IoCubeOutline,
  IoPeopleOutline,
  IoLogOutOutline,
} from 'react-icons/io5'
import { useAuth } from '../../hooks/useAuth'

const navItems = [
  { label: 'Dashboard', to: '/dashboard', icon: IoGridOutline },
  { label: 'Purchase Orders', to: '/purchase-orders', icon: IoDocumentTextOutline },
  { label: 'Invoices', to: '/invoices', icon: IoReceiptOutline },
  { label: 'Materials', to: '/materials', icon: IoCubeOutline },
  { label: 'Suppliers', to: '/suppliers', icon: IoPeopleOutline },
]

export default function Sidebar() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className="fixed top-0 left-0 h-screen w-64 bg-white border-r border-gray-100 flex flex-col z-30">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-100">
        <span className="text-primary-green font-bold text-lg tracking-tight">CrossVal</span>
        <p className="text-xs text-gray-400 mt-0.5">Inventory Management</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-0.5">
          {navItems.map(({ label, to, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                    isActive
                      ? 'bg-secondary-green text-primary-green border-l-2 border-primary-green'
                      : 'text-gray-600 hover:bg-primary-gray-light hover:text-gray-900'
                  }`
                }
              >
                <Icon className="text-lg flex-shrink-0" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 w-full transition-colors duration-150"
        >
          <IoLogOutOutline className="text-lg flex-shrink-0" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
