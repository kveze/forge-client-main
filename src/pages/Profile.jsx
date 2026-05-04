import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { db } from '../firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import styles from './Profile.module.css'
import { validateBody } from '../utils/validate'
import PlanRenderer from '../components/PlanRenderer'
import Header from '../components/Header'
const DAYS_RU = ['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье']

function highlight(text) {
  // 🔥 Добавь проверку типа
  if (!text || typeof text !== 'string') return text
  
  let result = text
  DAYS_RU.forEach(d => { result = result.replaceAll(d, `§§${d}§§`) })
  return result.split(/(§§.*?§§)/g).map((part, i) =>
    part.startsWith('§§')
      ? <span key={i} className={styles.dayHL}>{part.replace(/§§/g, '')}</span>
      : part
  )
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

function calcStreak(dates) {
  if (!dates || dates.length === 0) return 0
  const sorted = [...dates].sort().reverse()
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0
  let streak = 1
  for (let i = 1; i < sorted.length; i++) {
    const diff = (new Date(sorted[i-1]) - new Date(sorted[i])) / 86400000
    if (diff === 1) streak++
    else break
  }
  return streak
}

function getInitials(email) {
  if (!email) return '?'
  return email[0].toUpperCase()
}

export default function Profile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [planData, setPlanData] = useState(null)
  const [streakDates, setStreakDates] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('plan')
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({})

  useEffect(() => {
    if (!user) return
    Promise.all([
      getDoc(doc(db, 'plans', user.uid)),
      getDoc(doc(db, 'streaks', user.uid))
    ]).then(([planSnap, streakSnap]) => {
      if (planSnap.exists()) {
        const data = planSnap.data()
        setPlanData(data)
        setEditForm(data.form || {})
      }
      if (streakSnap.exists()) setStreakDates(streakSnap.data().dates || [])
    }).finally(() => setLoading(false))
  }, [user])

  const handleSaveEdit = async () => {
    if (!planData) return
    // Валидация удалена, так как меняем только текст оборудования
    const updated = { ...planData, form: editForm }
    await setDoc(doc(db, 'plans', user.uid), updated)
    setPlanData(updated)
    setEditing(false)
  }

  const streak = calcStreak(streakDates)
  const tabs = [
    { key: 'plan', label: 'Тренировки' },
    { key: 'tips', label: 'Питание' },
    { key: 'recovery', label: 'Восстановление' },
  ]
  const content = planData?.[activeTab]
  const isList = activeTab === 'tips' || activeTab === 'recovery'

  // Поля для отображения в режиме просмотра
  const formFields = [
    { key: 'age', label: 'Возраст', unit: 'лет' },
    { key: 'weight', label: 'Вес', unit: 'кг' },
    { key: 'height', label: 'Рост', unit: 'см' },
  ]

  return (
    <div className={styles.page}>
      <Header variant="profile" />

      <div className={styles.body}>
        {loading && (
          <div className={styles.center}>
            <div className={styles.dots}><span/><span/><span/></div>
          </div>
        )}

        {!loading && (
          <>
            {/* ПРОФИЛЬ */}
            <div className={styles.profileCard}>
              <div className={styles.avatar}>{getInitials(user?.email)}</div>
              <div className={styles.profileInfo}>
                <div className={styles.profileEmail}>{user?.email}</div>
                {planData?.form && (
                  <div className={styles.profilePills}>
                    {[
                      planData.form.gender,
                      planData.form.goal,
                    ].filter(Boolean).map((p, i) => (
                      <div key={i} className={styles.profilePill}>{p}</div>
                    ))}
                  </div>
                )}
              </div>
              <div className={styles.streakBadge}>
                <span className={styles.streakFire}>🔥</span>
                <span className={styles.streakNum}>{streak}</span>
              </div>
            </div>

            {/* ДАННЫЕ */}
            {planData?.form && (
              <div className={styles.dataCard}>
                <div className={styles.dataHeader}>
                  <div className={styles.cardTitle}>Мои данные</div>
                  <button className={styles.editBtn} onClick={() => setEditing(e => !e)}>
                    {editing ? 'Отмена' : 'Изменить'}
                  </button>
                </div>

                {!editing ? (
                  // РЕЖИМ ПРОСМОТРА (без изменений)
                  <div className={styles.dataGrid}>
                    {formFields.map(f => (
                      <div key={f.key} className={styles.dataItem}>
                        <div className={styles.dataLabel}>{f.label}</div>
                        <div className={styles.dataVal}>{planData.form[f.key] || '—'} <span>{f.unit}</span></div>
                      </div>
                    ))}
                    <div className={styles.dataItem}>
                      <div className={styles.dataLabel}>Цель</div>
                      <div className={styles.dataVal}>{planData.form.goal || '—'}</div>
                    </div>
                    <div className={styles.dataItem}>
                      <div className={styles.dataLabel}>Уровень</div>
                      <div className={styles.dataVal}>{planData.form.level || '—'}</div>
                    </div>
                    <div className={styles.dataItem}>
                      <div className={styles.dataLabel}>Оборудование</div>
                      <div className={styles.dataVal}>{planData.form.equipment || '—'}</div>
                    </div>
                  </div>
                ) : (
                  // РЕЖИМ РЕДАКТИРОВАНИЯ (ТОЛЬКО ОБОРУДОВАНИЕ)
                  <div className={styles.editGrid}>
                    <div className={styles.editField} style={{ gridColumn: '1/-1' }}>
                      <label className={styles.editLabel}>Оборудование</label>
                      <input
                        type="text"
                        className={styles.editInput}
                        value={editForm.equipment || ''}
                        onChange={e => setEditForm(ef => ({ ...ef, equipment: e.target.value }))}
                        placeholder="Например: гантели, турник, нет оборудования"
                      />
                    </div>
                    <button className={styles.saveEditBtn} onClick={handleSaveEdit}>
                      Сохранить
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ПЛАН */}
            {planData ? (
              <div className={styles.planCard}>
                <div className={styles.planHeader}>
                  <div className={styles.cardTitle}>Мой план</div>
                  <div className={styles.planDate}>
                    {new Date(planData.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                  </div>
                </div>

                <div className={styles.planTabs}>
                  {tabs.map(t => (
                    <button key={t.key}
                      className={`${styles.planTab} ${activeTab === t.key ? styles.planTabActive : ''}`}
                      onClick={() => setActiveTab(t.key)}
                    >{t.label}</button>
                  ))}
                </div>

                <div className={styles.planContent}>
                  {!content && <div className={styles.noContent}>Нет данных</div>}
                  {content && !isList && <PlanRenderer plan={content} />}
                  {content && isList && (
                    <div className={styles.tipsList}>
                      {content.split('\n').filter(l => l.trim()).map((line, i) => (
                        <TipItem key={i} text={line.trim()} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className={styles.emptyPlan}>
                <div className={styles.emptyIcon}>📋</div>
                <div className={styles.emptyTitle}>Нет сохранённого плана</div>
                <div className={styles.emptyText}>Создай первый план тренировок</div>
                <button className={styles.accentBtn} onClick={() => navigate('/generate')}>Создать план →</button>
              </div>
            )}

            {/* ВЫЙТИ */}
            <button className={styles.logoutBtn} onClick={logout}>Выйти из аккаунта</button>
          </>
        )}
      </div>
    </div>
  )
}