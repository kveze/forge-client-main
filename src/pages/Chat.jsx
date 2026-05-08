import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { db } from '../firebase'
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore'
import styles from './Chat.module.css'
import Header from '../components/Header'

const FREE_LIMIT = 3
const BACKEND = 'https://forge-go-production.up.railway.app'
const DAYS_RU = ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота']
const DAYS_PLAN = ['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье']

function getTodayPlan(plan) {
  if (!plan) return null
  const days = Array.isArray(plan) ? plan : plan?.week_plan
  if (!days?.length) return null
  const todayName = DAYS_RU[new Date().getDay()]
  const todayIndex = DAYS_PLAN.indexOf(todayName)
  if (todayIndex === -1) return null
  return days[todayIndex % days.length] || null
}

function calcStreak(dates) {
  if (!dates?.length) return 0
  const sorted = [...dates].sort().reverse()
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0
  let streak = 1
  for (let i = 1; i < sorted.length; i++) {
    const diff = (new Date(sorted[i-1]) - new Date(sorted[i])) / 86400000
    if (diff === 1) streak++
    else break
  }
  return streak
}

// ═══════════════════════════════
// TODAY SPLASH — полноэкранный оверлей
// ═══════════════════════════════
// Замени VideoModal и TodaySplash в Chat.jsx на этот код:

function VideoModal({ exerciseName, onClose }) {
  const query = encodeURIComponent(`${exerciseName} упражнение техника`)
  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&maxResults=1&key=${import.meta.env.VITE_YOUTUBE_KEY}`
  const [videoId, setVideoId] = useState(null)
  const [loading, setLoading] = useState(true)

  useState(() => {
    fetch(searchUrl)
      .then(r => r.json())
      .then(data => { setVideoId(data.items?.[0]?.id?.videoId || null) })
      .catch(() => setVideoId(null))
      .finally(() => setLoading(false))
  }, [])

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
            <iframe className={styles.videoFrame}
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
              allow="autoplay; encrypted-media" allowFullScreen />
          )}
        </div>
      </div>
    </div>
  )
}

function TodaySplash({ day, streak, todayDone, onDone, onClose }) {
  const [canDone, setCanDone] = useState(false)
  const [done, setDone] = useState(todayDone)
  const [showSuccess, setShowSuccess] = useState(false)
  const [closing, setClosing] = useState(false)
  const [activeVideo, setActiveVideo] = useState(null)

  useEffect(() => {
    if (!todayDone) {
      const t = setTimeout(() => setCanDone(true), 3000)
      return () => clearTimeout(t)
    }
  }, [todayDone])

  const handleDone = async () => {
    if (!canDone || done) return
    setDone(true)
    setShowSuccess(true)
    await onDone()
    setTimeout(() => {
      setClosing(true)
      setTimeout(onClose, 600)
    }, 2000)
  }

  const handleLater = () => {
    setClosing(true)
    setTimeout(onClose, 400)
  }

  return (
    <div className={`${styles.splash} ${closing ? styles.splashClosing : ''}`}>
      {activeVideo && <VideoModal exerciseName={activeVideo} onClose={() => setActiveVideo(null)} />}
      <div className={styles.splashGlow} />

      {showSuccess ? (
        <div className={styles.splashSuccess}>
          <div className={styles.splashFireBig}>🔥</div>
          <div className={styles.splashStreakNum}>{streak}</div>
          <div className={styles.splashStreakLabel}>
            {streak === 1 ? 'день подряд' : streak < 5 ? 'дня подряд' : 'дней подряд'}
          </div>
          <div className={styles.splashSuccessText}>Красава! Продолжай в том же духе.</div>
        </div>
      ) : (
        <div className={styles.splashContent}>
          <div className={styles.splashTop}>
            <div className={styles.splashDay}>{DAYS_RU[new Date().getDay()]}</div>
            <div className={styles.splashFocus}>{day.focus}</div>
            {streak > 0 && (
              <div className={styles.splashStreak}>
                🔥 {streak} {streak === 1 ? 'день' : streak < 5 ? 'дня' : 'дней'} подряд
              </div>
            )}
          </div>

          <div className={styles.splashExercises}>
            {day.exercises?.map((ex, i) => (
              <div key={i} className={styles.splashEx}>
                <div className={styles.splashExTop}>
                  <div className={styles.splashExName}>{ex.name}</div>
                  <button className={styles.splashWatchBtn} onClick={() => setActiveVideo(ex.name)}>
                    ▶ КАК ДЕЛАТЬ
                  </button>
                </div>
                <div className={styles.splashExMeta}>
                  <span>↻ {ex.sets} подх.</span>
                  <span>✕ {ex.reps}</span>
                  <span>◷ {ex.rest_sec}с</span>
                </div>
                {ex.notes && <div className={styles.splashExNotes}>→ {ex.notes}</div>}
              </div>
            ))}
          </div>

          <div className={styles.splashBtns}>
            {done ? (
              <div className={styles.splashDoneBadge}>✓ Уже отмечено сегодня</div>
            ) : (
              <>
                <button
                  className={`${styles.splashDoneBtn} ${canDone ? styles.splashDoneBtnReady : styles.splashDoneBtnWait}`}
                  onClick={handleDone}
                  disabled={!canDone}
                >
                  {canDone ? '✓ Сделал тренировку' : 'Подождите...'}
                </button>
                <button className={styles.splashLaterBtn} onClick={handleLater}>
                  Сделаю позже →
                </button>
              </>
            )}
            {done && (
              <button className={styles.splashLaterBtn} onClick={handleLater}>
                В чат →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}


function PlanInMessage({ plan, tips, recovery }) {
  const [activeTab, setActiveTab] = useState('plan')
  const [activeDay, setActiveDay] = useState(0)
  const [activeVideo, setActiveVideo] = useState(null)
  const days = Array.isArray(plan) ? plan : plan?.week_plan
  if (!days?.length) return null
  const day = days[activeDay]

  return (
    <div className={styles.planCard}>
      {activeVideo && <VideoModal exerciseName={activeVideo} onClose={() => setActiveVideo(null)} />}
      <div className={styles.planCardTitle}>// ТВОЙ ПЛАН</div>

      {/* Главные табы */}
      <div className={styles.planMainTabs}>
        {[['plan','Тренировки'],['tips','Питание'],['recovery','Восстановление']].map(([key, label]) => (
          <button key={key}
            className={`${styles.planMainTab} ${activeTab === key ? styles.planMainTabActive : ''}`}
            onClick={() => setActiveTab(key)}
          >{label}</button>
        ))}
      </div>

      {activeTab === 'plan' && (
        <>
          <div className={styles.planTabs}>
            {days.map((d, i) => (
              <button key={i}
                className={`${styles.planTab} ${activeDay === i ? styles.planTabActive : ''}`}
                onClick={() => setActiveDay(i)}
              >
                <span className={styles.planTabDay}>День {d.day}</span>
                <span className={styles.planTabFocus}>{d.focus?.split('/')[0]}</span>
              </button>
            ))}
          </div>
          <div className={styles.planContent}>
            <div className={styles.planFocus}>{day.focus}</div>
            {day.exercises?.map((ex, i) => (
              <div key={i} className={styles.planEx}>
                <div className={styles.planExTop}>
                  <div className={styles.planExName}>{ex.name}</div>
                  <button className={styles.planWatchBtn} onClick={() => setActiveVideo(ex.name)}>▶ КАК ДЕЛАТЬ</button>
                </div>
                <div className={styles.planExMeta}>
                  <span>↻ {ex.sets} подх.</span>
                  <span>✕ {ex.reps}</span>
                  <span>◷ {ex.rest_sec}с</span>
                </div>
                {ex.notes && <div className={styles.planExNotes}>→ {ex.notes}</div>}
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === 'tips' && (
        <div className={styles.planContent}>
          {tips?.length ? tips.map((tip, i) => (
            <div key={i} className={styles.tipItem}>
              <span className={styles.tipNum}>{i + 1}</span>
              <span>{tip}</span>
            </div>
          )) : <div className={styles.planFocus}>Нет данных</div>}
        </div>
      )}

      {activeTab === 'recovery' && (
        <div className={styles.planContent}>
          {recovery?.length ? recovery.map((tip, i) => (
            <div key={i} className={styles.tipItem}>
              <span className={styles.tipNum}>{i + 1}</span>
              <span>{tip}</span>
            </div>
          )) : <div className={styles.planFocus}>Нет данных</div>}
        </div>
      )}
    </div>
  )
}
export default function Chat() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [planData, setPlanData] = useState(null)
  const [initialized, setInitialized] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)
  const [streak, setStreak] = useState(0)
  const [todayDone, setTodayDone] = useState(false)
  const [showSplash, setShowSplash] = useState(false)
  const [todayWorkout, setTodayWorkout] = useState(null)

  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const planDataRef = useRef(null)

  const today = new Date().toISOString().split('T')[0]
  const anonCount = messages.filter(m => m.role === 'user').length

  useEffect(() => {
    if (authLoading) return
    if (initialized) return
    setInitialized(true)

    const init = async () => {
      const pending = localStorage.getItem('forge_pending')
      if (pending) {
        localStorage.removeItem('forge_pending')
        try {
          const { form, plan } = JSON.parse(pending)
          const pd = { form, plan: plan?.week_plan || plan }
          planDataRef.current = pd
          setPlanData(pd)

          if (user) {
            await setDoc(doc(db, 'plans', user.uid), {
              plan: pd.plan, form: pd.form, createdAt: new Date().toISOString()
            })
            Promise.all([
              fetch(`${BACKEND}/tips`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gender: pd.form.gender, age: pd.form.age, weight: pd.form.weight, goal: pd.form.goal, level: pd.form.level, plan: JSON.stringify(pd.plan) }) }).then(r => r.json()),
              fetch(`${BACKEND}/recovery`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ age: pd.form.age, goal: pd.form.goal, level: pd.form.level }) }).then(r => r.json())
            ]).then(([tipsRes, recoveryRes]) => {
              const updatedPd = { ...pd, tips: tipsRes.data?.tips, recovery: recoveryRes.data?.tips }
              planDataRef.current = updatedPd
              setPlanData(updatedPd)
              setDoc(doc(db, 'plans', user.uid), { ...updatedPd, createdAt: new Date().toISOString() })
            }).catch(console.error)
          }

          const todayDay = getTodayPlan(pd.plan)
          const welcomeMsg = {
            role: 'assistant',
            content: `Готово! Вот твой план на ${pd.plan?.length || 0} дней под цель "${form.goal}".${todayDay ? ` Сегодня у тебя: ${todayDay.focus}.` : ''} Пиши если есть вопросы.`,
            plan: pd.plan,
            timestamp: Date.now()
          }
          const msgs = [welcomeMsg]
          setMessages(msgs)
          if (user) await setDoc(doc(db, 'chats', user.uid), { messages: msgs }, { merge: true })
          else localStorage.setItem('forge_chat', JSON.stringify(msgs))
          return
        } catch (e) { console.error(e) }
      }

      if (user) {
        const [planSnap, chatSnap, streakSnap] = await Promise.all([
          getDoc(doc(db, 'plans', user.uid)),
          getDoc(doc(db, 'chats', user.uid)),
          getDoc(doc(db, 'streaks', user.uid))
        ])

        let currentStreak = 0
        let alreadyDone = false

        if (streakSnap.exists()) {
          const dates = streakSnap.data().dates || []
          currentStreak = calcStreak(dates)
          alreadyDone = dates.includes(today)
          setStreak(currentStreak)
          setTodayDone(alreadyDone)
        }

        if (planSnap.exists()) {
          planDataRef.current = planSnap.data()
          setPlanData(planSnap.data())

          // Показываем сплеш если есть план
          const todayDay = getTodayPlan(planSnap.data().plan)
          if (todayDay) {
            setTodayWorkout(todayDay)
            setShowSplash(true)
          }
        }

        if (chatSnap.exists() && chatSnap.data().messages?.length > 0) {
          setMessages(chatSnap.data().messages.slice(-50))
        } else {
          const pd = planSnap.exists() ? planSnap.data() : null
          const todayDay = pd ? getTodayPlan(pd.plan) : null
          const welcome = {
            role: 'assistant',
            content: pd
              ? `Привет! Вижу твою цель — ${pd.form?.goal || 'тренировки'}.${todayDay ? ` Сегодня: ${todayDay.focus}. Готов?` : ' Как последняя тренировка?'}`
              : 'Привет! Я FORGE — твой персональный тренер. Расскажи о себе: цель, возраст, оборудование?',
            timestamp: Date.now()
          }
          setMessages([welcome])
        }
      } else {
        const saved = localStorage.getItem('forge_chat')
        if (saved) {
          try { setMessages(JSON.parse(saved)) } catch {}
        } else {
          setMessages([{
            role: 'assistant',
            content: 'Привет! Я FORGE — твой персональный тренер. Расскажи о себе: цель, возраст, оборудование?',
            timestamp: Date.now()
          }])
        }
      }
    }

    init()
  }, [authLoading, user])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, showPaywall])

  const saveMessages = async (msgs) => {
    if (user) await setDoc(doc(db, 'chats', user.uid), { messages: msgs }, { merge: true })
    else localStorage.setItem('forge_chat', JSON.stringify(msgs.slice(-20)))
  }

  const handleTodayDone = async () => {
    if (todayDone || !user) return
    const ref = doc(db, 'streaks', user.uid)
    const snap = await getDoc(ref)
    if (snap.exists()) {
      await updateDoc(ref, { dates: arrayUnion(today) })
    } else {
      await setDoc(ref, { dates: [today] })
    }
    setTodayDone(true)
    setStreak(s => s + 1)
    return streak + 1
  }

  const sendMessage = async (text = input, existingMessages = null) => {
    if (!text.trim() || loading) return
    if (!user && anonCount >= FREE_LIMIT) { setShowPaywall(true); return }

    const currentMessages = existingMessages || messages
    const userMsg = existingMessages ? null : { role: 'user', content: text.trim(), timestamp: Date.now() }
    const newMessages = userMsg ? [...currentMessages, userMsg] : currentMessages

    if (!existingMessages) { setMessages(newMessages); setInput('') }
    setLoading(true)

    try {
      const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }))
      const currentPlan = planDataRef.current || planData

      const res = await fetch(`${BACKEND}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          userData: currentPlan?.form || null,
          plan: currentPlan?.plan || null
        })
      })
console.log('form:', currentPlan?.form)
      const data = await res.json()
      let reply = data.choices?.[0]?.message?.content || ''
      let newPlan = data.plan || null

      if (!newPlan && reply.includes('ПЛАН_СТАРТ')) {
        const start = reply.indexOf('ПЛАН_СТАРТ') + 'ПЛАН_СТАРТ'.length
        const end = reply.indexOf('ПЛАН_КОНЕЦ')
        if (end > start) {
          try { newPlan = JSON.parse(reply.slice(start, end).trim()) } catch {}
        }
      }
      const cleanReply = reply.replace(/ПЛАН_СТАРТ[\s\S]*?ПЛАН_КОНЕЦ/g, '').trim()

      const assistantMsg = {
        role: 'assistant',
        content: cleanReply || '',
        plan: newPlan ? (newPlan.week_plan || newPlan) : null,
        timestamp: Date.now()
      }

      const updatedMessages = [...newMessages, assistantMsg]
      setMessages(updatedMessages)
      await saveMessages(updatedMessages)

      if (newPlan && user) {
        const days = newPlan.week_plan || newPlan
        const pd = { ...planData, plan: days }
        planDataRef.current = pd
        setPlanData(pd)
        await setDoc(doc(db, 'plans', user.uid), { ...pd, createdAt: new Date().toISOString() })
      }

      if (!user && updatedMessages.filter(m => m.role === 'user').length >= FREE_LIMIT) {
        setTimeout(() => setShowPaywall(true), 800)
      }
    } catch (e) {
      console.error(e)
      setMessages(prev => [...prev, { role: 'assistant', content: 'Ошибка соединения. Попробуй ещё раз.', timestamp: Date.now() }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleRegister = () => {
    localStorage.setItem('forge_chat_migrate', JSON.stringify(messages))
    navigate('/register')
  }

  if (authLoading || !initialized) return (
    <div className={styles.loadingPage}>
      <div className={styles.dots}><span/><span/><span/></div>
    </div>
  )

  return (
    <div className={styles.page}>
      <Header variant="chat" />

      {/* TODAY SPLASH */}
      {showSplash && todayWorkout && (
        <TodaySplash
          day={todayWorkout}
          streak={streak}
          todayDone={todayDone}
          onDone={handleTodayDone}
          onClose={() => setShowSplash(false)}
        />
      )}

      {!user && !showPaywall && (
        <div className={styles.anonBanner}>
          <div className={styles.anonLeft}>
            <div className={styles.anonDots}>
              {Array.from({ length: FREE_LIMIT }).map((_, i) => (
                <div key={i} className={`${styles.anonDot} ${i < anonCount ? styles.anonDotUsed : ''}`} />
              ))}
            </div>
            <span className={styles.anonText}>{Math.max(0, FREE_LIMIT - anonCount)} из {FREE_LIMIT} бесплатных</span>
          </div>
          <button className={styles.anonRegBtn} onClick={handleRegister}>Зарегистрироваться →</button>
        </div>
      )}

      <div className={styles.chatArea}>
        {messages.map((msg, i) => (
          <div key={i} className={`${styles.msg} ${msg.role === 'user' ? styles.msgUser : styles.msgAssistant}`}>
            {msg.role === 'assistant' && <div className={styles.msgAvatar}>F</div>}
            <div className={styles.msgBubble}>
              {msg.content && <div className={styles.msgText}>{msg.content}</div>}
              {msg.plan && <PlanInMessage plan={msg.plan} tips={planData?.tips} recovery={planData?.recovery} />}
              <div className={styles.msgTime}>
                {new Date(msg.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className={`${styles.msg} ${styles.msgAssistant}`}>
            <div className={styles.msgAvatar}>F</div>
            <div className={styles.msgBubble}>
              <div className={styles.typing}><span/><span/><span/></div>
            </div>
          </div>
        )}

        {showPaywall && (
          <div className={styles.paywall}>
            <div className={styles.paywallInner}>
              <div className={styles.paywallIcon}>⚡</div>
              <div className={styles.paywallTitle}>Продолжи с аккаунтом</div>
              <div className={styles.paywallText}>Регистрация бесплатная</div>
              <div className={styles.paywallPerks}>
                {['Безлимитный чат','Тренер помнит историю','Персональный план','Советы по питанию','Анализ фото'].map(p => (
                  <div key={p} className={styles.perk}>✓ {p}</div>
                ))}
              </div>
              <button className={styles.paywallBtn} onClick={handleRegister}>Создать аккаунт →</button>
              <button className={styles.paywallLink} onClick={() => navigate('/login')}>Уже есть аккаунт? Войти</button>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {messages.length <= 1 && !showPaywall && (
        <div className={styles.quickReplies}>
          {['Хочу похудеть 🔥', 'Набрать массу 💪', 'Тренируюсь дома', 'Начинаю с нуля'].map(r => (
            <button key={r} className={styles.quickReply} onClick={() => sendMessage(r)}>{r}</button>
          ))}
        </div>
      )}

      {!showPaywall && (
        <div className={styles.inputArea}>
          <div className={styles.inputInner} onClick={() => inputRef.current?.focus()}>
            <textarea
              id="chat-input"
              ref={inputRef}
              className={styles.input}
              placeholder="Напиши тренеру..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              rows={1}
              onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px' }}
            />
            <button className={styles.sendBtn} onClick={() => sendMessage()} disabled={loading || !input.trim()}>→</button>
          </div>
        </div>
      )}
    </div>
  )
}
