import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { generateLooksMaxTip, analyzeFace, transformFace } from '../api/forge'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import Header from '../components/Header'
import BeforeAfterSlider from '../components/BeforeAfterSlider'
import styles from './LooksMaxTip.module.css'

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Шкала параметра
function ScoreBar({ label, score, max = 10 }) {
  const pct = (score / max) * 100
  const color = pct >= 70 ? '#4ade80' : pct >= 40 ? '#FF2D2D' : '#888'
  return (
    <div className={styles.scoreRow}>
      <div className={styles.scoreLabel}>{label}</div>
      <div className={styles.scoreBarWrap}>
        <div className={styles.scoreBarFill} style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className={styles.scoreNum} style={{ color }}>{score}/{max}</div>
    </div>
  )
}

const DEFAULT_SCORES = {
  'Симметрия': 7,
  'Кожа': 6,
  'Скулы': 5,
  'Челюсть': 6,
  'Общий вид': 7,
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export default function LooksMaxTip() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const fileRef = useRef(null)

  const [tip, setTip] = useState(null)
  const [loading, setLoading] = useState(false)
  const [noplan, setNoPlan] = useState(false)
  const [photo, setPhoto] = useState(null)
  const [photoURL, setPhotoURL] = useState(null)
  const [transformed, setTransformed] = useState(null)
  const [transforming, setTransforming] = useState(false)
  const [stage, setStage] = useState('idle')
  const [error, setError] = useState(null)

  const handlePhotoSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Только фото'); return }
    if (file.size > MAX_FILE_SIZE) { setError('Максимум 5MB'); return }
    setError(null)
    const base64 = await fileToBase64(file)
    setPhoto(base64)
    setPhotoURL(URL.createObjectURL(file))
  }

  const getUserData = async () => {
    if (!user) return null
    const planDoc = await getDoc(doc(db, 'plans', user.uid))
    if (!planDoc.exists()) return null
    const form = planDoc.data().form
    return {
      age: Number(form.age) || 20,
      gender: form.gender === 'Мужчина' ? 'мужчина' : 'женщина',
      weight: Number(form.weight) || 75,
      height: Number(form.height) || 180,
      goal: form.goal || '',
      level: form.level || '',
      days: form.days || 3,
    }
  }

  const handleAnalyze = async () => {
    if (!photo) return
    setLoading(true)
    setNoPlan(false)
    setError(null)
    try {
      const userData = await getUserData()
      if (!userData) { setNoPlan(true); return }
      const result = await analyzeFace({
        imageBase64: photo,
        age: userData.age,
        gender: userData.gender,
        goal: userData.goal,
      })
      if (!result.success) {
        setError(result.error || 'Ошибка анализа')
        return
      }
      setTip(result.data)
      setStage('tips')
    } catch (e) {
      setError('Ошибка соединения')
    } finally {
      setLoading(false)
    }
  }

  const handleGetTipWithoutPhoto = async () => {
    setLoading(true)
    setNoPlan(false)
    setError(null)
    try {
      const userData = await getUserData()
      if (!userData) { setNoPlan(true); return }
      const result = await generateLooksMaxTip(userData)
      setTip(result.data)
      setStage('tips')
    } catch (e) {
      setError('Ошибка соединения')
    } finally {
      setLoading(false)
    }
  }

  const handleTransform = async () => {
    if (!photo || !tip) return
    setTransforming(true)
    setError(null)
    try {
      const result = await transformFace({
        imageBase64: photo,
        tips: tip.tips,
        gender: tip.gender,
      })
      setTransformed(`data:image/png;base64,${result.data.image_base64}`)
      setStage('transform')
    } catch (e) {
      setError('Ошибка генерации')
    } finally {
      setTransforming(false)
    }
  }

  const handleReset = () => {
    setTip(null); setPhoto(null); setPhotoURL(null)
    setTransformed(null); setStage('idle'); setError(null)
  }

  const handleDownload = () => {
    if (!transformed) return
    const a = document.createElement('a')
    a.href = transformed
    a.download = 'forge-looksmax.png'
    a.click()
  }

  // Скоры с бэка или дефолтные (для красоты)
  const scores = tip?.scores || DEFAULT_SCORES
  const totalScore = tip?.total_score ||
    Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length * 10)

  return (
    <div className={styles.page}>
      <Header variant="looksmax" />

      <div className={styles.body}>

        {/* HERO */}
        <div className={styles.hero}>
          <div className={styles.tag}>// ПЕРСОНАЛЬНЫЙ AI АНАЛИЗ</div>
          <h1 className={styles.headline}>
            ТВОЙ<br /><em>LOOKS</em><br />MAX
          </h1>
          <p className={styles.heroSub}>
            Загрузи фото — AI проанализирует лицо, оценит параметры<br />
            и покажет как ты будешь выглядеть после преображения.
          </p>
        </div>

        {/* КАРТОЧКА */}
        <div className={styles.card}>

          {noplan && (
            <div className={styles.noPlan}>
              <div className={styles.noPlanIcon}>📋</div>
              <div>Сначала создай план — данные берутся оттуда.</div>
              <button className={styles.btn} onClick={() => navigate('/generate')}>СОЗДАТЬ ПЛАН →</button>
            </div>
          )}

          {error && <div className={styles.errorMsg}>{error}</div>}

          {/* IDLE */}
          {stage === 'idle' && !noplan && (
            <div className={styles.uploadSection}>
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoSelect} className={styles.fileInput} />

              {photoURL ? (
                <div className={styles.photoPreview}>
                  <img src={photoURL} alt="фото" className={styles.previewImg} />
                  <button className={styles.changePhoto} onClick={() => fileRef.current.click()}>Сменить фото</button>
                </div>
              ) : (
                <button className={styles.uploadBtn} onClick={() => fileRef.current.click()}>
                  <div className={styles.uploadIconWrap}>
                    <span className={styles.uploadIcon}>↑</span>
                  </div>
                  <span>ЗАГРУЗИТЬ ФОТО</span>
                  <span className={styles.uploadHint}>JPG, PNG до 5MB</span>
                </button>
              )}

              <div className={styles.actions}>
                {photo && (
                  <button className={styles.btn} onClick={handleAnalyze} disabled={loading}>
                    {loading ? '// АНАЛИЗИРУЮ...' : 'АНАЛИЗИРОВАТЬ ЛИЦО →'}
                  </button>
                )}
                <button className={styles.ghostBtn} onClick={handleGetTipWithoutPhoto} disabled={loading}>
                  {loading ? '...' : 'Без фото — просто совет'}
                </button>
              </div>

              <p className={styles.disclaimer}>
                Советы носят информационный характер. Forge не несёт ответственности за результат.
              </p>
            </div>
          )}

          {/* TIPS */}
          {stage === 'tips' && tip && (
            <div className={styles.result}>

              {/* Аватар + общий скор */}
              <div className={styles.resultHeader}>
                {photoURL && <img src={photoURL} alt="фото" className={styles.avatarCircle} />}
                <div className={styles.totalScoreWrap}>
                  <div className={styles.totalScoreNum}>{totalScore}</div>
                  <div className={styles.totalScoreLabel}>/ 100</div>
                </div>
                <div className={styles.totalScoreTitle}>FORGE SCORE</div>
              </div>

              {/* Параметры */}
              <div className={styles.scoresBlock}>
                {Object.entries(scores).map(([label, score]) => (
                  <ScoreBar key={label} label={label} score={score} />
                ))}
              </div>

              <div className={styles.divider} />

              {/* Советы */}
              <div className={styles.tipsHeader}>
                <div className={styles.tipsTitle}>// ЧТО УЛУЧШИТЬ</div>
                {tip.category && <span className={styles.badge}>{tip.category}</span>}
              </div>

              <div className={styles.tipsList}>
                {tip.tips.map((t, i) => (
                  <div key={i} className={styles.tipItem}>
                    <span className={styles.tipNum}>{i + 1}</span>
                    <p className={styles.tipText}>{t}</p>
                  </div>
                ))}
              </div>

              <div className={styles.resultActions}>
                {photo && (
                  <button className={styles.btn} onClick={handleTransform} disabled={transforming}>
                    {transforming ? '// ГЕНЕРИРУЮ ПРЕОБРАЖЕНИЕ...' : '✨ ПОКАЗАТЬ ПРЕОБРАЖЕНИЕ'}
                  </button>
                )}
                <button className={styles.ghostBtn} onClick={handleReset}>СНАЧАЛА</button>
              </div>

              <p className={styles.disclaimer}>
                Советы носят информационный характер. Forge не несёт ответственности за результат.
              </p>
            </div>
          )}

          {/* TRANSFORM */}
          {stage === 'transform' && transformed && (
            <div className={styles.transformResult}>

              <div className={styles.transformHeader}>
                <div className={styles.tipsTitle}>// ТВОЁ ПРЕОБРАЖЕНИЕ</div>
                <div className={styles.transformHint}>Двигай слайдер</div>
              </div>

              <BeforeAfterSlider before={photoURL} after={transformed} />

              <div className={styles.divider} />

              <div className={styles.tipsList}>
                {tip.tips.map((t, i) => (
                  <div key={i} className={styles.tipItem}>
                    <span className={styles.tipNum}>{i + 1}</span>
                    <p className={styles.tipText}>{t}</p>
                  </div>
                ))}
              </div>

              <div className={styles.resultActions}>
                <button className={styles.btn} onClick={handleDownload}>↓ СКАЧАТЬ ПРЕОБРАЖЕНИЕ</button>
                <button className={styles.ghostBtn} onClick={handleReset}>ПОПРОБОВАТЬ СНОВА</button>
              </div>

              <p className={styles.disclaimer}>
                Советы носят информационный характер. Forge не несёт ответственности за результат.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
