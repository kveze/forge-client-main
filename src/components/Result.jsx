import styles from './Result.module.css'

const DAYS = ['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье']

function highlightDays(text) {
  let result = text
  DAYS.forEach(day => {
    result = result.replaceAll(day, `##DAY##${day}##/DAY##`)
  })
  return result.split(/(##DAY##.*?##\/DAY##)/g).map((part, i) => {
    if (part.startsWith('##DAY##')) {
      const day = part.replace('##DAY##', '').replace('##/DAY##', '')
      return <span key={i} className={styles.day}>{day}</span>
    }
    return part
  })
}

export default function Result({ plan, loading, error, userData }) {
  const pills = [
    userData?.gender,
    userData?.age ? `${userData.age} лет` : null,
    userData?.height ? `${userData.height} см` : null,
    userData?.weight ? `${userData.weight} кг` : null,
    userData?.goal,
    userData?.level,
    userData?.equipment,
    userData?.days ? `${userData.days} дн/нед` : null,
  ].filter(Boolean)

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.title}>ПРОГРАММА</div>
        <div className={`${styles.status} ${loading ? styles.statusLoading : plan ? styles.statusDone : ''}`}>
          {loading ? '// ГЕНЕРАЦИЯ...' : plan ? '// ГОТОВО' : '// ОЖИДАНИЕ'}
        </div>
      </div>

      {pills.length > 0 && (
        <div className={styles.pills}>
          {pills.map((p, i) => (
            <div key={i} className={`${styles.pill} ${i < 2 ? styles.pillRed : ''}`}>{p}</div>
          ))}
        </div>
      )}

      <div className={styles.box}>
        {!plan && !loading && !error && (
          <div className={styles.placeholder}>
            <div className={styles.phLogo}>FORGE</div>
            <div className={styles.phText}>Пройди 6 шагов → получи план</div>
          </div>
        )}

        {loading && (
          <div className={styles.loading}>
            <div className={styles.dot} />
            <div className={styles.dot} />
            <div className={styles.dot} />
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}

        {plan && !loading && (
          <div className={styles.content}>
            {highlightDays(plan)}
          </div>
        )}
      </div>
    </div>
  )
}
