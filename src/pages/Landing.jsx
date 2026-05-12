import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import styles from './Landing.module.css'
import Header from '../components/Header'

function useInView(threshold = 0.15) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setInView(true); obs.disconnect() }
    }, { threshold })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  return [ref, inView]
}

function Counter({ to, suffix = '' }) {
  const [val, setVal] = useState(0)
  const [ref, inView] = useInView()
  useEffect(() => {
    if (!inView) return
    let start = 0
    const step = to / 40
    const t = setInterval(() => {
      start += step
      if (start >= to) { setVal(to); clearInterval(t) }
      else setVal(Math.floor(start))
    }, 30)
    return () => clearInterval(t)
  }, [inView, to])
  return <span ref={ref}>{val}{suffix}</span>
}

const STEPS = [
  { num: '01', title: 'Расскажи о себе', desc: 'Пол, возраст, цель, оборудование. 30 секунд — и AI знает всё что нужно.' },
  { num: '02', title: 'AI строит план', desc: 'Не шаблон из интернета. Программа именно под тебя — уровень, цель, условия.' },
  { num: '03', title: 'Тренируйся с умом', desc: 'План + питание + восстановление. Тренер в чате корректирует под тебя.' },
]

const FEATURES = [
  { icon: '⚡', title: 'Персональный план', desc: 'Каждый план уникален. AI учитывает твой уровень, оборудование и цель — без шаблонов.' },
  { icon: '💬', title: 'AI тренер в чате', desc: 'Спроси что угодно. Тренер знает твой план и скорректирует его под тебя.' },
  { icon: '🥩', title: 'Питание', desc: 'Что есть в дни тренировок и отдыха. Конкретно, без воды и абстракций.' },
  { icon: '😴', title: 'Восстановление', desc: 'Сон, отдых, боль в мышцах — конкретные советы для ускорения прогресса.' },
  { icon: '💎', title: 'LooksMax', desc: 'AI анализирует лицо и показывает как ты будешь выглядеть после преображения.' },
  { icon: '🔥', title: 'Streak система', desc: 'Отмечай тренировки, следи за прогрессом и не давай себе остановиться.' },
]

const REVIEWS = [
  { name: 'Артём К.', age: 23, text: 'Тренируюсь во дворе — турник и брусья. Впервые получил план именно под это, а не под зал.' },
  { name: 'Даша М.', age: 19, text: 'Не просто упражнения — питание и восстановление тоже. Это уже как настоящий тренер.' },
  { name: 'Влад Р.', age: 21, text: 'Спросил тренера перестроить план под новые гантели. Через минуту новая программа.' },
]

export default function Landing() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [heroVisible, setHeroVisible] = useState(false)
  const [stepsRef, stepsInView] = useInView()
  const [featRef, featInView] = useInView()
  const [revRef, revInView] = useInView()
  const [statsRef, statsInView] = useInView()

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 100)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className={styles.page}>
      <Header variant="landing" />

      {/* HERO */}
      <section className={styles.hero}>


        <div className={`${styles.heroContent} ${heroVisible ? styles.heroVisible : ''}`}>
          <div className={styles.heroBadge}>
            <span className={styles.heroBadgeDot} />
            AI ТРЕНЕР · ПЕРСОНАЛЬНО ДЛЯ ТЕБЯ
          </div>

          <h1 className={styles.heroTitle}>
            <span className={styles.heroLine1}>ПЛАН</span>
            <span className={styles.heroLine2}>ТРЕНИРОВОК</span>
            <span className={styles.heroLine3}>
              ПОД <em className={styles.fireWord}>ТЕБЯ</em>
            </span>
          </h1>

          <p className={styles.heroSub}>
            AI изучает твой уровень, цель и оборудование.<br />
            Создаёт уникальный план за 30 секунд.
          </p>

          <div className={styles.heroBtns}>
            <button className={styles.heroCta} onClick={() => navigate('/generate')}>
              <span>ПОЛУЧИТЬ ПЛАН</span>
              <span className={styles.ctaArrow}>→</span>
            </button>
          </div>

          <div className={styles.heroProof}>
            <div className={styles.proofAvatars}>
              {['А','Д','В','М'].map((l, i) => (
                <div key={i} className={styles.proofAvatar} style={{ background: ['#FF2D2D','#cc1a1a','#FF2D2D','#8B0000'][i] }}>{l}</div>
              ))}
            </div>
            <div className={styles.proofText}>
              <span className={styles.proofNum}>1,200+</span> уже тренируются по плану
            </div>
          </div>
        </div>

        <div className={`${styles.heroCard} ${heroVisible ? styles.heroCardVisible : ''}`}>
          <div className={styles.cardGlow} />
          <div className={styles.cardHeader}>
            <div className={styles.cardDots}>
              <span style={{ background: '#FF5F57' }} />
              <span style={{ background: '#FFBD2E' }} />
              <span style={{ background: '#28C840' }} />
            </div>
            <div className={styles.cardTitle}>// FORGE ТРЕНЕР</div>
          </div>
          <div className={styles.cardPlan}>
            <div className={styles.cardPlanHeader}>
              <span className={styles.cardPlanBadge}>FULL BODY · BEGINNER</span>
            </div>
            <div className={styles.cardDay}>
              <div className={styles.cardDayLabel}>ПОНЕДЕЛЬНИК</div>
              {['Отжимания — 4 × 15', 'Подтягивания — 4 × 8', 'Брусья — 3 × 12', 'Планка — 3 × 60с'].map((ex, i) => (
                <div key={i} className={styles.cardEx} style={{ animationDelay: `${0.6 + i * 0.1}s` }}>
                  <span className={styles.cardExDot} />{ex}
                </div>
              ))}
            </div>
            <div className={styles.cardDay} style={{ marginTop: 16 }}>
              <div className={styles.cardDayLabel}>СРЕДА</div>
              {['Приседания — 4 × 20', 'Выпады — 3 × 15', 'Отжимания узкие — 3 × 12'].map((ex, i) => (
                <div key={i} className={styles.cardEx} style={{ opacity: 0.5 - i * 0.12 }}>
                  <span className={styles.cardExDot} />{ex}
                </div>
              ))}
            </div>
          </div>
          <div className={styles.cardFade} />
          <div className={styles.cardFooter}>
            <span className={styles.cardFooterTag}>+ питание · восстановление · AI чат</span>
          </div>
        </div>
      </section>

      {/* STATS */}
      <div ref={statsRef} className={`${styles.stats} ${statsInView ? styles.statsVisible : ''}`}>
        {[
          { val: 30, suffix: 'с', label: 'до готового плана' },
          { val: 1200, suffix: '+', label: 'активных пользователей' },
          { val: 100, suffix: '%', label: 'персонально под тебя' },
          { val: 3, suffix: '', label: 'AI модели в работе' },
        ].map((s, i) => (
          <div key={i} className={styles.statItem} style={{ animationDelay: `${i * 0.1}s` }}>
            <div className={styles.statVal}>
              {statsInView ? <Counter to={s.val} suffix={s.suffix} /> : `0${s.suffix}`}
            </div>
            <div className={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* HOW IT WORKS */}
      <section className={styles.section}>
        <div ref={stepsRef} className={`${styles.sectionInner} ${stepsInView ? styles.sectionVisible : ''}`}>
          <div className={styles.sectionTag}>// КАК ЭТО РАБОТАЕТ</div>
          <h2 className={styles.sectionTitle}>3 ШАГА ДО <em>РЕЗУЛЬТАТА</em></h2>
          <div className={styles.stepsWrap}>
            {STEPS.map((s, i) => (
              <div key={s.num} className={styles.stepCard} style={{ animationDelay: `${i * 0.15}s` }}>
                <div className={styles.stepNumWrap}>
                  <div className={styles.stepNum}>{s.num}</div>
                </div>
                <div className={styles.stepBody}>
                  <div className={styles.stepTitle}>{s.title}</div>
                  <div className={styles.stepDesc}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}


      {/* REVIEWS */}


      {/* CTA */}
      <section className={styles.ctaSection}>

        <div className={styles.ctaInner}>
          <div className={styles.sectionTag} style={{ color: 'rgba(255,255,255,0.4)' }}>// НАЧНИ ПРЯМО СЕЙЧАС</div>
          <h2 className={styles.ctaTitle}>
            ГОТОВ<br />
            <em className={styles.fireWordBig}>ИЗМЕНИТЬСЯ?</em>
          </h2>
          <p className={styles.ctaSub}>30 секунд — и у тебя персональный план. Бесплатно.</p>
          <button className={styles.ctaBtn} onClick={() => navigate('/generate')}>
            <span>ПОЛУЧИТЬ ПЛАН</span>
            <span className={styles.ctaBtnArrow}>→</span>
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.footerLogo}>FOR<span>G</span>E</div>
        <div className={styles.footerLinks}>
          <button onClick={() => navigate('/chat')}>Тренер</button>
          <button onClick={() => navigate('/generate')}>Создать план</button>
          <button onClick={() => navigate('/looksmax')}>LooksMax</button>
        </div>
        <div className={styles.footerCopy}>© 2026 Forge. Все права защищены.</div>
      </footer>
    </div>
  )
}
