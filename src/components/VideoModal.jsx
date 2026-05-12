import { useState, useEffect } from 'react'
import styles from './VideoModal.module.css'

const MAX_SHORT_DURATION_SEC = 90

function parseDurationSeconds(iso) {
  // ISO 8601 duration: PT#M#S
  const match = iso?.match(/PT(?:(\d+)M)?(?:(\d+)S)?/)
  const mins = parseInt(match?.[1] || 0)
  const secs = parseInt(match?.[2] || 0)
  return mins * 60 + secs
}

async function searchExerciseVideo(exerciseName, apiKey) {
  const query = encodeURIComponent(`${exerciseName} техника выполнения`)
  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&maxResults=5&videoDuration=short&key=${apiKey}`

  const searchData = await fetch(searchUrl).then(r => r.json())
  const items = searchData.items || []
  if (!items.length) return null

  // Проверяем длительность через отдельный запрос
  const ids = items.map(i => i.id.videoId).join(',')
  const detailUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${ids}&key=${apiKey}`
  const detailData = await fetch(detailUrl).then(r => r.json())

  // Ищем видео до 90 секунд
  const short = detailData.items?.find(
    v => parseDurationSeconds(v.contentDetails.duration) <= MAX_SHORT_DURATION_SEC
  )

  // Fallback на первое из поиска если короткого нет
  return short?.id || items[0]?.id?.videoId || null
}

export default function VideoModal({ exerciseName, onClose }) {
  const [videoId, setVideoId] = useState(null)
  const [loading, setLoading] = useState(true)
  const apiKey = import.meta.env.VITE_YOUTUBE_KEY

  useEffect(() => {
    let cancelled = false

    searchExerciseVideo(exerciseName, apiKey)
      .then(id => { if (!cancelled) setVideoId(id) })
      .catch(() => { if (!cancelled) setVideoId(null) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [exerciseName, apiKey])

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
