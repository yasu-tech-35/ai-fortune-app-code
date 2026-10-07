import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import DivinationNew from './pages/DivinationNew'
import DivinationDetail from './pages/DivinationDetail'
import PromptSettings from './pages/PromptSettings'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ paddingBottom: '70px' }}>
        <Routes>
          {/* 公開ルート */}
          <Route path="/login" element={<Login />} />

          {/* 保護されたルート（未ログイン時は /login に自動移動） */}
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/divination/new" element={<ProtectedRoute><DivinationNew /></ProtectedRoute>} />
          <Route path="/divination/:id" element={<ProtectedRoute><DivinationDetail /></ProtectedRoute>} />
          <Route path="/settings/prompts" element={<ProtectedRoute><PromptSettings /></ProtectedRoute>} />
        </Routes>
      </div>
      <Navbar />
    </BrowserRouter>
  )
}