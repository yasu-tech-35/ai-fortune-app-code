import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db, auth, saveImage } from '../firebase'
import { runFortuneTelling } from '../services/gemini'

export default function DivinationNew() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const parentId = searchParams.get('parentId')

  const [theme, setTheme] = useState('総合運')
  const [profile, setProfile] = useState({
    name: '',
    birthDate: '',
    birthTime: '',
    gender: '未回答',
  })
  const [files, setFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [parentFortune, setParentFortune] = useState(null)
  const [loading, setLoading] = useState(false)

  const isPaidPlan = import.meta.env.VITE_USE_PAID_STORAGE === 'true'

  // parentIdがある場合、前回の鑑定データ・プロフィールを読み込む
  useEffect(() => {
    async function loadParent() {
      if (!parentId) return
      const user = auth.currentUser
      if (!user) return

      try {
        const snap = await getDoc(doc(db, 'users', user.uid, 'fortunes', parentId))
        if (snap.exists()) {
          const data = snap.data()
          setParentFortune(data)
          if (data.userProfile) {
            setProfile(data.userProfile)
          }
        }
      } catch (err) {
        console.error('親データ読み込みエラー:', err)
      }
    }
    loadParent()
  }, [parentId])

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files)
    if (selectedFiles.length === 0) return

    const newFiles = [...files, ...selectedFiles]
    setFiles(newFiles)
    setPreviews(newFiles.map((file) => URL.createObjectURL(file)))
  }

  const handleRemoveImage = (index) => {
    setFiles(files.filter((_, i) => i !== index))
    setPreviews(previews.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const user = auth.currentUser
    if (!user) return alert('ログインが必要です')

    setLoading(true)

    try {
      // 1. プロンプト設定の読み込み
      const promptSnap = await getDoc(doc(db, 'users', user.uid, 'customPrompts', 'default'))
      const promptData = promptSnap.exists() ? promptSnap.data() : {}

      // 2. 画像の保存処理 (Base64 または Storage)
      const imageUrls = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const path = `users/${user.uid}/fortunes/${Date.now()}_${i}`
        const url = await saveImage(file, path, isPaidPlan)
        imageUrls.push(url)
      }

      // 3. Gemini による鑑定実行
      const resultText = await runFortuneTelling({
        profile,
        images: files,
        fortunePrompt: promptData.fortunePrompt,
        correctionPrompt: promptData.correctionPrompt,
        previousResult: parentFortune ? parentFortune.resultText : null,
      })

      // 4. Firestore への結果保存
      const docRef = await addDoc(collection(db, 'users', user.uid, 'fortunes'), {
        theme,
        userProfile: profile,
        imageUrls,
        resultText,
        parentId: parentId || null,
        chatHistory: [],
        createdAt: serverTimestamp(),
      })

      // 5. 生成された結果画面へ遷移
      navigate(`/divination/${docRef.id}`)
    } catch (err) {
      console.error('鑑定処理エラー:', err)
      alert('鑑定中にエラーが発生しました: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container py-3" style={{ maxWidth: '600px' }}>
      <h2 className="h4 mb-3 fw-bold">
        {parentId ? '🔀 比較・派生鑑定の実行' : '🔮 新規占い鑑定'}
      </h2>

      {parentFortune && (
        <div className="alert alert-info py-2 small mb-3" role="alert">
          💡 前回の「<strong>{parentFortune.theme}</strong>」の鑑定結果を引き継ぎ、新しい画像・情報と比較分析します。
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-3 shadow-sm border-0 rounded-3">
        <div className="mb-3">
          <label className="form-label fw-bold small">鑑定テーマ</label>
          <select
            className="form-select"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
          >
            <option value="総合運">総合運</option>
            <option value="手相鑑定">手相鑑定</option>
            <option value="顔相鑑定">顔相鑑定</option>
            <option value="恋愛・相性運">恋愛・相性運</option>
            <option value="仕事・金運">仕事・金運</option>
          </select>
        </div>

        <div className="mb-3">
          <label className="form-label fw-bold small">氏名 / ニックネーム</label>
          <input
            type="text"
            className="form-control"
            required
            placeholder="例: 山田 太郎"
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
          />
        </div>

        <div className="row g-2 mb-3">
          <div className="col-6">
            <label className="form-label fw-bold small">生年月日</label>
            <input
              type="date"
              className="form-control"
              required
              value={profile.birthDate}
              onChange={(e) => setProfile({ ...profile, birthDate: e.target.value })}
            />
          </div>
          <div className="col-6">
            <label className="form-label fw-bold small">出生時間（任意）</label>
            <input
              type="time"
              className="form-control"
              value={profile.birthTime}
              onChange={(e) => setProfile({ ...profile, birthTime: e.target.value })}
            />
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label fw-bold small">性別（任意）</label>
          <select
            className="form-select"
            value={profile.gender}
            onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
          >
            <option value="未回答">未回答 / 指定しない</option>
            <option value="女性">女性</option>
            <option value="男性">男性</option>
            <option value="その他">その他</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="form-label fw-bold small">
            📷 鑑定用画像（手相・顔・スクショ等）
          </label>
          <input
            type="file"
            className="form-control mb-2"
            accept="image/*"
            multiple
            onChange={handleFileChange}
          />

          {previews.length > 0 && (
            <div className="d-flex gap-2 overflow-auto py-2">
              {previews.map((src, index) => (
                <div key={index} className="position-relative flex-shrink-0">
                  <img
                    src={src}
                    alt={`プレビュー ${index + 1}`}
                    className="rounded border"
                    style={{ width: '80px', height: '80px', objectFit: 'cover' }}
                  />
                  <button
                    type="button"
                    className="btn btn-danger btn-sm position-absolute top-0 end-0 p-0 rounded-circle d-flex align-items-center justify-content-center"
                    style={{ width: '20px', height: '20px', transform: 'translate(30%, -30%)' }}
                    onClick={() => handleRemoveImage(index)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          className="btn btn-primary w-100 py-2 fw-bold"
          disabled={loading}
        >
          {loading ? '🔮 AIが鑑定中...' : '🔮 AI占い鑑定を実行する'}
        </button>
      </form>
    </div>
  )
}