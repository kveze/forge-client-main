// Утилиты для работы с планом тренировок.

// Дни недели как их отдаёт Date.getDay() (0 = воскресенье)
export const DAYS_RU = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота']

// Дни недели в порядке плана (Пн → Вс)
export const DAYS_PLAN = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье']

/**
 * Возвращает день из плана, соответствующий сегодняшней дате.
 * Если в плане меньше 7 дней — берёт по модулю (циклически).
 * @returns {object|null}
 */
export function getTodayPlan(plan) {
  if (!plan) return null
  const days = Array.isArray(plan) ? plan : plan?.week_plan
  if (!days?.length) return null

  const todayName = DAYS_RU[new Date().getDay()]
  const todayIndex = DAYS_PLAN.indexOf(todayName)
  if (todayIndex === -1) return null

  return days[todayIndex % days.length] || null
}

/**
 * Название сегодняшнего дня по-русски.
 */
export function todayDayName() {
  return DAYS_RU[new Date().getDay()]
}
