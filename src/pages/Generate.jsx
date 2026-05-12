import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { generatePlan } from '../api/forge'
import styles from './Generate.module.css'
import Header from '../components/Header'
import { validateBody, BODY_LIMITS } from '../utils/validate'

const GOALS = ['Набор массы', 'Сила', 'Рельеф', 'Выносливость', 'Похудение']
const LEVELS = ['Новичок', 'Средний', 'Продвинутый']
const EQUIPMENT_HINTS = ['Только тело', 'Турник', 'Брусья', 'Гантели', 'Штанга', 'Скакалка', 'Тренажёры']

const NUM_FIELDS = [
  { label: 'ВОЗРАСТ', key: 'age',    placeholder: '20',  unit: 'лет', ...BODY_LIMITS.age },
  { label: 'ВЕС',     key: 'weight', placeholder: '70',  unit: 'кг',  ...BODY_LIMITS.weight },
  { label: 'РОСТ',    key: 'height', placeholder: '175', unit: 'см',  ...BODY_LIMITS.height },
]

function validate(form) {
  const errors = {}

  if (!form.gender) errors.gender = 'Выбери пол'

  Object.assign(errors, validateBody(form))

  if (!form.goal) errors.goal = 'Выбери цель'
  if (!form.level) errors.level = 'Выбери уровень'
  if (!form.equipment.trim()) errors.equipment = 'Напиши что есть или нажми подсказку'
  if (!form.days) errors.days = 'Выбери количество дней'

  return errors
}

export default function Generate() {
  useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    gender: null, age: '', height: '', weight: '',
    goal: null, level: null, equipment: '', days: null, freeText: ''
  })
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [loadingPlan, setLoadingPlan] = useState(false)
  const abortRef = useRef(null)

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

    if (Object.keys(errs).length > 0) {
      // Показываем И ошибки полей, И глобальное сообщение если данные нереальны
      if (errs._absurd) {
        setErrors({ ...errs, _global: '🤨 Данные выглядят нереально. Перепроверь рост, вес и возраст.' })
      } else {
        setErrors(errs)
      }
      return
    }

    setErrors({})
    setLoadingPlan(true)

    const payload = {
      gender: form.gender,
      age: Number(form.age),
      height: Number(form.height),
      weight: Number(form.weight),
      goal: form.goal,
      level: form.level,
      equipment: form.equipment,
      days: Number(form.days),
      freeText: form.freeText,
    }

    try {
      const res = await generatePlan(payload, abortRef.current.signal)
      const plan = res.success ? (res.data.plan || res.data.week_plan) : res.plan
      localStorage.setItem('forge_pending', JSON.stringify({ form: payload, plan }))
      navigate('/chat')
    } catch (err) {
      if (err.name === 'AbortError') return
      console.error(err)
      setErrors({ _global: 'Сервер не отвечает. Попробуй позже.' })
    } finally {
      setLoadingPlan(false)
    }
  }

  const handleCancel = () => {
    abortRef.current?.abort()
    setLoadingPlan(false)
  }

  return (
    <div className={styles.page}>
      <Header variant="generate" />

      <div className={styles.body}>
        <div className={styles.formCenter}>
          <div className={styles.formCol}>
            <div className={styles.headline}>СОЗДАЙ<br /><em>ПЛАН</em></div>

            {/* ПОЛ */}
            <div className={styles.fieldGroup}>
              <div className={styles.fieldLabel}>ПОЛ</div>
              <div className={styles.genderRow}>
                <button
                  className={`${styles.genderBtn} ${form.gender === 'Мужчина' ? styles.genderActive : ''} ${errors.gender ? styles.fieldError : ''}`}
                  onClick={() => set('gender', 'Мужчина')}
                >
                  Мужчина
                </button>
                <button
                  className={`${styles.genderBtn} ${form.gender === 'Женщина' ? styles.genderActive : ''} ${errors.gender ? styles.fieldError : ''}`}
                  onClick={() => set('gender', 'Женщина')}
                >
                  Женщина
                </button>
              </div>
              {errors.gender && <div className={styles.errorMsg}>← {errors.gender}</div>}
            </div>

            {/* ЦИФРЫ */}
            <div className={styles.numRow}>
              {NUM_FIELDS.map(f => (
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

            {/* ЦЕЛЬ */}
            <div className={styles.fieldGroup}>
              <div className={styles.fieldLabel}>ЦЕЛЬ</div>
              <div className={styles.btnRow}>
                {GOALS.map(g => (
                  <button
                    key={g}
                    className={`${styles.chip} ${form.goal === g ? styles.chipActive : ''} ${errors.goal && !form.goal ? styles.fieldError : ''}`}
                    onClick={() => set('goal', g)}
                  >
                    {g}
                  </button>
                ))}
              </div>
              {errors.goal && <div className={styles.errorMsg}>{errors.goal}</div>}
            </div>

            {/* УРОВЕНЬ */}
            <div className={styles.fieldGroup}>
              <div className={styles.fieldLabel}>УРОВЕНЬ</div>
              <div className={styles.btnRow}>
                {LEVELS.map(l => (
                  <button
                    key={l}
                    className={`${styles.levelBtn} ${form.level === l ? styles.levelActive : ''} ${errors.level && !form.level ? styles.fieldError : ''}`}
                    onClick={() => set('level', l)}
                  >
                    {l}
                  </button>
                ))}
              </div>
              {errors.level && <div className={styles.errorMsg}>{errors.level}</div>}
            </div>

            {/* ОБОРУДОВАНИЕ */}
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

            {/* ДНИ */}
            <div className={styles.fieldGroup}>
              <div className={styles.fieldLabel}>КОЛИЧЕСТВО ТРЕНИРОВОК В НЕДЕЛЮ</div>
              <div className={styles.daysRow}>
                {[2, 3, 4, 5].map(d => (
                  <button
                    key={d}
                    className={`${styles.dayBtn} ${form.days === d ? styles.dayBtnActive : ''} ${errors.days && !form.days ? styles.fieldError : ''}`}
                    onClick={() => set('days', d)}
                  >
                    {d}
                  </button>
                ))}
              </div>
              {errors.days && <div className={styles.errorMsg}>{errors.days}</div>}
            </div>

            {/* ДОПОЛНИТЕЛЬНО */}
            <div className={styles.fieldGroup}>
              <div className={styles.fieldLabel}>
                ДОПОЛНИТЕЛЬНО <span className={styles.optional}>(необязательно)</span>
              </div>
              <textarea
                className={styles.textarea}
                placeholder="Травмы, особенности, предпочтения..."
                value={form.freeText}
                onChange={e => set('freeText', e.target.value)}
                rows={3}
              />
            </div>

            {submitted && errors._global && (
              <div className={styles.globalError}>{errors._global}</div>
            )}

            <button
              className={styles.generateBtn}
              onClick={loadingPlan ? handleCancel : handleGenerate}
            >
              {loadingPlan ? 'ОТМЕНИТЬ ✕' : 'СОЗДАТЬ ПЛАН →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
