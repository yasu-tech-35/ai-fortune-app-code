import React, { useState, useEffect } from 'react'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db, auth } from '../firebase'

export default function PromptSettings() {
  const [correctionPrompt, setCorrectionPrompt] = useState('')
  const [fortunePrompt, setFortunePrompt] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  // コンポーネントマウント時に保存済みプロンプトを読み込む
  useEffect(() => {
    async function loadPrompts() {
      const user = auth.currentUser
      if (!user) return

      try {
        // users/{userId}/customPrompts/default ドキュメントを参照
        const docRef = doc(db, 'users', user.uid, 'customPrompts', 'default')
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          const data = docSnap.data()
          setCorrectionPrompt(data.correctionPrompt || '')
          setFortunePrompt(data.fortunePrompt || '')
        }
      } catch (err) {
        console.error('プロンプト読み込みエラー:', err)
        setMessage({ type: 'danger', text: 'プロンプトデータの読み込みに失敗しました。' })
      } finally {
        setLoading(false)
      }
    }

    loadPrompts()
  }, [])

  // 保存処理
  const handleSave = async (e) => {
    e.preventDefault()
    const user = auth.currentUser
    if (!user) return

    setSaving(true)
    setMessage({ type: '', text: '' })

    try {
      const docRef = doc(db, 'users', user.uid, 'customPrompts', 'default')
      
      // setDoc を使用してデータを保存（更新または新規作成）
      await setDoc(docRef, {
        correctionPrompt,
        fortunePrompt,
        updatedAt: serverTimestamp(),
      }, { merge: true })

      setMessage({ type: 'success', text: 'プロンプト設定を保存しました！' })
    } catch (err) {
      console.error('プロンプト保存エラー:', err)
      setMessage({ type: 'danger', text: '保存に失敗しました: ' + err.message })
    } finally {
      setSaving(false)
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

  return (
    <div className="container py-3" style={{ maxWidth: '650px' }}>
      <h2 className="h4 mb-3 fw-bold">⚙️ プロンプト管理設定</h2>
      <p className="text-muted small mb-4">
        AI（Gemini）が占いを行う際の基本指示や、用語・誤解を補正するためのルールを自由に設定できます。
      </p>

      {message.text && (
        <div className={`alert alert-${message.type} py-2 small mb-3`} role="alert">
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="card p-3 shadow-sm border-0 rounded-3">
        {/* 用語・正誤補正プロンプト */}
        <div className="mb-4">
          <label className="form-label fw-bold text-dark mb-1">
            🛠 用語・解釈補正プロンプト
          </label>
          <div className="form-text text-muted mb-2 small">
            AIが混同しやすい用語の定義や、間違った出力・解釈を制限するための補正ルールを記述します。
          </div>
          <textarea
            className="form-control font-monospace"
            rows={4}
            value={correctionPrompt}
            onChange={(e) => setCorrectionPrompt(e.target.value)}
            placeholder="例: 「手相」の感情線と知能線を混同しないこと。専門用語（運命線、太陽線など）を使う場合は、初心者にも分かりやすい言葉で補足説明を加えてください。"
          />
        </div>

        {/* 占い実行基本プロンプト */}
        <div className="mb-4">
          <label className="form-label fw-bold text-dark mb-1">
            🔮 占い実行基本プロンプト（システム指示）
          </label>
          <div className="form-text text-muted mb-2 small">
            占い師としてのペルソナ（人格・話し方・トーン）や、鑑定結果の出力フォーマットを指示します。
          </div>
          <textarea
            className="form-control font-monospace"
            rows={6}
            value={fortunePrompt}
            onChange={(e) => setFortunePrompt(e.target.value)}
            placeholder="例: あなたは思慮深く温かみのあるプロの占い師です。相談者の生年月日・出生時間・画像から総合的な運勢を分析し、励ましと具体的なアドバイスを添えて回答してください。"
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary w-100 py-2 fw-bold"
          disabled={saving}
        >
          {saving ? '保存中...' : '設定を保存する'}
        </button>
      </form>
    </div>
  )
}