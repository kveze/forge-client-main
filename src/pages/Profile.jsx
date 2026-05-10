import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { db } from '../firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import styles from './Profile.module.css'
import PlanRenderer from '../components/PlanRenderer'
import Header from '../components/Header'

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

  const sorted = [...dates]
    .map(d => new Date(d))
    .sort((a, b) => b - a)

  const today = new Date()
  const yesterday = new Date(Date.now() - 86400000)
  const isSameDay = (a, b) => a.toDateString() === b.toDateString()

  if (!isSameDay(sorted[0], today) && !isSameDay(sorted[0], yesterday)) return 0

  let streak = 1
  for (let i = 1; i < sorted.length; i++) {
    const diff = (sorted[i - 1] - sorted[i]) / 86400000
    if (diff === 1) streak++
    else break
  }
  return streak
}

function getInitials(email) {
  if (!email) return '?'
  return email[0].toUpperCase()
}

function validateEditForm(form) {
  const errors = {}
  const age = Number(form.age)
  const weight = Number(form.weight)
  const height = Number(form.height)

  if (!form.age) errors.age = 'Укажи возраст'
  else if (isNaN(age) || age < 10 || age > 80) errors.age = 'От 10 до 80 лет'

  if (!form.weight) errors.weight = 'Укажи вес'
  else if (isNaN(weight) || weight < 30 || weight > 200) errors.weight = 'От 30 до 200 кг'

  if (form.height) {
    if (isNaN(height) || height < 120 || height > 220) errors.height = 'От 120 до 220 см'
  }

  if (form.height && form.weight && !errors.weight && !errors.height) {
    const bmi = weight / ((height / 100) ** 2)
    if (bmi < 13 || bmi > 50) errors.weight = 'Проверь рост и вес — не сходится'
  }

  return errors
}

const FORM_FIELDS = [
  { key: 'age', label: 'Возраст', unit: 'лет', min: 10, max: 80 },
  { key: 'weight', label: 'Вес', unit: 'кг', min: 30, max: 200 },
  { key: 'height', label: 'Рост', unit: 'см', min: 120, max: 220 },
]

const GOAL_OPTIONS = ['Набор массы', 'Сила', 'Рельеф', 'Выносливость', 'Похудение']
const LEVEL_OPTIONS = ['Новичок', 'Средний', 'Продвинутый']

const PLAN_TABS = [
  { key: 'plan', label: 'Тренировки' },
  { key: 'tips', label: 'Питание' },
  { key: 'recovery', label: 'Восстановление' },
]

export default function Profile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [showRePlanModal, setShowRePlanModal] = useState(false)
  const [planData, setPlanData] = useState(null)
  const [streakDates, setStreakDates] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('plan')
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [editErrors, setEditErrors] = useState({})

  useEffect(() => {
    if (!user) return

    const load = async () => {
      try {
        const [planSnap, streakSnap] = await Promise.all([
          getDoc(doc(db, 'plans', user.uid)),
          getDoc(doc(db, 'streaks', user.uid))
        ])

        if (planSnap.exists()) {
          const data = planSnap.data()
          setPlanData(data)
          setEditForm(data.form || {})
        }

        if (streakSnap.exists()) {
          setStreakDates(streakSnap.data().dates || [])
        }
      } catch (e) {
        console.error('Load error:', e)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [user])

  const handleNumChange = (key, value, min, max) => {
    const clean = value.replace(/[^0-9]/g, '')
    if (clean === '') {
      setEditForm(ef => ({ ...ef, [key]: '' }))
      return
    }
    const num = Math.max(min, Math.min(max, Number(clean)))
    setEditForm(ef => ({ ...ef, [key]: String(num) }))
    if (editErrors[key]) setEditErrors(e => ({ ...e, [key]: null }))
  }

  const handleEquipChange = (value) => {
    const clean = value.replace(/[^а-яёa-z\s,]/gi, '')
    setEditForm(ef => ({ ...ef, equipment: clean }))
  }

  const handleFreeTextChange = (value) => {
    const clean = value.replace(/[^а-яёa-z0-9\s,.\-!?()]/gi, '')
    setEditForm(ef => ({ ...ef, freeText: clean }))
  }

  const handleSaveEdit = async () => {
    if (!planData || !user) return

    const clampedForm = {
      ...editForm,
      age: String(Math.min(80, Math.max(10, Number(editForm.age) || 10))),
      weight: String(Math.min(200, Math.max(30, Number(editForm.weight) || 30))),
      height: editForm.height
        ? String(Math.min(220, Math.max(120, Number(editForm.height) || 120)))
        : '',
    }

    const errs = validateEditForm(clampedForm)
    if (Object.keys(errs).length > 0) {
      setEditErrors(errs)
      return
    }

    const updated = { ...planData, form: { ...planData.form, ...clampedForm } }
    await setDoc(doc(db, 'plans', user.uid), updated)

    setPlanData(updated)
    setEditForm(clampedForm)
    setEditing(false)
    setEditErrors({})
    setShowRePlanModal(true)
  }

  const streak = calcStreak(streakDates)
  const content = planData?.[activeTab]
  const isList = activeTab === 'tips' || activeTab === 'recovery'

  return (
    <div className={styles.page}>
      <Header variant="profile" />

      <div className={styles.body}>
        {loading && (
          <div className={styles.center}>
            <div className={styles.dots}><span /><span /><span /></div>
          </div>
        )}

        {!loading && (
          <>
            <div className={styles.profileCard}>
              <div className={styles.avatar}>{getInitials(user?.email)}</div>
              <div className={styles.profileInfo}>
                <div className={styles.profileEmail}>{user?.email}</div>
                {planData?.form && (
                  <div className={styles.profilePills}>
                    {[planData.form.gender, planData.form.goal].filter(Boolean).map((p, i) => (
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

            {planData?.form && (
              <div className={styles.dataCard}>
                <div className={styles.dataHeader}>
                  <div className={styles.cardTitle}>Мои данные</div>
                  <button
                    className={styles.editBtn}
                    onClick={() => { setEditing(e => !e); setEditErrors({}) }}
                  >
                    {editing ? 'Отмена' : 'Изменить'}
                  </button>
                </div>

                {!editing ? (
                  <div className={styles.dataGrid}>
                    {FORM_FIELDS.map(f => (
                      <div key={f.key} className={styles.dataItem}>
                        <div className={styles.dataLabel}>{f.label}</div>
                        <div className={styles.dataVal}>
                          {planData.form[f.key] || '—'} <span>{f.unit}</span>
                        </div>
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
                    {planData.form.freeText && (
                      <div className={`${styles.dataItem} ${styles.dataItemFull}`}>
                        <div className={styles.dataLabel}>Дополнительно</div>
                        <div className={styles.dataVal}>{planData.form.freeText}</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={styles.editGrid}>
                    {FORM_FIELDS.map(f => (
                      <div key={f.key} className={styles.editField}>
                        <label className={styles.editLabel}>{f.label}</label>
                        <div className={`${styles.editInputWrap} ${editErrors[f.key] ? styles.editInputError : ''}`}>
                          <input
                            type="number"
                            className={styles.editInput}
                            value={editForm[f.key] || ''}
                            min={f.min}
                            max={f.max}
                            onChange={e => handleNumChange(f.key, e.target.value, f.min, f.max)}
                          />
                          <span className={styles.editUnit}>{f.unit}</span>
                        </div>
                        {editErrors[f.key] && <div className={styles.editError}>{editErrors[f.key]}</div>}
                      </div>
                    ))}

                    <div className={`${styles.editField} ${styles.editFieldFull}`}>
                      <label className={styles.editLabel}>Цель</label>
                      <div className={styles.btnRow}>
                        {GOAL_OPTIONS.map(g => (
                          <button
                            key={g}
                            className={`${styles.chip} ${editForm.goal === g ? styles.chipActive : ''}`}
                            onClick={() => setEditForm(ef => ({ ...ef, goal: g }))}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className={`${styles.editField} ${styles.editFieldFull}`}>
                      <label className={styles.editLabel}>Уровень</label>
                      <div className={styles.btnRow}>
                        {LEVEL_OPTIONS.map(l => (
                          <button
                            key={l}
                            className={`${styles.chip} ${editForm.level === l ? styles.chipActive : ''}`}
                            onClick={() => setEditForm(ef => ({ ...ef, level: l }))}
                          >
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className={`${styles.editField} ${styles.editFieldFull}`}>
                      <label className={styles.editLabel}>Оборудование</label>
                      <input
                        type="text"
                        className={`${styles.editInput} ${editErrors.equipment ? styles.editInputError : ''}`}
                        value={editForm.equipment || ''}
                        onChange={e => handleEquipChange(e.target.value)}
                        placeholder="Турник, брусья, гантели..."
                      />
                      {editErrors.equipment && <div className={styles.editError}>{editErrors.equipment}</div>}
                    </div>

                    <div className={`${styles.editField} ${styles.editFieldFull}`}>
                      <label className={styles.editLabel}>Дополнительно</label>
                      <textarea
                        className={styles.editInput}
                        value={editForm.freeText || ''}
                        onChange={e => handleFreeTextChange(e.target.value)}
                        placeholder="Травмы, особенности, предпочтения..."
                        rows={3}
                      />
                    </div>

                    <button className={styles.saveEditBtn} onClick={handleSaveEdit}>
                      Сохранить
                    </button>
                  </div>
                )}
              </div>
            )}

            {planData ? (
              <div className={styles.planCard}>
                <div className={styles.planHeader}>
                  <div className={styles.cardTitle}>Мой план</div>
                  <div className={styles.planDate}>
                    {new Date(planData.createdAt).toLocaleDateString('ru-RU', {
                      day: 'numeric', month: 'long'
                    })}
                  </div>
                </div>
                <div className={styles.planTabs}>
                  {PLAN_TABS.map(t => (
                    <button
                      key={t.key}
                      className={`${styles.planTab} ${activeTab === t.key ? styles.planTabActive : ''}`}
                      onClick={() => setActiveTab(t.key)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <div className={styles.planContent}>
                  {!content && <div className={styles.noContent}>Нет данных</div>}
                  {content && !isList && <PlanRenderer plan={content} />}
                  {content && isList && (
                    <div className={styles.tipsList}>
                      {(Array.isArray(content) ? content : content.split('\n'))
                        .filter(l => l && l.trim())
                        .map((line, i) => (
                          <TipItem key={i} text={typeof line === 'string' ? line.trim() : String(line)} />
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
                <button className={styles.accentBtn} onClick={() => navigate('/generate')}>
                  Создать план →
                </button>
              </div>
            )}

            <button className={styles.logoutBtn} onClick={logout}>Выйти из аккаунта</button>
          </>
        )}
      </div>

      {showRePlanModal && (
        <div className={styles.modalOverlay} onClick={() => setShowRePlanModal(false)}>
          <div className={styles.replanModal} onClick={e => e.stopPropagation()}>
            <div className={styles.replanIcon}>🔄</div>
            <div className={styles.replanTitle}>Данные обновлены!</div>
            <div className={styles.replanText}>Пересоздать план под новые данные?</div>
            <div className={styles.replanBtns}>
              <button
                className={styles.replanYes}
                onClick={() => { setShowRePlanModal(false); navigate('/generate') }}
              >
                Да, пересоздать
              </button>
              <button className={styles.replanNo} onClick={() => setShowRePlanModal(false)}>
                Оставить старый
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
