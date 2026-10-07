import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { collection, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { db, auth } from '../firebase'

export default function Dashboard() {
  const navigate = useNavigate()
  const [fortunes, setFortunes] = useState([])
  const [loading, setLoading] = useState(true)

  // 履歴データの読み込み
  const loadFortunes = async () => {
    const user = auth.currentUser
    if (!user) return

    try {
      // ユーザーの fortunes サブコレクションを作成日時降順で取得
      const q = query(
        collection(db, 'users', user.uid, 'fortunes'),
        orderBy('createdAt', 'desc')
      )
      const snap = await getDocs(q)
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }))
      setFortunes(list)
    } catch (err) {
      console.error('履歴取得エラー:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFortunes()
  }, [])

  // 不要履歴の削除処理
  const handleDelete = async (id, theme, e) => {
    // 親要素の Link へのイベント伝播（遷移）をストップ
    e.stopPropagation()

    if (!window.confirm(`「${theme}」の占い履歴を削除してもよろしいですか？\n削除すると元に戻せません。`)) {
      return
    }

    const user = auth.currentUser
    if (!user) return

    try {
      // Firestore からドキュメントを削除
      await deleteDoc(doc(db, 'users', user.uid, 'fortunes', id))
      
      // ローカルのステートからも除外して即時反映
      setFortunes((prev) => prev.filter((item) => item.id !== id))
    } catch (err) {
      console.error('削除エラー:', err)
      alert('削除に失敗しました: ' + err.message)
    }
  }

  // ログアウト処理
  const handleLogout = async () => {
    if (window.confirm('ログアウトしますか？')) {
      await signOut(auth)
      navigate('/login')
    }
  }

  return (
    <div className="container py-3" style={{ maxWidth: '650px' }}>
      {/* 画面ヘッダー */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2 className="h4 mb-0 fw-bold">📜 占い鑑定履歴</h2>
          <small className="text-muted">
            {auth.currentUser?.displayName || auth.currentUser?.email} 様
          </small>
        </div>
        <div className="d-flex gap-2">
          <Link to="/divination/new" className="btn btn-primary btn-sm fw-bold">
            ＋ 新規占い
          </Link>
          <button className="btn btn-outline-danger btn-sm" onClick={handleLogout}>
            ログアウト
          </button>
        </div>
      </div>

      {loading ? (
        <div className="d-flex justify-content-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">読み込み中...</span>
          </div>
        </div>
      ) : fortunes.length === 0 ? (
        <div className="text-center py-5 bg-light rounded border my-3">
          <p className="text-muted mb-3">過去の占い鑑定履歴がありません。</p>
          <Link to="/divination/new" className="btn btn-primary btn-sm fw-bold">
            さっそく最初の鑑定を行う 🔮
          </Link>
        </div>
      ) : (
        <div className="list-group shadow-sm border-0 gap-2">
          {fortunes.map((f) => (
            <div
              key={f.id}
              className="list-group-item list-group-item-action p-3 rounded-3 border d-flex justify-content-between align-items-center"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/divination/${f.id}`)}
            >
              <div className="me-2 overflow-hidden">
                <div className="d-flex align-items-center gap-2 mb-1">
                  <span className="fw-bold text-primary">{f.theme}</span>
                  {f.parentId && (
                    <span className="badge bg-info text-dark font-monospace" style={{ fontSize: '0.7rem' }}>
                      比較・派生
                    </span>
                  )}
                </div>
                <div className="small text-dark text-truncate" style={{ maxWidth: '350px' }}>
                  対象: {f.userProfile?.name || '未設定'} 様 ({f.userProfile?.birthDate || ''})
                </div>
                <div className="small text-muted mt-1 text-truncate" style={{ maxWidth: '350px' }}>
                  {f.resultText}
                </div>
                <small className="text-muted opacity-75" style={{ fontSize: '0.75rem' }}>
                  {f.createdAt?.toDate ? f.createdAt.toDate().toLocaleString() : '最近'}
                </small>
              </div>

              <button
                type="button"
                className="btn btn-outline-danger btn-sm px-2 text-nowrap align-self-center"
                onClick={(e) => handleDelete(f.id, f.theme, e)}
              >
                削除
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}