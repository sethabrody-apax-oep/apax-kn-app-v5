import React, { useState } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { Users, Calendar, Settings, LogOut, Key, Hotel, Utensils, Grid3X3, Building } from 'lucide-react'
import { FileCheck } from 'lucide-react'
import { useAdminAuth } from '../hooks/useAdminAuth'
import AdminLogin from './admin/AdminLogin'
import AttendeeManagement from './admin/AttendeeManagement'
import AgendaManagement from './admin/AgendaManagement'
import DiningManagement from './admin/DiningManagement'
import HotelManagement from './admin/HotelManagement'
import SeatingManagement from './admin/SeatingManagement'
import CompanyManagement from './admin/CompanyManagement'
import IDLoomReviewPanel from './admin/IDLoomReviewPanel'
import EventAnalytics from './admin/EventAnalytics'

export default function AdminPanel() {
  const { isAuthenticated, currentUser, loading, signOut, setAdminUser } = useAdminAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogin = (user?: any) => {
    setAdminUser(user)
    navigate('/attendees')
  }

  const handleLogout = async () => {
    await signOut()
    navigate('/')
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy"></div>
          <span className="text-brand-navy">Loading...</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <AdminLogin onLogin={handleLogin} />
  }

  const navItems = [
    { path: '/attendees', icon: Users, label: 'Attendees' },
    { path: '/agenda', icon: Calendar, label: 'Agenda' },
    { path: '/dining', icon: Utensils, label: 'Dining' },
    { path: '/seating', icon: Grid3X3, label: 'Seating' },
    { path: '/companies', icon: Building, label: 'Companies' },
    { path: '/hotels', icon: Hotel, label: 'Hotels' },
    { path: '/analytics', icon: FileCheck, label: 'Analytics' }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-brand-navy rounded-full flex items-center justify-center">
              <Settings className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-brand-navy">KnowledgeNow Administration Tools</h1>
              <p className="text-xs text-brand-gray">
                Welcome, {currentUser?.firstName || currentUser?.email || 'Admin User'}
                {currentUser?.role && (
                  <span className="ml-2 inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                    {currentUser.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleLogout}
              className="p-2 text-brand-gray hover:text-brand-navy transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex space-x-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-navy text-white'
                    : 'text-brand-gray hover:text-brand-navy hover:bg-gray-50'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span className="text-sm font-semibold">{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      <main className="p-6">
        <Routes>
          <Route path="/" element={<AttendeeManagement />} />
          <Route path="/login" element={<AttendeeManagement />} />
          <Route path="/attendees" element={<AttendeeManagement />} />
          <Route path="/agenda" element={<AgendaManagement />} />
          <Route path="/dining" element={<DiningManagement />} />
          <Route path="/seating" element={<SeatingManagement />} />
          <Route path="/companies" element={<CompanyManagement />} />
          <Route path="/hotels" element={<HotelManagement />} />
          <Route path="/idloom-review" element={<IDLoomReviewPanel />} />
          <Route path="/analytics" element={<EventAnalytics />} />
        </Routes>
      </main>
    </div>
  )
}