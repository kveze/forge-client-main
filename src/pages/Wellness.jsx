import { useState } from 'react'
import Nav from '../components/Nav'
import { generateNutrition, generateRecovery } from '../api/forge'
import styles from './Wellness.module.css'

const DAYS_HIGHLIGHT = ['Завтрак','Обед','Ужин','Перекус','Сон','Восстановление']

function highlight(text) {
  let result = text
  DAYS_HIGHLIGHT.forEach(w => {
    result = result.replaceAll(w, `##H##${w}##/H##`)
  })
  return result.split(/(##H##.*?##\/H##)/g).map((part, i) => {
    if (part.startsWith('##H##')) {
      const word = part.replace('##H##', '').replace('##/H##', '')
      return <span key={i} className={styles.highlight}>{word}</span>
    }
    return part
  })
}

function PlanBox({ title, status, content, loading, placeholder }) {
  return (
    <div className={styles.planSection}>
      <div className={styles.planHeader}>
        <div className={styles.planTitle}>{title}</div>
        <div className={`${styles.planStatus} ${loading ? styles.statusLoading : content ? styles.statusDone : ''}`}>
          {loading ? '// ГЕНЕРАЦИЯ...' : content ? '// ГОТОВО' : '// ОЖИДАНИЕ'}
        </div>
      </div>
      <div className={styles.box}>
        {!content && !loading && (
          <div className={styles.placeholder}>{placeholder}</div>
        )}
        {loading && (
          <div className={styles.loading}>
            <div className={styles.dot} />
            <div className={styles.dot} />
            <div className={styles.dot} />
          </div>
        )}
        {content && !loading && (
          <div className={styles.content}>{highlight(content)}</div>
        )}
      </div>
    </div>
  )
}

export default function Wellness() {
  const [form, setForm] = useState({
    gender: 'мужчина', age: 20, height: 175, weight: 70, goal: 'сила', level: 'средний уровень'
  })
  const [nutrition, setNutrition] = useState(null)
  const [recovery, setRecovery] = useState(null)
  const [loadingN, setLoadingN] = useState(false)
  const [loadingR, setLoadingR] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleGenerate = async () => {
    setNutrition(null)
    setRecovery(null)
    setLoadingN(true)
    setLoadingR(true)

    generateNutrition(form)
      .then(r => setNutrition(r.plan))
      .catch(() => setNutrition('Ошибка. Запусти node server.js'))
      .finally(() => setLoadingN(false))

    generateRecovery(form)
      .then(r => setRecovery(r.plan))
      .catch(() => setRecovery('Ошибка. Запусти node server.js'))
      .finally(() => setLoadingR(false))
  }

  return (
    <div className={styles.page}>
      <Nav />
      <div className={styles.main}>

        {/* LEFT - form */}
        <div className={styles.left}>
          <div className={styles.sectionLabel}>// ТВОИ ДАННЫЕ</div>
          <div className={styles.headline}>ПИТАНИЕ<br />И <em>ВОССТАНОВЛЕНИЕ</em></div>

          <div className={styles.row}>
            <div className={styles.field}>
              <div className={styles.label}>ПОЛ</div>
              <div className={styles.btnGroup}>
                <button className={`${styles.toggle} ${form.gender === 'мужчина' ? styles.toggleActive : ''}`} onClick={() => set('gender', 'мужчина')}>М</button>
                <button className={`${styles.toggle} ${form.gender === 'женщина' ? styles.toggleActive : ''}`} onClick={() => set('gender', 'женщина')}>Ж</button>
              </div>
            </div>
            <div className={styles.field}>
              <div className={styles.label}>ВОЗРАСТ</div>
              <input className={styles.input} type="number" value={form.age} onChange={e => set('age', +e.target.value)} min={10} max={80} />
            </div>
            <div className={styles.field}>
              <div className={styles.label}>РОСТ</div>
              <input className={styles.input} type="number" value={form.height} onChange={e => set('height', +e.target.value)} min={140} max={220} />
            </div>
            <div className={styles.field}>
              <div className={styles.label}>ВЕС</div>
              <input className={styles.input} type="number" value={form.weight} onChange={e => set('weight', +e.target.value)} min={40} max={200} />
            </div>
          </div>

          <div className={styles.field} style={{ marginBottom: 12 }}>
            <div className={styles.label}>ЦЕЛЬ</div>
            <div className={styles.btnGroup}>
              {['набор массы','сила','похудение и рельеф','выносливость'].map(g => (
                <button key={g} className={`${styles.toggle} ${form.goal === g ? styles.toggleActive : ''}`} onClick={() => set('goal', g)}>
                  {g === 'набор массы' ? 'МАССА' : g === 'сила' ? 'СИЛА' : g === 'похудение и рельеф' ? 'РЕЛЬЕФ' : 'ВЫНОСЛ.'}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field} style={{ marginBottom: 32 }}>
            <div className={styles.label}>УРОВЕНЬ</div>
            <div className={styles.btnGroup}>
              {['новичок','средний уровень','продвинутый'].map(l => (
                <button key={l} className={`${styles.toggle} ${form.level === l ? styles.toggleActive : ''}`} onClick={() => set('level', l)}>
                  {l === 'новичок' ? 'НОВИЧОК' : l === 'средний уровень' ? 'СРЕДНИЙ' : 'ПРОДВ.'}
                </button>
              ))}
            </div>
          </div>

          <button className={styles.btn} onClick={handleGenerate}>
            СГЕНЕРИРОВАТЬ →
          </button>
        </div>

        {/* RIGHT - results */}
        <div className={styles.right}>
          <PlanBox
            title="ПИТАНИЕ"
            loading={loadingN}
            content={nutrition}
            placeholder="Заполни данные и нажми кнопку"
          />
          <PlanBox
            title="СОН И ВОССТАНОВЛЕНИЕ"
            loading={loadingR}
            content={recovery}
            placeholder="Рекомендации по восстановлению"
          />
        </div>

      </div>
    </div>
  )
}
