import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { db } from '../firebase'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import styles from './Today.module.css'
import Header from '../components/Header'
import PlanRenderer from '../components/PlanRenderer'

function calculateTodayWorkout(data) {
  if (!data?.plan) return null

  if (!data.lastWorkoutDate) {
    return { day: 1, isRest: false, reason: 'Погнали!' }
  }

  const last = new Date(data.lastWorkoutDate)
  const now = new Date()
  const daysSince = Math.floor((now - last) / 86400000)

  if (daysSince < 2) {
    return {
      isRest: true,
      reason: 'Восстановление',
      nextWorkout: new Date(last.getTime() + 2 * 86400000).toLocaleDateString('ru-RU', {
        day: 'numeric', month: 'short'
      })
    }
  }

  const nextDay = data.nextWorkoutDay || 1
  const actualDay = nextDay > 3 ? 1 : nextDay

  return {
    day: actualDay,
    isRest: false,
    reason: actualDay === 1 ? 'Новый цикл' : 'Продолжаем'
  }
}

export default function Today() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [planData, setPlanData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [done, setDone] = useState(false)
  const [saving, setSaving] = useState(false)
  const [todayWorkout, setTodayWorkout] = useState(null)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    if (!user) return

    Promise.all([
      getDoc(doc(db, 'plans', user.uid)),
      getDoc(doc(db, 'streaks', user.uid))
    ]).then(([planSnap]) => {
      if (planSnap.exists()) {
        const data = planSnap.data()
        setPlanData(data)
        setTodayWorkout(calculateTodayWorkout(data))
        if (data.completedWorkouts?.some(w => w.date === today)) {
          setDone(true)
        }
      }
    }).finally(() => setLoading(false))
  }, [user])

  const handleDone = async () => {
    if (done || saving) return
    setSaving(true)

    try {
      const ref = doc(db, 'plans', user.uid)
      const streakRef = doc(db, 'streaks', user.uid)

      const nextDay = (planData.nextWorkoutDay || 1) + 1
      await updateDoc(ref, {
        lastWorkoutDate: today,
        nextWorkoutDay: nextDay > 3 ? 1 : nextDay,
        completedWorkouts: [...(planData.completedWorkouts || []), {
          day: todayWorkout.day,
          date: today
        }]
      })

      const streakSnap = await getDoc(streakRef)
      if (streakSnap.exists()) {
        const streakData = streakSnap.data()
        const lastStreak = streakData.lastWorkoutDate || null
        let newStreak = streakData.currentStreak || 0
        if (lastStreak) {
          const daysSince = (new Date(today) - new Date(lastStreak)) / 86400000
          if (daysSince <= 3) newStreak++
        } else {
          newStreak = 1
        }
        await updateDoc(streakRef, {
          currentStreak: newStreak,
          longestStreak: Math.max(newStreak, streakData.longestStreak || 0),
          totalWorkouts: (streakData.totalWorkouts || 0) + 1,
          lastWorkoutDate: today
        })
      } else {
        await setDoc(streakRef, {
          currentStreak: 1,
          longestStreak: 1,
          totalWorkouts: 1,
          lastWorkoutDate: today,
          dates: [today]
        })
      }

      setDone(true)

      const updatedData = {
        ...planData,
        lastWorkoutDate: today,
        nextWorkoutDay: nextDay > 3 ? 1 : nextDay
      }
      setTodayWorkout(calculateTodayWorkout(updatedData))
    } catch (e) {
      console.error('Ошибка сохранения:', e)
    } finally {
      setSaving(false)
    }
  }

  function getExercisesForDay(dayNum) {
    if (!planData?.plan) return null
    const plan = planData.plan
    if (Array.isArray(plan)) {
      return plan.find(d => d.day === dayNum) || plan[dayNum - 1]
    }
    return null
  }

  const currentExercises = todayWorkout?.day ? getExercisesForDay(todayWorkout.day) : null
  const streak = planData?.completedWorkouts?.length || 0

  return (
    <div className={styles.page}>
      <Header variant="today" />

      <div className={styles.body}>
        {loading && (
          <div className={styles.center}>
            <div className={styles.dots}><span /><span /><span /></div>
          </div>
        )}

        {!loading && !planData && (
          <div className={styles.center}>
            <div className={styles.emptyIcon}>📋</div>
            <div className={styles.emptyTitle}>Нет сохранённого плана</div>
            <div className={styles.emptyText}>Сначала создай и сохрани план тренировок</div>
            <button className={styles.accentBtn} onClick={() => navigate('/generate')}>Создать план →</button>
          </div>
        )}

        {!loading && planData && (
          <>
            <div className={styles.streakCard}>
              <div className={styles.streakFire}>🔥</div>
              <div className={styles.streakInfo}>
                <div className={styles.streakNum}>{streak}</div>
                <div className={styles.streakLabel}>
                  {streak === 1 ? 'тренировка' : streak < 5 ? 'тренировки' : 'тренировок'}
                </div>
              </div>
              {done && <div className={styles.streakDone}>✓ Сегодня зачтено</div>}
            </div>

            <div className={styles.todayHeader}>
              <div className={styles.todayDay}>
                {todayWorkout?.isRest ? 'День отдыха' : `День ${todayWorkout?.day}`}
              </div>
              <div className={styles.todayLabel}>{todayWorkout?.reason || ''}</div>
            </div>

            {todayWorkout?.isRest ? (
              <div className={styles.restCard}>
                <div className={styles.restIcon}>😴</div>
                <div className={styles.restTitle}>Восстановление</div>
                <div className={styles.restText}>
                  Мышцы растут во время отдыха. Следующая тренировка: {todayWorkout.nextWorkout}
                </div>
                {!done ? (
                  <button className={styles.doneBtn} onClick={handleDone} disabled={saving}>
                    {saving ? 'Сохраняем...' : '✓ Отметить день отдыха'}
                  </button>
                ) : (
                  <div className={styles.doneBadge}>✓ День отмечен</div>
                )}
              </div>
            ) : (
              <div className={styles.workoutCard}>
                {currentExercises ? (
                  <PlanRenderer plan={[currentExercises]} />
                ) : (
                  <div className={styles.noPlan}>Нет данных для этого дня</div>
                )}

                {!done ? (
                  <button className={styles.doneBtn} onClick={handleDone} disabled={saving}>
                    {saving ? 'Сохраняем...' : '✓ Тренировка выполнена'}
                  </button>
                ) : (
                  <div className={styles.doneBadge}>🔥 Красава! Тренировка зачтена</div>
                )}
              </div>
            )}

            <div className={styles.weekCard}>
              <div className={styles.weekTitle}>Прогресс</div>
              <div className={styles.weekStats}>
                <div className={styles.stat}>
                  <div className={styles.statNum}>{streak}</div>
                  <div className={styles.statLabel}>Всего тренировок</div>
                </div>
                <div className={styles.stat}>
                  <div className={styles.statNum}>{planData?.nextWorkoutDay || 1}/3</div>
                  <div className={styles.statLabel}>Текущий день</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
