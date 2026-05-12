import { useState, useRef } from 'react'
import styles from './BeforeAfterSlider.module.css'

export default function BeforeAfterSlider({ before, after, labelLeft = 'ДО', labelRight = 'ПОСЛЕ' }) {
  const [pos, setPos] = useState(50)
  const containerRef = useRef(null)

  const handleMove = (e) => {
    const rect = containerRef.current.getBoundingClientRect()
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100))
    setPos(pct)
  }

  return (
    <div
      ref={containerRef}
      className={styles.slider}
      onMouseMove={handleMove}
      onTouchMove={handleMove}
    >
      <img src={before} alt={labelLeft} className={styles.sliderImg} />
      <div className={styles.sliderAfter} style={{ width: `${pos}%` }}>
        <img src={after} alt={labelRight} className={styles.sliderImg} />
      </div>
      <div className={styles.sliderHandle} style={{ left: `${pos}%` }}>
        <div className={styles.sliderLine} />
        <div className={styles.sliderCircle}>↔</div>
      </div>
      <div className={styles.sliderLabelLeft}>{labelLeft}</div>
      <div className={styles.sliderLabelRight}>{labelRight}</div>
    </div>
  )
}
