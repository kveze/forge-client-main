import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import styles from './Landing.module.css'
import Header from '../components/Header'

const STEPS = [
  {
    num: '01',
    title: 'Ответь на 5 вопросов',
    desc: 'Пол, цель, уровень и оборудование. Займёт ~30 секунд.',
  },
  {
    num: '02',
    title: 'AI собирает план',
    desc: 'Программа под тебя — не под “среднего человека” из интернета.',
  },
  {
    num: '03',
    title: 'Начинаешь тренироваться',
    desc: 'Чёткий план + питание + восстановление. Без лишней информации.',
  },
]

const FEATURES = [
  {
    icon: '⚡',
    title: 'Не шаблон',
    desc: 'Учитывает твой уровень, оборудование и цель. Каждый план уникален.',
  },
  {
    icon: '🏠',
    title: 'Под любые условия',
    desc: 'Дома, во дворе или в зале. План адаптируется под то, что у тебя есть.',
  },
  {
    icon: '🥩',
    title: 'Питание',
    desc: 'Что есть в дни тренировок и отдыха. Конкретно и без “воды”.',
  },
  {
    icon: '🔄',
    title: 'Восстановление',
    desc: 'Сон, отдых, боль в мышцах — что делать и как ускорить прогресс.',
  },
]

const REVIEWS = [
  {
    name: 'Артём К.',
    age: 23,
    text: 'Тренируюсь во дворе — турник и брусья. Впервые получил план именно под это, а не под зал.',
  },
  {
    name: 'Даша М.',
    age: 19,
    text: 'Дали не только упражнения, но и питание + восстановление. Это уже как тренер, а не генератор.',
  },
]

export default function Landing() {
  const navigate = useNavigate()
  const { user } = useAuth()

  return (
    <div className={styles.page}>

      <Header variant="landing" />

      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroLeft}>

          <div className={styles.heroTag}>// AI ТРЕНЕР</div>

          <h1 className={styles.heroTitle}>
            ПЛАН ТРЕНИРОВОК<br />
            <em>ПОД ТЕБЯ</em><br />
            ЗА 30 СЕКУНД
          </h1>

          <p className={styles.heroSub}>
            Учитывает твой уровень, цель и оборудование.<br />
            Без шаблонов. Без лишней информации.
          </p>

          <button
            className={styles.heroCta}
            onClick={() => navigate('/generate')}
          >
            ПОЛУЧИТЬ ПЛАН →
          </button>



        </div>

        <div className={styles.heroRight}>
          <div className={styles.previewCard}>
            <div className={styles.previewTag}>// ПРИМЕР</div>

            <div className={styles.previewHeader}>
              FULL BODY / BEGINNER
            </div>

            <div className={styles.previewDay}>Понедельник</div>
            <div className={styles.previewItem}>Отжимания — 4 × 15</div>
            <div className={styles.previewItem}>Подтягивания — 4 × 8</div>
            <div className={styles.previewItem}>Брусья — 3 × 12</div>
            <div className={styles.previewItem}>Планка — 3 × 60 сек</div>

            <div className={styles.previewDay} style={{ marginTop: 16 }}>
              Среда
            </div>
            <div className={styles.previewItem}>Приседания — 4 × 20</div>
            <div className={styles.previewItem}>Выпады — 3 × 15</div>
            <div className={styles.previewItem}>Отжимания узкие — 3 × 12</div>

            <div className={styles.previewBlur} />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className={styles.section}>
        <div className={styles.sectionInner}>

          <div className={styles.sectionTag}>// КАК ЭТО РАБОТАЕТ</div>

          <h2 className={styles.sectionTitle}>
            3 ШАГА ДО <em>РЕЗУЛЬТАТА</em>
          </h2>

          <div className={styles.stepsGrid}>
            {STEPS.map(s => (
              <div key={s.num} className={styles.stepCard}>
                <div className={styles.stepNum}>{s.num}</div>
                <div className={styles.stepTitle}>{s.title}</div>
                <div className={styles.stepDesc}>{s.desc}</div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* FEATURES */}
      <section className={styles.section}>
        <div className={styles.sectionInner}>

          <div className={styles.sectionTag}>// ВОЗМОЖНОСТИ</div>

          <h2 className={styles.sectionTitle}>
            ЧТО ТЫ <em>ПОЛУЧАЕШЬ</em>
          </h2>

          <div className={styles.featuresGrid}>
            {FEATURES.map(f => (
              <div key={f.title} className={styles.featureCard}>
                <div className={styles.featureIcon}>{f.icon}</div>
                <div className={styles.featureTitle}>{f.title}</div>
                <div className={styles.featureDesc}>{f.desc}</div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* REVIEWS */}


      {/* CTA */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaInner}>

          <h2 className={styles.ctaTitle}>
            НАЧНИ <em>СЕГОДНЯ</em>
          </h2>

          <p className={styles.ctaSub}>
            План готов за 30 секунд. Бесплатно.
          </p>

          <button
            className={styles.heroCta}
            onClick={() => navigate('/generate')}
          >
            ПОЛУЧИТЬ ПЛАН →
          </button>

        </div>
      </section>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.footerLogo}>
          FOR<span>G</span>E
        </div>
        <div className={styles.footerText}>
          © 2026 Forge. Все права защищены.
        </div>
      </footer>

    </div>
  )
}

//sadas//