import axios from 'axios'

const api = axios.create({
  baseURL: 'https://forge-go-production.up.railway.app',
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000
})

const API = import.meta.env.VITE_API_URL

// 🔥 Трансформация с фиксом регистра
const transformWorkoutData = (data) => ({
  days: Number(data.days),
  gender: String(data.gender).toLowerCase().replace('мужчина', 'мужской').replace('женщина', 'женский'),
  age: Number(data.age),
  height: Number(data.height),
  weight: Number(data.weight),
goal: String(data.goal).toLowerCase()
  .replace('набор массы', 'похудение')  // ← Временно костыль
  .replace('рельеф', 'рельеф')
  .replace('сила', 'сила')
  .replace('выносливость', 'выносливость')
  .replace('похудение', 'похудение'),
  level: String(data.level).toLowerCase(),
  equipment: String(data.equipment)
})

const transformTipsData = (data) => ({
  gender: String(data.gender).toLowerCase().replace('мужчина', 'мужской').replace('женщина', 'женский'),
  age: Number(data.age),
  weight: Number(data.weight),
  goal: String(data.goal).toLowerCase()
    .replace('набор массы', 'масса')
    .replace('рельеф', 'рельеф'),
  level: String(data.level).toLowerCase(),
  plan: String(data.plan || '')
})

const transformRecoveryData = (data) => ({
  age: Number(data.age),
  goal: String(data.goal).toLowerCase()
    .replace('набор массы', 'масса')
    .replace('рельеф', 'рельеф'),
  level: String(data.level).toLowerCase()
})

// 🔥 Возвращаем старый формат для совместимости
export async function generatePlan(data, signal) {
  const res = await fetch(`${API}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    signal // ← вот это
  })
  return res.json()
}


export const generateTips = async (data) => {
  const transformed = transformTipsData(data)
  const response = await api.post('/tips', transformed)
  
  // 🔥 Адаптер: превращаем массив в текст
  if (response.data.success && response.data.data?.tips) {
    return {
      tips: response.data.data.tips.map((t, i) => `${i + 1}. ${t}`).join('\n')
    }
  }
  return response.data
}

export const generateRecovery = async (data) => {
  const transformed = transformRecoveryData(data)
  const response = await api.post('/recovery', transformed)
  
  // 🔥 Адаптер: превращаем массив в текст
  if (response.data.success && response.data.data?.tips) {
    return {
      plan: response.data.data.tips.map((t, i) => `${i + 1}. ${t}`).join('\n')
    }
  }
  return response.data
}


export const generateLooksMaxTip = async (data) => {
  const transformed = {
    age: Number(data.age),
    gender: String(data.gender).toLowerCase(),
    bf: Number(data.bf || 0),
    weight: Number(data.weight),
    height: Number(data.height)
  }
  
  const response = await api.post('/looksmax-tip', transformed)
  return response.data
}
