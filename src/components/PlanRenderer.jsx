import { useState, useEffect } from 'react'
import styles from './PlanRenderer.module.css'

function VideoModal({ exerciseName, onClose }) {
  const [videoId, setVideoId] = useState(null)
  const [loading, setLoading] = useState(true)
  const KEY = import.meta.env.VITE_YOUTUBE_KEY

  useEffect(() => {
    const query = encodeURIComponent(`${exerciseName} техника выполнения`)
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&maxResults=5&videoDuration=short&key=${KEY}`

    fetch(searchUrl)
      .then(r => r.json())
      .then(async data => {
        const items = data.items || []
        if (!items.length) { setVideoId(null); return }

        // Берём IDs и проверяем длительность
        const ids = items.map(i => i.id.videoId).join(',')
        const detailUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${ids}&key=${KEY}`
        const detailRes = await fetch(detailUrl).then(r => r.json())

        // Ищем видео до 90 секунд
        const short = detailRes.items?.find(v => {
          const dur = v.contentDetails.duration
          const match = dur.match(/PT(?:(\d+)M)?(?:(\d+)S)?/)
          const mins = parseInt(match?.[1] || 0)
          const secs = parseInt(match?.[2] || 0)
          return mins === 0 && secs <= 90
        })

        // Если не нашли короткое — берём первое
        setVideoId(short?.id || items[0]?.id?.videoId || null)
      })
      .catch(() => setVideoId(null))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>{exerciseName}</span>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>
          {loading && <div className={styles.modalLoading}>// ЗАГРУЗКА...</div>}
          {!loading && !videoId && <div className={styles.modalLoading}>// ВИДЕО НЕ НАЙДЕНО</div>}
          {!loading && videoId && (
            <iframe
              className={styles.videoFrame}
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          )}
        </div>
      </div>
    </div>
  )
}


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
