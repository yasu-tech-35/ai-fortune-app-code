import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider 
} from 'firebase/auth'
import { auth } from '../firebase'

export default function Login() {
  const navigate = useNavigate()
  const [isRegister, setIsRegister] = useState(false) // ログイン / 新規登録の切り替え状態
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // メール/パスワードによる認証処理
  const handleAuth = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isRegister) {
        // 新規アカウント作成
        await createUserWithEmailAndPassword(auth, email, password)
      } else {
        // 既存ユーザーのログイン
        await signInWithEmailAndPassword(auth, email, password)
      }
      navigate('/') // 成功したらダッシュボードへ遷移
    } catch (err) {
      console.error(err)
      if (err.code === 'auth/email-already-in-use') {
        setError('このメールアドレスは既に登録されています。')
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError('メールアドレスまたはパスワードが正しくありません。')
      } else if (err.code === 'auth/weak-password') {
        setError('パスワードは6文字以上で設定してください。')
      } else {
        setError('認証に失敗しました: ' + err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  // Google ポップアップログイン処理
  const handleGoogleLogin = async () => {
    setError('')
    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
      navigate('/')
    } catch (err) {
      console.error(err)
      setError('Googleログインに失敗しました: ' + err.message)
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: '420px' }}>
      <div className="card p-4 shadow-sm border-0 rounded-3">
        <h2 className="text-center h4 mb-3 fw-bold text-primary">
          🔮 AI占いアプリ
        </h2>
        <h3 className="text-center h6 mb-4 text-muted">
          {isRegister ? '新規アカウント登録' : 'ログイン'}
        </h3>

        {error && (
          <div className="alert alert-danger py-2 small" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth}>
          <div className="mb-3">
            <label className="form-label small fw-bold">メールアドレス</label>
            <input
              type="email"
              className="form-control"
              required
              placeholder="example@mail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="mb-3">
            <label className="form-label small fw-bold">パスワード</label>
            <input
              type="password"
              className="form-control"
              required
              placeholder="6文字以上のパスワード"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-100 py-2 mb-3 fw-bold"
            disabled={loading}
          >
            {loading ? '処理中...' : isRegister ? '登録する' : 'ログイン'}
          </button>
        </form>

        <div className="d-flex align-items-center my-3">
          <hr className="flex-grow-1" />
          <span className="px-2 text-muted small">または</span>
          <hr className="flex-grow-1" />
        </div>

        <button
          type="button"
          className="btn btn-outline-danger w-100 py-2 mb-3 d-flex align-items-center justify-content-center gap-2 fw-bold"
          onClick={handleGoogleLogin}
        >
          <span>G</span> Googleでログイン
        </button>

        <div className="text-center mt-2">
          <button
            type="button"
            className="btn btn-link btn-sm text-decoration-none"
            onClick={() => {
              setIsRegister(!isRegister)
              setError('')
            }}
          >
            {isRegister
              ? 'すでにアカウントをお持ちの方はこちら (ログイン)'
              : 'アカウントをお持ちでない方はこちら (新規登録)'}
          </button>
        </div>
      </div>
    </div>
  )
}