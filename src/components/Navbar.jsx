import React from 'react'
import { Link, useLocation } from 'react-router-dom'

export default function Navbar() {
  const location = useLocation()

  // ログイン画面ではボトムナビゲーションを表示しない
  if (location.pathname === '/login') return null

  // 現在のページに応じてアクティブ状態を判別
  const isActive = (path) => location.pathname === path ? 'text-primary fw-bold' : 'text-secondary'

  return (
    <nav className="navbar fixed-bottom navbar-light bg-white border-top shadow-sm py-2">
      <div className="container d-flex justify-content-around text-center">
        <Link to="/" className={`text-decoration-none ${isActive('/')}`}>
          <div className="fs-5">📜</div>
          <small style={{ fontSize: '0.75rem' }}>履歴</small>
        </Link>
        <Link to="/divination/new" className={`text-decoration-none ${isActive('/divination/new')}`}>
          <div className="fs-5">🔮</div>
          <small style={{ fontSize: '0.75rem' }}>新規占い</small>
        </Link>
        <Link to="/settings/prompts" className={`text-decoration-none ${isActive('/settings/prompts')}`}>
          <div className="fs-5">⚙️</div>
          <small style={{ fontSize: '0.75rem' }}>設定</small>
        </Link>
      </div>
    </nav>
  )
}