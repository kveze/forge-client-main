import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { generatePlan, generateTips, generateRecovery } from '../api/forge'
import { db } from '../firebase'
import { doc, setDoc } from 'firebase/firestore'
import styles from './Generate.module.css'
import PlanRenderer from '../components/PlanRenderer'
import Header from '../components/Header'

import { validateBody } from '../utils/validate'

const GOALS = ['Набор массы', 'Сила', 'Рельеф', 'Выносливость', 'Похудение']
const LEVELS = ['Новичок', 'Средний', 'Продвинутый']
const EQUIPMENT_HINTS = ['Только тело', 'Турник', 'Брусья', 'Гантели', 'Штанга', 'Скакалка', 'Тренажёры']
const DAYS_RU = ['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье']






function validate(form) {
  const errors = {}

  if (!form.gender) errors.gender = 'Выбери пол'

  // 🔥 Используем новую валидацию
  const bodyErrors = validateBody(form.age, form.weight, form.height)
  Object.assign(errors, bodyErrors)

  if (!form.goal) errors.goal = 'Выбери цель'
  if (!form.level) errors.level = 'Выбери уровень'
  if (!form.equipment.trim()) errors.equipment = 'Напиши что есть или нажми подсказку'
  if (!form.days) errors.days = 'Выбери количество дней'

  return errors
}

function highlight(text) {
  // 🔥 Если это не строка — верни как есть
  if (!text || typeof text !== 'string') return text
  
  let result = text
  DAYS_RU.forEach(d => { result = result.replaceAll(d, `§§${d}§§`) })
  return result.split(/(§§.*?§§)/g).map((part, i) => {
    if (part.startsWith('§§')) return <span key={i} className={styles.dayHighlight}>{part.replace(/§§/g, '')}</span>
    return part
  })
}
function TipItem({ text }) {
  const match = text.match(/^(\d+)\.\s*(.+)/)
  if (!match) return <div className={styles.tipItem}>{text}</div>
  return (
    <div className={styles.tipItem}>
      <span className={styles.tipNum}>{match[1]}</span>
      <span>{match[2]}</span>
    </div>
  )
}

export default function Generate() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    gender: null, age: '', height: '', weight: '',
    goal: null, level: null, equipment: '', days: null, freeText: ''
  })
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [plan, setPlan] = useState(null)
  const [tips, setTips] = useState(null)
  const [recovery, setRecovery] = useState(null)
  const [loadingPlan, setLoadingPlan] = useState(false)
  const [loadingWellness, setLoadingWellness] = useState(false)
  const [showBanner, setShowBanner] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const abortRef = useRef(null)
  const [view, setView] = useState('form') // 'form' | 'plan'

  const set = (k, v) => {
    const newForm = { ...form, [k]: v }
    setForm(newForm)
    if (submitted) setErrors(validate(newForm))
  }

  const addEquipHint = (hint) => {
    const current = form.equipment.trim()
    const newVal = !current ? hint
      : current.toLowerCase().includes(hint.toLowerCase()) ? current
      : current + ', ' + hint
    set('equipment', newVal)
  }

const handleGenerate = async () => {

    abortRef.current = new AbortController()
  setSubmitted(true)
const errs = validate(form)
setErrors(errs)
if (Object.keys(errs).length > 0) {
  // 🔥 Если абсурдные данные — показываем сообщение
  if (errs._absurd) {
    setErrors({ _global: '🤨 Данные выглядят нереально. Перепроверь рост, вес и возраст.' })
  }
  return
}

  setLoadingPlan(true)
  setPlan(null); setTips(null); setRecovery(null)
  setShowBanner(false); setSaved(false)

const payload = {
  gender: form.gender,
  age: Number(form.age),
  height: Number(form.height),
  weight: Number(form.weight),
  goal: form.goal,
  level: form.level,
  equipment: form.equipment,
  days: Number(form.days),
  freeText: form.freeText
}

    try {
    // 🔥 1. План — новая структура ответа
    const res = await generatePlan(payload, abortRef.current.signal)
    console.log('📋 Plan Response:', res) // Для отладки
    
    // 🔥 Извлекаем план из новой структуры
    const generatedPlan = res.success ? res.data.plan || res.data.week_plan : res.plan
    setPlan(generatedPlan)
    setView('plan')

    setShowBanner(!user)
    
    if (user) {
      setLoadingWellness(true)
      Promise.all([
        // 🔥 2. Советы — новая структура
        generateTips({ ...payload, plan: generatedPlan }),
        // 🔥 3. Восстановление — новая структура
        generateRecovery(payload)
      ]).then(([t, r]) => { 
        // 🔥 Извлекаем советы из новой структуры
        setTips(t.success ? t.data.tips : t.tips)
        setRecovery(r.success ? r.data.tips : r.plan)
      })
      .finally(() => setLoadingWellness(false))
    }
  } catch (err) { 
    if (err.name === 'AbortError') return // просто отменили, не ошибка
    console.error(err)
    setPlan('Ошибка: сервер не отвечает') 
  }
  finally { setLoadingPlan(false) }

  

}

const handleCancel = () => {
  abortRef.current?.abort()
  setLoadingPlan(false)
}

const handleSave = async () => {
  if (!user) { 
    navigate('/login')
    return 
  }
  if (!plan) { 
    setErrors({ _global: 'Нет плана для сохранения' })
    return 
  }
  
  setSaveLoading(true)
  
  // 🔥 ОБЪЯВЛЯЕМ ПЕРЕМЕННЫЕ СРАЗУ
  let finalTips = tips
  let finalRecovery = recovery
  
  try {
    // Если советов нет — генерируем
    if (!finalTips || !finalRecovery) {
      setLoadingWellness(true)
const payload = {
  gender: form.gender,
  age: form.age,
  weight: form.weight,
  goal: form.goal,
  level: form.level,
  equipment: form.equipment,
  days: form.days  // ← добавь это
}
      const [t, r] = await Promise.all([
        generateTips({ ...payload, plan: JSON.stringify(plan) }),
        generateRecovery(payload)
      ])
      finalTips = t.tips || t.data?.tips
      finalRecovery = r.plan || r.data?.tips
      setTips(finalTips)
      setRecovery(finalRecovery)
      setLoadingWellness(false)
    }
    
    await setDoc(doc(db, 'plans', user.uid), {
      plan,
      tips: finalTips,
      recovery: finalRecovery,
      form,
      createdAt: new Date().toISOString(),
      startDate: new Date().toISOString(),
      completedWorkouts: [],
      nextWorkoutDay: 1,
      lastWorkoutDate: null
    })
    
    setSaved(true)
    setShowBanner(false)
    
  } catch (err) { 
    console.error('Ошибка сохранения:', err)
    setErrors({ _global: 'Не удалось сохранить: ' + err.message })
  } finally { 
    setSaveLoading(false) 
  }
}



const hasErrors = Object.keys(errors).length > 0


return (
  <div className={styles.page}>
    <Header variant="generate" />

    <div className={styles.body}>

      {/* ФОРМА */}
      {view === 'form' && (
        <div className={styles.formCenter}>
          <div className={styles.formCol}>
          <div className={styles.headline}>СОЗДАЙ<br /><em>ПЛАН</em></div>

          {/* ПОЛ */}
          <div className={styles.fieldGroup}>
            <div className={styles.fieldLabel}>ПОЛ</div>
            <div className={styles.genderRow}>
              <button className={`${styles.genderBtn} ${form.gender === 'Мужчина' ? styles.genderActive : ''} ${errors.gender ? styles.fieldError : ''}`} onClick={() => set('gender', 'Мужчина')}>Мужчина</button>
              <button className={`${styles.genderBtn} ${form.gender === 'Женщина' ? styles.genderActive : ''} ${errors.gender ? styles.fieldError : ''}`} onClick={() => set('gender', 'Женщина')}>Женщина</button>
            </div>
            {errors.gender && <div className={styles.errorMsg}>← {errors.gender}</div>}
          </div>

          {/* Цифры */}
          <div className={styles.numRow}>
            {[
              { label: 'ВОЗРАСТ', key: 'age', placeholder: '20', unit: 'лет', min: 10, max: 80 },
              { label: 'ВЕС', key: 'weight', placeholder: '70', unit: 'кг', min: 30, max: 200 },
              { label: 'РОСТ', key: 'height', placeholder: '175', unit: 'см', min: 120, max: 220 },
            ].map(f => (
              <div key={f.key} className={styles.numField}>
                <div className={styles.fieldLabel}>{f.label}</div>
                <div className={`${styles.numInputWrap} ${errors[f.key] ? styles.inputError : ''}`}>
                  <input
  className={styles.numInput}
  type="number"
  placeholder={f.placeholder}
  min={f.min}
  max={f.max}
  value={form[f.key]}
  onChange={e => set(f.key, e.target.value)}
  onBlur={e => {
    const val = Number(e.target.value)
    if (e.target.value && val < f.min) set(f.key, String(f.min))
    if (e.target.value && val > f.max) set(f.key, String(f.max))
  }}
/>
                  <span className={styles.numUnit}>{f.unit}</span>
                </div>
                {errors[f.key] && <div className={styles.errorMsg}>{errors[f.key]}</div>}
              </div>
            ))}
          </div>

          {/* Цель */}
          <div className={styles.fieldGroup}>
            <div className={styles.fieldLabel}>ЦЕЛЬ</div>
            <div className={styles.btnRow}>
              {GOALS.map(g => (
                <button key={g} className={`${styles.chip} ${form.goal === g ? styles.chipActive : ''} ${errors.goal && !form.goal ? styles.fieldError : ''}`} onClick={() => set('goal', g)}>{g}</button>
              ))}
            </div>
            {errors.goal && <div className={styles.errorMsg}>{errors.goal}</div>}
          </div>

          {/* Уровень */}
          <div className={styles.fieldGroup}>
            <div className={styles.fieldLabel}>УРОВЕНЬ</div>
            <div className={styles.btnRow}>
              {LEVELS.map(l => (
                <button key={l} className={`${styles.levelBtn} ${form.level === l ? styles.levelActive : ''} ${errors.level && !form.level ? styles.fieldError : ''}`} onClick={() => set('level', l)}>{l}</button>
              ))}
            </div>
            {errors.level && <div className={styles.errorMsg}>{errors.level}</div>}
          </div>

          {/* Оборудование */}
          <div className={styles.fieldGroup}>
            <div className={styles.fieldLabel}>ОБОРУДОВАНИЕ</div>
            <input
              className={`${styles.textInput} ${errors.equipment ? styles.inputError : ''}`}
              placeholder="Что есть под рукой..."
              value={form.equipment}
              onChange={e => set('equipment', e.target.value)}
            />
            <div className={styles.hintRow}>
              {EQUIPMENT_HINTS.map(h => (
                <button key={h} className={styles.hintChip} onClick={() => addEquipHint(h)}>{h}</button>
              ))}
            </div>
            {errors.equipment && <div className={styles.errorMsg}>{errors.equipment}</div>}
          </div>

          {/* Дни */}
          <div className={styles.fieldGroup}>
            <div className={styles.fieldLabel}>КОЛИЧЕСТВО ТРЕНИРОВОК В НЕДЕЛЮ</div>
            <div className={styles.daysRow}>
              {[2,3,4,5].map(d => (
                <button key={d} className={`${styles.dayBtn} ${form.days === d ? styles.dayBtnActive : ''} ${errors.days && !form.days ? styles.fieldError : ''}`} onClick={() => set('days', d)}>{d}</button>
              ))}
            </div>
            {errors.days && <div className={styles.errorMsg}>{errors.days}</div>}
          </div>

          {/* Доп */}
          <div className={styles.fieldGroup}>
            <div className={styles.fieldLabel}>ДОПОЛНИТЕЛЬНО <span className={styles.optional}>(необязательно)</span></div>
            <textarea className={styles.textarea} placeholder="Травмы, особенности, предпочтения..." value={form.freeText} onChange={e => set('freeText', e.target.value)} rows={3} />
          </div>

          {submitted && hasErrors && (

            
            <div className={styles.globalError}>
              {errors._global && <div className={styles.globalError}>{errors._global}</div>}
            </div>
            
          )}

<button className={styles.generateBtn} onClick={loadingPlan ? handleCancel : handleGenerate}>
  {loadingPlan ? 'ОТМЕНИТЬ ✕' : 'СОЗДАТЬ ПЛАН →'}
</button>
        </div>
        </div>
      )}

      {/* ПЛАН */}
      {view === 'plan' && (
        <div className={styles.planCenter}>
          <button className={styles.backBtn} onClick={() => { setView('form'); setPlan(null) }}>
            ← Изменить данные
          </button>
          <div className={styles.resultCol}>
          {showBanner && (
            <div className={styles.banner}>
              <div className={styles.bannerClose} onClick={() => setShowBanner(false)}>✕</div>
              <div className={styles.bannerTitle}>ПЛАН ГОТОВ!</div>
              <div className={styles.bannerText}>Войдите чтобы сохранить план и получить советы по питанию и восстановлению.</div>
              <div className={styles.bannerBtns}>
                <button className={styles.bannerBtnRed} onClick={() => navigate('/login')}>ВОЙТИ</button>
                <button className={styles.bannerBtnGhost} onClick={() => navigate('/register')}>РЕГИСТРАЦИЯ</button>
              </div>
            </div>
          )}

          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <div className={styles.sectionTitle}>ТРЕНИРОВКИ</div>
              <div className={`${styles.sectionStatus} ${loadingPlan ? styles.statusRed : plan ? styles.statusGreen : ''}`}>
                {loadingPlan ? '// ГЕНЕРАЦИЯ...' : plan ? (saved ? '// СОХРАНЕНО ✓' : '// ГОТОВО') : '// ОЖИДАНИЕ'}
              </div>
            </div>
            <div className={styles.box}>
{plan && !loadingPlan && <PlanRenderer plan={plan} />}
            </div>
{plan && !saved && user && (
  <button className={styles.saveBtn} onClick={handleSave} disabled={saveLoading}>
                {saveLoading ? 'СОХРАНЯЕМ...' : 'СОХРАНИТЬ ПЛАН'}
              </button>
            )}
          </div>

          {(tips || loadingWellness) && (
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <div className={styles.sectionTitle}>СОВЕТЫ ПО ПИТАНИЮ</div>
                <div className={`${styles.sectionStatus} ${loadingWellness ? styles.statusRed : styles.statusGreen}`}>
                  {loadingWellness ? '// ГЕНЕРАЦИЯ...' : '// ГОТОВО'}
                </div>
              </div>
              <div className={styles.tipsBox}>
                {loadingWellness && <div className={styles.dots}><span/><span/><span/></div>}
                {tips && (Array.isArray(tips) ? tips : tips.split('\n'))
  .filter(l => l.trim())
  .map((line, i) => <TipItem key={i} text={line.trim()} />)}
              </div>
            </div>
          )}

          {(recovery || loadingWellness) && (
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <div className={styles.sectionTitle}>СОН И ВОССТАНОВЛЕНИЕ</div>
                <div className={`${styles.sectionStatus} ${loadingWellness ? styles.statusRed : styles.statusGreen}`}>
                  {loadingWellness ? '// ГЕНЕРАЦИЯ...' : '// ГОТОВО'}
                </div>
              </div>
              <div className={styles.tipsBox}>
                {loadingWellness && <div className={styles.dots}><span/><span/><span/></div>}
                {recovery && (Array.isArray(recovery) ? recovery : recovery.split('\n'))
  .filter(l => l.trim())
  .map((line, i) => <TipItem key={i} text={line.trim()} />)}
              </div>
            </div>
          )}

          {plan && !user && !showBanner && (
            <div className={styles.lockedMsg}>
              <span>🔒</span> Войдите чтобы получить советы по питанию и восстановлению
              <button className={styles.inlineBtn} onClick={() => navigate('/login')}>ВОЙТИ →</button>
            </div>
          )}
        </div>
        </div>
      )}

    </div>
  </div>
)

}

