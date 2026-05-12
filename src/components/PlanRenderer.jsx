import { useState } from 'react'
import VideoModal from './VideoModal'
import styles from './PlanRenderer.module.css'

function DayView({ day }) {
  const [activeVideo, setActiveVideo] = useState(null)

  return (
    <div className={styles.dayView}>
      {activeVideo && (
        <VideoModal exerciseName={activeVideo} onClose={() => setActiveVideo(null)} />
      )}
      <div className={styles.dayFocusLabel}>{day.focus}</div>
      <div className={styles.exercisesList}>
        {day.exercises.map((ex, i) => (
          <div key={i} className={styles.exerciseCard}>
            <div className={styles.exerciseTop}>
              <div className={styles.exerciseName}>{ex.name}</div>
              <button className={styles.watchBtn} onClick={() => setActiveVideo(ex.name)}>
                ▶ КАК ДЕЛАТЬ
              </button>
            </div>
            <div className={styles.exerciseMeta}>
              <span className={styles.metaItem}>
                <span className={styles.metaIcon}>↻</span>
                <span className={styles.metaValue}>{ex.sets} подх.</span>
              </span>
              <span className={styles.metaItem}>
                <span className={styles.metaIcon}>✕</span>
                <span className={styles.metaValue}>{ex.reps}</span>
              </span>
              <span className={styles.metaItem}>
                <span className={styles.metaIcon}>◷</span>
                <span className={styles.metaValue}>{ex.rest_sec}с</span>
              </span>
            </div>
            {ex.notes && (
              <div className={styles.exerciseNotes}>
                <span className={styles.notesIcon}>→</span>
                {ex.notes}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function PlanRenderer({ plan }) {
  const [activeDay, setActiveDay] = useState(0)

  if (!plan) return null
  if (typeof plan === 'string') return <div className={styles.planText}>{plan}</div>

  const days = Array.isArray(plan) ? plan : plan.week_plan
  if (!days) return <div className={styles.planText}>{JSON.stringify(plan, null, 2)}</div>

  return (
    <div className={styles.container}>
      <div className={styles.tabs}>
        {days.map((day, i) => (
          <button
            key={i}
            className={`${styles.tab} ${activeDay === i ? styles.tabActive : ''}`}
            onClick={() => setActiveDay(i)}
          >
            <span className={styles.tabDay}>День {day.day}</span>
            <span className={styles.tabFocus}>{day.focus?.split('/')[0]}</span>
          </button>
        ))}
      </div>
      <DayView day={days[activeDay]} />
    </div>
  )
}
