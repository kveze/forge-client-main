import { useState } from 'react'
import styles from './Wizard.module.css'

const TOTAL = 6

const EQUIPMENT_OPTIONS = [
  'только тело', 'турник', 'брусья', 'гантели',
  'штанга', 'скакалка', 'кольца', 'тренажёры'
]

function ProgressBar({ current }) {
  return (
    <div className={styles.progressBar}>
      {Array.from({ length: TOTAL }, (_, i) => (
        <div
          key={i}
          className={`${styles.seg} ${i + 1 < current ? styles.done : i + 1 === current ? styles.active : ''}`}
        />
      ))}
    </div>
  )
}

function OptionCard({ title, desc, selected, onClick }) {
  return (
    <div className={`${styles.optionCard} ${selected ? styles.selected : ''}`} onClick={onClick}>
      <div className={styles.optionTitle}>{title}</div>
      {desc && <div className={styles.optionDesc}>{desc}</div>}
    </div>
  )
}

function NumInput({ label, id, value, onChange, min, max, unit }) {
  const dec = () => onChange(Math.max(min, value - 1))
  const inc = () => onChange(Math.min(max, value + 1))
  return (
    <div className={styles.numWrap}>
      <div className={styles.numHint}>{label}</div>
      <div className={styles.numInputWrap}>
        <button className={styles.numBtn} onClick={dec}>−</button>
        <input
          className={styles.numInput}
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={e => onChange(Math.min(max, Math.max(min, parseInt(e.target.value) || min)))}
        />
        <button className={styles.numBtn} onClick={inc}>+</button>
      </div>
      <div className={styles.numHint}>{unit}</div>
    </div>
  )
}

export default function Wizard({ onSubmit }) {
  const [step, setStep] = useState(1)
  const [data, setData] = useState({
    gender: null,
    age: 20, height: 175, weight: 70,
    goal: null, level: null,
    equipment: ['только тело'],
    days: 4
  })

  const set = (key, val) => setData(d => ({ ...d, [key]: val }))

  const toggleEquip = (val) => {
    setData(d => ({
      ...d,
      equipment: d.equipment.includes(val)
        ? d.equipment.filter(e => e !== val)
        : [...d.equipment, val]
    }))
  }

  const next = () => setStep(s => s + 1)
  const back = () => setStep(s => s - 1)

  const dayLabel = (v) => {
    const labels = ['','ДЕНЬ','ДНЯ','ДНЯ','ДНЯ','ДНЕЙ','ДНЕЙ','ДНЕЙ']
    return `${v} ${labels[v]}`
  }

  const handleSubmit = () => {
    onSubmit({
      ...data,
      equipment: data.equipment.join(', ') || 'только тело'
    })
  }

  return (
    <div className={styles.wizard}>
      <ProgressBar current={step} />

      {step === 1 && (
        <div className={styles.step}>
          <div className={styles.stepNum}>01 / 06 — КТО ТЫ</div>
          <div className={styles.question}>КТО<br />ТЫ <em>ТАКОЙ</em></div>
          <div className={`${styles.grid} ${styles.cols2}`}>
            <OptionCard title="МУЖЧИНА" selected={data.gender === 'мужчина'} onClick={() => set('gender', 'мужчина')} />
            <OptionCard title="ЖЕНЩИНА" selected={data.gender === 'женщина'} onClick={() => set('gender', 'женщина')} />
          </div>
          <div className={styles.nav}>
            <button className={styles.btnNext} onClick={next} disabled={!data.gender}>ДАЛЕЕ →</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className={styles.step}>
          <div className={styles.stepNum}>02 / 06 — ТЕЛО</div>
          <div className={styles.question}>ТВОИ<br /><em>ЦИФРЫ</em></div>
          <div className={styles.numRow}>
            <NumInput label="ВОЗРАСТ" value={data.age} onChange={v => set('age', v)} min={10} max={80} unit="лет" />
            <NumInput label="РОСТ" value={data.height} onChange={v => set('height', v)} min={140} max={220} unit="см" />
            <NumInput label="ВЕС" value={data.weight} onChange={v => set('weight', v)} min={40} max={200} unit="кг" />
          </div>
          <div className={styles.nav}>
            <button className={styles.btnBack} onClick={back}>← НАЗАД</button>
            <button className={styles.btnNext} onClick={next}>ДАЛЕЕ →</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className={styles.step}>
          <div className={styles.stepNum}>03 / 06 — ЦЕЛЬ</div>
          <div className={styles.question}>ЧЕГО<br />ТЫ <em>ХОЧЕШЬ</em></div>
          <div className={`${styles.grid} ${styles.cols2}`}>
            {[
              { val: 'набор массы', title: 'МАССА', desc: 'Стать больше и тяжелее' },
              { val: 'сила', title: 'СИЛА', desc: 'Поднимать больше' },
              { val: 'похудение и рельеф', title: 'РЕЛЬЕФ', desc: 'Сжечь жир, оставить мышцы' },
              { val: 'выносливость', title: 'ВЫНОСЛИВОСТЬ', desc: 'Не умирать после 5 минут' },
            ].map(o => (
              <OptionCard key={o.val} title={o.title} desc={o.desc} selected={data.goal === o.val} onClick={() => set('goal', o.val)} />
            ))}
          </div>
          <div className={styles.nav}>
            <button className={styles.btnBack} onClick={back}>← НАЗАД</button>
            <button className={styles.btnNext} onClick={next} disabled={!data.goal}>ДАЛЕЕ →</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className={styles.step}>
          <div className={styles.stepNum}>04 / 06 — ОПЫТ</div>
          <div className={styles.question}>КАК<br />ДАВНО В<br /><em>ТЕМЕ</em></div>
          <div className={styles.grid}>
            {[
              { val: 'новичок', title: 'НОВИЧОК', desc: 'До 6 месяцев или начинаю с нуля' },
              { val: 'средний уровень', title: 'СРЕДНИЙ', desc: '6 месяцев — 2 года, знаю базу' },
              { val: 'продвинутый', title: 'ПРОДВИНУТЫЙ', desc: '2+ года, понимаю что делаю' },
            ].map(o => (
              <OptionCard key={o.val} title={o.title} desc={o.desc} selected={data.level === o.val} onClick={() => set('level', o.val)} />
            ))}
          </div>
          <div className={styles.nav}>
            <button className={styles.btnBack} onClick={back}>← НАЗАД</button>
            <button className={styles.btnNext} onClick={next} disabled={!data.level}>ДАЛЕЕ →</button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className={styles.step}>
          <div className={styles.stepNum}>05 / 06 — ОБОРУДОВАНИЕ</div>
          <div className={styles.question}>ЧТО<br />У ТЕБЯ<br /><em>ЕСТЬ</em></div>
          <div className={styles.chips}>
            {EQUIPMENT_OPTIONS.map(eq => (
              <div
                key={eq}
                className={`${styles.chip} ${data.equipment.includes(eq) ? styles.chipSelected : ''}`}
                onClick={() => toggleEquip(eq)}
              >
                {eq}
              </div>
            ))}
          </div>
          <div className={styles.hint}>Можно выбрать несколько</div>
          <div className={styles.nav}>
            <button className={styles.btnBack} onClick={back}>← НАЗАД</button>
            <button className={styles.btnNext} onClick={next}>ДАЛЕЕ →</button>
          </div>
        </div>
      )}

      {step === 6 && (
        <div className={styles.step}>
          <div className={styles.stepNum}>06 / 06 — ЧАСТОТА</div>
          <div className={styles.question}>СКОЛЬКО<br />ДНЕЙ В<br /><em>НЕДЕЛЮ</em></div>
          <div className={styles.sliderWrap}>
            <div className={styles.sliderLabels}><span>2 ДНЯ</span><span>7 ДНЕЙ</span></div>
            <input
              type="range" min={2} max={7} value={data.days}
              onChange={e => set('days', parseInt(e.target.value))}
            />
            <div className={styles.sliderVal}>{dayLabel(data.days)}</div>
          </div>
          <div className={styles.nav}>
            <button className={styles.btnBack} onClick={back}>← НАЗАД</button>
            <button className={styles.btnNext} onClick={handleSubmit}>СГЕНЕРИРОВАТЬ →</button>
          </div>
        </div>
      )}
    </div>
  )
}
