import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { generateLooksMaxTip } from '../api/forge'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../firebase'
import Header from '../components/Header'
import styles from './LooksMaxTip.module.css'

const API = import.meta.env.VITE_API_URL

async function analyzePhoto(imageBase64, userData) {
  const res = await fetch(`${API}/looksmax-analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_base64: imageBase64,
      age: userData.age,
      gender: userData.gender,
      goal: userData.goal,
    }),
  })
  return res.json()
}

async function transformPhoto(imageBase64, tips, gender) {
  const res = await fetch(`${API}/looksmax-transform`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_base64: imageBase64, tips, gender }),
  })
  return res.json()
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

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

const handlePhotoSelect = async (e) => {
  const file = e.target.files[0]
  if (!file) return

  // Только изображения
  if (!file.type.startsWith('image/')) {
    alert('Только фото')
    return
  }

  // Максимум 5MB
  if (file.size > 5 * 1024 * 1024) {
    alert('Фото слишком большое, максимум 5MB')
    return
  }

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
      age:    Number(form.age)    || 20,
      gender: form.gender === 'Мужчина' ? 'мужчина' : 'женщина',
      weight: Number(form.weight) || 75,
      height: Number(form.height) || 180,
      goal:   form.goal  || '',
      level:  form.level || '',
      days:   form.days  || 3,
      bf:     0,
    }
  }

  const handleAnalyze = async () => {
    if (!photo) return
    setLoading(true)
    setNoPlan(false)
    try {
      const userData = await getUserData()
      if (!userData) { setNoPlan(true); return }
      const result = await analyzePhoto(photo, userData)
      if (!result.success) {
        if (result.error?.includes('лицо')) {
          alert('На фото не обнаружено лицо 😅 Загрузи селфи')
        }
        return
      }
      setTip(result.data)
      setStage('tips')
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }
 

  const handleGetTipWithoutPhoto = async () => {
    setLoading(true)
    setNoPlan(false)
    try {
      const userData = await getUserData()
      if (!userData) { setNoPlan(true); return }
      const result = await generateLooksMaxTip(userData)
      setTip(result.data)
      setStage('tips')
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

const handleTransform = async () => {
  if (!photo || !tip) return
  setTransforming(true)
  try {
    const result = await transformPhoto(photo, tip.tips, tip.gender)
    const b64 = result.data.image_base64
    setTransformed(b64)
    setStage('transform')
    // ← всё, больше ничего не сохраняем
  } catch (e) {
    console.error(e)
  } finally {
    setTransforming(false)
  }
}

  const handleReset = () => {
    setTip(null)
    setPhoto(null)
    setPhotoURL(null)
    setTransformed(null)
    setStage('idle')
  }

  return (
    <div className={styles.page}>
      <Header variant="profile" />

      <div className={styles.body}>

        {/* HERO */}
        <div className={styles.hero}>
          <div className={styles.tag}>// ПЕРСОНАЛЬНЫЙ AI АНАЛИЗ</div>
          <h1 className={styles.headline}>
            ТВОЙ<br /><em>LOOKS</em><br />MAX
          </h1>
          <p className={styles.heroSub}>
            Загрузи фото — AI проанализирует лицо и покажет<br />
            как ты будешь выглядеть после преображения.
          </p>
        </div>

        {/* КАРТОЧКА */}
        <div className={styles.card}>

          {noplan && (
            <div className={styles.noPlan}>
              Сначала создай план — данные берутся оттуда.
              <button className={styles.btn} onClick={() => navigate('/generate')}>
                СОЗДАТЬ ПЛАН →
              </button>
            </div>
          )}

          {/* IDLE */}
          {stage === 'idle' && !noplan && (
            <div className={styles.uploadSection}>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className={styles.fileInput}
              />

              {photoURL ? (
                <div className={styles.photoPreview}>
                  <img src={photoURL} alt="фото" className={styles.previewImg} />
                  <button className={styles.changePhoto} onClick={() => fileRef.current.click()}>
                    Сменить фото
                  </button>
                </div>
              ) : (
                <button className={styles.uploadBtn} onClick={() => fileRef.current.click()}>
                  <span className={styles.uploadIcon}>↑</span>
                  <span>ЗАГРУЗИТЬ ФОТО</span>
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
              {photoURL && (
                <div className={styles.photoSmall}>
                  <img src={photoURL} alt="твоё фото" className={styles.previewImgSmall} />
                </div>
              )}

              <div className={styles.tipsMeta}>
                <span className={styles.badge}>{tip.category}</span>
                {tip.priority === 'высокий' && (
                  <span className={styles.priority}>🔥 ВАЖНО</span>
                )}
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
                    {transforming ? '// ГЕНЕРИРУЮ...' : '✨ ПОКАЗАТЬ ПРЕОБРАЖЕНИЕ'}
                  </button>
                )}
                <button className={styles.ghostBtn} onClick={handleReset}>
                  СНАЧАЛА
                </button>
              </div>

              <p className={styles.disclaimer}>
                Советы носят информационный характер. Forge не несёт ответственности за результат.
              </p>
            </div>
          )}

          {/* TRANSFORM */}
          {stage === 'transform' && transformed && (
  <div className={styles.transformResult}>
    <div className={styles.beforeAfter}>
      <div className={styles.baItem}>
        <div className={styles.baLabel}>ДО</div>
        <img src={photoURL} alt="до" className={styles.baImg} />
      </div>
      <div className={styles.baItem}>
        <div className={styles.baLabelGreen}>ПОСЛЕ</div>
        <img src={`data:image/png;base64,${transformed}`} alt="после" className={styles.baImg} />
      </div>
    </div>

    <div className={styles.tipsList} style={{marginTop: 20}}>
      {tip.tips.map((t, i) => (
        <div key={i} className={styles.tipItem}>
          <span className={styles.tipNum}>{i + 1}</span>
          <p className={styles.tipText}>{t}</p>
        </div>
      ))}
    </div>

    <div className={styles.resultActions} style={{marginTop: 16}}>
      {/* ← КНОПКА СКАЧАТЬ */}
      <button className={styles.btn} onClick={() => {
        const a = document.createElement('a')
        a.href = `data:image/png;base64,${transformed}`
        a.download = 'forge-looksmax.png'
        a.click()
      }}>
        ↓ СКАЧАТЬ ПРЕОБРАЖЕНИЕ
      </button>

      <button className={styles.ghostBtn} onClick={handleReset}>
        ПОПРОБОВАТЬ СНОВА
      </button>
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