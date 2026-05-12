import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://forge-go-production.up.railway.app',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

const transformTipsData = (data) => ({
  gender: String(data.gender).toLowerCase(),
  age: Number(data.age),
  weight: Number(data.weight),
  goal: String(data.goal).toLowerCase(),
  level: String(data.level).toLowerCase(),
  plan: String(data.plan || ''),
})

const transformRecoveryData = (data) => ({
  age: Number(data.age),
  goal: String(data.goal).toLowerCase(),
  level: String(data.level).toLowerCase(),
})

export async function generatePlan(data, signal) {
  const response = await api.post('/generate', data, { signal })
  return response.data
}

export const generateTips = async (data) => {
  const response = await api.post('/tips', transformTipsData(data))
  if (response.data.success && response.data.data?.tips) {
    return {
      tips: response.data.data.tips.map((t, i) => `${i + 1}. ${t}`).join('\n')
    }
  }
  return response.data
}

export const generateRecovery = async (data) => {
  const response = await api.post('/recovery', transformRecoveryData(data))
  if (response.data.success && response.data.data?.tips) {
    return {
      plan: response.data.data.tips.map((t, i) => `${i + 1}. ${t}`).join('\n')
    }
  }
  return response.data
}

export const generateNutrition = generateTips

export const generateLooksMaxTip = async (data) => {
  const response = await api.post('/looksmax-tip', {
    age: Number(data.age),
    gender: String(data.gender).toLowerCase(),
    bf: Number(data.bf || 0),
    weight: Number(data.weight),
    height: Number(data.height),
  })
  return response.data
}

export const analyzeFace = async ({ imageBase64, age, gender, goal }) => {
  const response = await api.post('/looksmax-analyze', {
    image_base64: imageBase64,
    age,
    gender,
    goal,
  })
  return response.data
}

export const transformFace = async ({ imageBase64, tips, gender }) => {
  const response = await api.post('/looksmax-transform', {
    image_base64: imageBase64,
    tips,
    gender,
  })
  return response.data
}

// Chat /chat endpoint — раньше дёргался сырым fetch'ом в Chat.jsx.
// Принимает массив сообщений в формате [{role, content}, ...] и
// опциональные данные пользователя/план.
export const sendChatMessage = async ({ messages, userData, plan }) => {
  const response = await api.post('/chat', {
    messages,
    userData: userData || null,
    plan: plan || null,
  })
  return response.data
}

// Raw POST для случаев когда нужно дёрнуть /tips или /recovery
// напрямую с уже подготовленным payload (как в Chat при инициализации плана).
// Возвращает сырой ответ, не делает join по tips.
export const fetchTipsRaw = async (payload) => {
  const response = await api.post('/tips', payload)
  return response.data
}

export const fetchRecoveryRaw = async (payload) => {
  const response = await api.post('/recovery', payload)
  return response.data
}
