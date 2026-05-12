import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { db } from '../firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { generatePlan } from '../api/forge'
import { validateBody, BODY_LIMITS } from '../utils/validate'
import { calcStreak } from '../utils/streak'
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

function getInitials(email) {
  if (!email) return '?'
  return email[0].toUpperCase()
}

const FORM_FIELDS = [
  { key: 'age',    label: 'Возраст', unit: 'лет', ...BODY_LIMITS.age },
  { key: 'weight', label: 'Вес',     unit: 'кг',  ...BODY_LIMITS.weight },
  { key: 'height', label: 'Рост',    unit: 'см',  ...BODY_LIMITS.height },
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

  const handleNumChange = (key, value) => {
    const clean = value.replace(/[^0-9]/g, '')
    setEditForm(ef => ({ ...ef, [key]: clean }))
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

    // Валидируем то что ввёл пользователь — без молчаливых "поправок".
    // Раньше тут был баг: значения клампились в [min, max] до валидации,
    // поэтому ввод 9 лет молча превращался в 10 и сохранялся.
    const errs = validateBody(editForm, { heightOptional: true })
    if (Object.keys(errs).length > 0) {
      setEditErrors(errs)
      return
    }

    const updated = { ...planData, form: { ...planData.form, ...editForm } }
    await setDoc(doc(db, 'plans', user.uid), updated)

    setPlanData(updated)
    setEditing(false)
    setEditErrors({})
    setShowRePlanModal(true)
  }

  const handleReplan = async () => {
    setShowRePlanModal(false)
    setLoading(true)
    try {
      const payload = {
        gender: planData.form.gender,
        age: Number(planData.form.age),
        height: Number(planData.form.height),
        weight: Number(planData.form.weight),
        goal: planData.form.goal,
        level: planData.form.level,
        equipment: planData.form.equipment,
        days: Number(planData.form.days),
        freeText: planData.form.freeText || ''
      }
      const res = await generatePlan(payload)
      const newPlan = res.success ? (res.data?.week_plan || res.data?.plan) : null
      if (newPlan && newPlan.length > 0) {
        localStorage.setItem('forge_pending', JSON.stringify({ form: payload, plan: newPlan }))
        navigate('/chat')
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
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
                    onClick={() => {
                      setEditing(e => !e)
                      setEditErrors({})
                      if (!editing) setEditForm(planData.form || {})
                    }}
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
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                      {FORM_FIELDS.map(f => (
                        <div key={f.key} className={styles.editField}>
                          <label className={styles.editLabel}>{f.label}</label>
                          <div className={`${styles.editInputWrap} ${editErrors[f.key] ? styles.editInputError : ''}`}>
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              className={styles.editInput}
                              value={editForm[f.key] || ''}
                              onChange={e => handleNumChange(f.key, e.target.value)}
                            />
                            <span className={styles.editUnit}>{f.unit}</span>
                          </div>
                          {editErrors[f.key] && <div className={styles.editError}>{editErrors[f.key]}</div>}
                        </div>
                      ))}
                    </div>

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
              <button className={styles.replanYes} onClick={handleReplan}>
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
