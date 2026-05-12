// Единая реализация расчёта streak'а.
// Раньше calcStreak дублировалась в Profile.jsx и Chat.jsx с разной
// логикой сравнения дат: Profile использовал toDateString(), Chat —
// toISOString().split('T')[0]. Унифицируем через ISO-дату (YYYY-MM-DD).

const DAY_MS = 86400000

function toISODate(d) {
  return new Date(d).toISOString().split('T')[0]
}

/**
 * Считает streak — сколько подряд дней пользователь отмечал тренировку.
 * Если последняя отметка не "сегодня" и не "вчера" — streak = 0.
 *
 * @param {Array<string|Date>} dates — массив дат (любого формата, парсится через Date)
 * @returns {number}
 */
export function calcStreak(dates) {
  if (!dates?.length) return 0

  const sortedDesc = [...dates]
    .map(toISODate)
    .sort()
    .reverse()

  const today = toISODate(new Date())
  const yesterday = toISODate(Date.now() - DAY_MS)

  if (sortedDesc[0] !== today && sortedDesc[0] !== yesterday) return 0

  let streak = 1
  for (let i = 1; i < sortedDesc.length; i++) {
    const diff = (new Date(sortedDesc[i - 1]) - new Date(sortedDesc[i])) / DAY_MS
    if (diff === 1) streak++
    else break
  }
  return streak
}

export function todayISO() {
  return toISODate(new Date())
}
