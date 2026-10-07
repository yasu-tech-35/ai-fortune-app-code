import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore'
import { db, auth } from '../firebase'
import { analyzeFortuneChat } from '../services/gemini'

export default function DivinationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [fortune, setFortune] = useState(null)
  const [loading, setLoading] = useState(true)
  const [chatInput, setChatInput] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  
  // チャットエリアを自動スクロールするための参照
  const chatBottomRef = useRef(null)

  useEffect(() => {
    async function fetchFortune() {
      const user = auth.currentUser
      if (!user) return

      try {
        const docRef = doc(db, 'users', user.uid, 'fortunes', id)
        const snap = await getDoc(docRef)
        if (snap.exists()) {
          setFortune(snap.data())
        }
      } catch (err) {
        console.error('鑑定データ取得エラー:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchFortune()
  }, [id])

  // 新しいメッセージが追加されたらチャット領域の最下部へ自動スクロール
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [fortune?.chatHistory])

  // チャット質問送信ハンドラ
  const handleSendChat = async (e) => {
    e.preventDefault()
    if (!chatInput.trim() || isAnalyzing) return

    const user = auth.currentUser
    if (!user) return

    const userQuery = chatInput.trim()
    setChatInput('')
    setIsAnalyzing(true)

    try {
      // 1. Gemini API へ元の鑑定結果と新しい質問を送信
      const aiReply = await analyzeFortuneChat(userQuery, fortune.resultText)

      // 新しい発言ペアの作成
      const newEntries = [
        { role: 'user', text: userQuery },
        { role: 'model', text: aiReply },
      ]

      // 2. Firestore の chatHistory 配列を更新 (arrayUnion)
      const docRef = doc(db, 'users', user.uid, 'fortunes', id)
      await updateDoc(docRef, {
        chatHistory: arrayUnion(...newEntries),
      })

      // 3. ローカル状態を更新して画面に即時反映
      setFortune((prev) => ({
        ...prev,
        chatHistory: [...(prev.chatHistory || []), ...newEntries],
      }))
    } catch (err) {
      console.error('チャット分析エラー:', err)
      alert('チャット応答の生成に失敗しました: ' + err.message)
    } finally {
      setIsAnalyzing(false)
    }
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">読み込み中...</span>
        </div>
      </div>
    )
  }

  if (!fortune) {
    return (
      <div className="container py-4 text-center">
        <p className="text-muted">鑑定データが見つかりませんでした。</p>
        <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/')}>
          履歴一覧へ戻る
        </button>
      </div>
    )
  }

  return (
    <div className="container py-3" style={{ maxWidth: '650px' }}>
      {/* 上部ヘッダー・アクション */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate('/')}>
          ← 履歴へ戻る
        </button>
        <button
          className="btn btn-outline-primary btn-sm fw-bold"
          onClick={() => navigate(`/divination/new?parentId=${id}`)}
        >
          🔀 この結果から分岐・再鑑定
        </button>
      </div>

      {/* 鑑定メインカード */}
      <div className="card shadow-sm border-0 rounded-3 mb-4">
        <div className="card-header bg-primary text-white py-3">
          <div className="d-flex justify-content-between align-items-center">
            <h2 className="h5 mb-0 fw-bold">{fortune.theme}</h2>
            <small className="opacity-75">
              {fortune.createdAt?.toDate ? fortune.createdAt.toDate().toLocaleDateString() : '最新'}
            </small>
          </div>
          <div className="small mt-1 opacity-90">
            相談者: {fortune.userProfile?.name} 様 ({fortune.userProfile?.birthDate})
          </div>
        </div>

        <div className="card-body">
          {fortune.parentId && (
            <div className="alert alert-light border py-2 small mb-3">
              🔗 前回の鑑定結果を引き継ぎ、比較・変化を分析したレポートです。
            </div>
          )}

          {fortune.imageUrls && fortune.imageUrls.length > 0 && (
            <div className="mb-3">
              <label className="form-label small text-muted fw-bold mb-1">登録画像</label>
              <div className="d-flex gap-2 overflow-auto py-1">
                {fortune.imageUrls.map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    alt={`鑑定画像 ${idx + 1}`}
                    className="rounded border"
                    style={{ width: '90px', height: '90px', objectFit: 'cover' }}
                  />
                ))}
              </div>
            </div>
          )}

          <label className="form-label small text-muted fw-bold mb-1">AIによる鑑定結果</label>
          <div
            className="p-3 bg-light rounded text-dark"
            style={{ whiteSpace: 'pre-wrap', lineHeight: '1.7', fontSize: '0.95rem' }}
          >
            {fortune.resultText}
          </div>
        </div>
      </div>

      {/* 対話型チャット分析カード */}
      <div className="card shadow-sm border-0 rounded-3 mb-4">
        <div className="card-header bg-white fw-bold border-bottom py-3 d-flex align-items-center gap-2">
          <span>💬</span> 鑑定結果について AI と対話・追加分析
        </div>

        {/* スクロール可能な対話ログ表示エリア */}
        <div
          className="card-body bg-light"
          style={{ maxHeight: '350px', overflowY: 'auto', fontSize: '0.9rem' }}
        >
          {(!fortune.chatHistory || fortune.chatHistory.length === 0) && (
            <p className="text-center text-muted my-3 small">
              質問を入力すると、この鑑定結果に基づいた詳しい解説や分析を受けられます。
            </p>
          )}

          {fortune.chatHistory?.map((msg, idx) => (
            <div
              key={idx}
              className={`d-flex mb-3 ${
                msg.role === 'user' ? 'justify-content-end' : 'justify-content-start'
              }`}
            >
              <div
                className={`p-3 rounded-3 ${
                  msg.role === 'user'
                    ? 'bg-primary text-white'
                    : 'bg-white border text-dark shadow-sm'
                }`}
                style={{ maxWidth: '85%', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}
              >
                <div className="fw-bold mb-1 small opacity-75">
                  {msg.role === 'user' ? 'あなた' : '🔮 AI占い師'}
                </div>
                {msg.text}
              </div>
            </div>
          ))}

          {/* 自動スクロールのアンカー */}
          <div ref={chatBottomRef} />
        </div>

        {/* チャット入力フォーム */}
        <div className="card-footer bg-white border-top p-2">
          <form onSubmit={handleSendChat} className="d-flex gap-2">
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="例: 金運について詳しく教えて..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={isAnalyzing}
            />
            <button
              type="submit"
              className="btn btn-primary btn-sm px-3 text-nowrap fw-bold"
              disabled={isAnalyzing || !chatInput.trim()}
            >
              {isAnalyzing ? '分析中...' : '送信'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}