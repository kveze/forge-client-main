import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { db } from '../firebase'
import { doc, getDoc } from 'firebase/firestore'
import styles from './Dashboard.module.css'

const DAYS_RU = ['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье']

function highlight(text) {
  if (!text) return null
  let result = text
  DAYS_RU.forEach(d => { result = result.replaceAll(d, `§§${d}§§`) })
  return result.split(/(§§.*?§§)/g).map((part, i) => {
    if (part.startsWith('§§')) return <span key={i} className={styles.dayHighlight}>{part.replace(/§§/g, '')}</span>
    return part
  })
}

function TipItem({ text }) {
  const match = text.match(/^(\d+)\.\s*(.+)/)
  if (!match) return <div className={styles.tipItem}><span>{text}</span></div>
  return (
    <div className={styles.tipItem}>
      <span className={styles.tipNum}>{match[1]}</span>
      <span>{match[2]}</span>
    </div>
  )
}

export default function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [planData, setPlanData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('plan')
  const [menuOpen, setMenuOpen] = useState(false)

  const menuRef = useRef(null)

useEffect(() => {
  const handleClick = (e) => {
    if (menuRef.current && !menuRef.current.contains(e.target)) {
      setMenuOpen(false)
    }
  }
  if (menuOpen) document.addEventListener('mousedown', handleClick)
  return () => document.removeEventListener('mousedown', handleClick)
}, [menuOpen])

  useEffect(() => {
    if (!user) return
    getDoc(doc(db, 'plans', user.uid))
      .then(snap => { if (snap.exists()) setPlanData(snap.data()) })
      .finally(() => setLoading(false))
  }, [user])

  const tabs = [
    { key: 'plan', label: 'ТРЕНИРОВКИ' },
    { key: 'tips', label: 'ПИТАНИЕ' },
    { key: 'recovery', label: 'ВОССТАНОВЛЕНИЕ' },
  ]

  const content = planData?.[activeTab]
  const isList = activeTab === 'tips' || activeTab === 'recovery'

  const handleNav = (path) => {
    setMenuOpen(false)
    navigate(path)
  }

  const handleLogout = () => {
    setMenuOpen(false)
    logout()
  }

  return (
    <div className={styles.page}>
      <div ref={menuRef}>
      <header className={styles.header}>
        <div className={styles.logo} onClick={() => navigate('/')}>FOR<span>G</span>E</div>

        {/* Desktop nav */}
        <nav className={styles.tabs}>
          {tabs.map(t => (
            <button key={t.key} className={`${styles.tab} ${activeTab === t.key ? styles.tabActive : ''}`} onClick={() => setActiveTab(t.key)}>
              {t.label}
            </button>
          ))}
        </nav>

        <div className={styles.right}>
          <button className={styles.ghostBtn} onClick={() => navigate('/today')}>СЕГОДНЯ 🔥</button>
          <button className={styles.ghostBtn} onClick={() => navigate('/generate')}>НОВЫЙ ПЛАН</button>
          <button className={styles.ghostBtn} onClick={logout}>ВЫЙТИ</button>
        </div>

        {/* Burger button */}
        <button className={styles.burger} onClick={() => setMenuOpen(o => !o)}>
          <span className={`${styles.burgerLine} ${menuOpen ? styles.burgerLineTop : ''}`} />
          <span className={`${styles.burgerLine} ${menuOpen ? styles.burgerLineMid : ''}`} />
          <span className={`${styles.burgerLine} ${menuOpen ? styles.burgerLineBot : ''}`} />
        </button>
      </header>

      {/* Mobile menu */}
      {menuOpen && (
  <>
    <div className={styles.overlay} onClick={() => setMenuOpen(false)} />
    <div className={styles.mobileMenu}>
      <div className={styles.mobileEmail}>{user?.email}</div>
      <div className={styles.mobileDivider} />
      <div className={styles.mobileTabs}>
        {tabs.map(t => (
          <button key={t.key}
            className={`${styles.mobileTab} ${activeTab === t.key ? styles.mobileTabActive : ''}`}
            onClick={() => { setActiveTab(t.key); setMenuOpen(false) }}
          >{t.label}</button>
        ))}
      </div>
      <div className={styles.mobileDivider} />
      <button className={styles.mobileNavBtn} onClick={() => handleNav('/today')}>🔥 СЕГОДНЯ</button>
      <button className={styles.mobileNavBtn} onClick={() => handleNav('/generate')}>+ НОВЫЙ ПЛАН</button>
      <button className={styles.mobileNavBtnRed} onClick={handleLogout}>ВЫЙТИ</button>
    </div>
  </>
)}
      
      </div>

      <div className={styles.body}>
        {loading && (
          <div className={styles.center}>
            <div className={styles.dots}><span/><span/><span/></div>
          </div>
        )}

        {!loading && !planData && (
          <div className={styles.center}>
            <div className={styles.emptyTitle}>У ТЕБЯ ЕЩЁ НЕТ ПЛАНА</div>
            <div className={styles.emptyText}>Создай свой первый план и сохрани его</div>
            <button className={styles.redBtn} onClick={() => navigate('/generate')}>СОЗДАТЬ ПЛАН →</button>
          </div>
        )}

        {!loading && planData && (
          <div className={styles.content}>
            <div className={styles.meta}>
              <div className={styles.metaLabel}>// ПОСЛЕДНЕЕ ОБНОВЛЕНИЕ</div>
              <div className={styles.metaVal}>{new Date(planData.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
              {planData.form && (
                <div className={styles.pills}>
                  {[planData.form.gender, planData.form.age && `${planData.form.age} лет`, planData.form.weight && `${planData.form.weight} кг`, planData.form.goal, planData.form.level].filter(Boolean).map((p, i) => (
                    <div key={i} className={`${styles.pill} ${i < 1 ? styles.pillRed : ''}`}>{p}</div>
                  ))}
                </div>
              )}
            </div>

            {!content && <div className={styles.noContent}>Нет данных для этого раздела</div>}

            {content && !isList && (
              <div className={styles.planBox}>
                <div className={styles.planText}>{highlight(content)}</div>
              </div>
            )}

            {content && isList && (
              <div className={styles.tipsBox}>
                {content.split('\n').filter(l => l.trim()).map((line, i) => (
                  <TipItem key={i} text={line.trim()} />
                ))}
              </div>
            )}

            <button className={styles.newPlanBtn} onClick={() => navigate('/generate')}>
              СОЗДАТЬ НОВЫЙ ПЛАН →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
