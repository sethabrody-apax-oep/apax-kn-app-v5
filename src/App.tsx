import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import AdminPanel from './components/AdminPanel'


function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/*" element={<AdminPanel />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App