import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { db } from '../firebase'
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore'
import { sendChatMessage, fetchTipsRaw, fetchRecoveryRaw } from '../api/forge'
import { calcStreak, todayISO } from '../utils/streak'
import { getTodayPlan, todayDayName } from '../utils/plan'
import VideoModal from '../components/VideoModal'
import Header from '../components/Header'
import styles from './Chat.module.css'

const FREE_LIMIT = 3
const READY_DELAY_MS = 3000
const CHAT_HISTORY_LIMIT = 50
const ANON_HISTORY_LIMIT = 20
const PAYWALL_DELAY_MS = 800

// ============================================================
// Сплеш сегодняшней тренировки
// ============================================================
function TodaySplash({ day, streak, todayDone, onDone, onClose }) {
  const [canDone, setCanDone] = useState(false)
  const [done, setDone] = useState(todayDone)
  const [showSuccess, setShowSuccess] = useState(false)
  const [closing, setClosing] = useState(false)
  const [activeVideo, setActiveVideo] = useState(null)

  useEffect(() => {
    if (todayDone) return
    const t = setTimeout(() => setCanDone(true), READY_DELAY_MS)
    return () => clearTimeout(t)
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

  const streakWord = (n) => n === 1 ? 'день' : n < 5 ? 'дня' : 'дней'

  return (
    <div className={`${styles.splash} ${closing ? styles.splashClosing : ''}`}>
      {activeVideo && <VideoModal exerciseName={activeVideo} onClose={() => setActiveVideo(null)} />}
      <div className={styles.splashGlow} />

      {showSuccess ? (
        <div className={styles.splashSuccess}>
          <div className={styles.splashFireBig}>🔥</div>
          <div className={styles.splashStreakNum}>{streak}</div>
          <div className={styles.splashStreakLabel}>{streakWord(streak)} подряд</div>
          <div className={styles.splashSuccessText}>Красава! Продолжай в том же духе.</div>
        </div>
      ) : (
        <div className={styles.splashContent}>
          <div className={styles.splashTop}>
            <div className={styles.splashDay}>{todayDayName()}</div>
            <div className={styles.splashFocus}>{day.focus}</div>
            {streak > 0 && (
              <div className={styles.splashStreak}>
                🔥 {streak} {streakWord(streak)} подряд
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

// ============================================================
// План внутри сообщения чата
// ============================================================
function PlanInMessage({ plan, tips, recovery }) {
  const [activeTab, setActiveTab] = useState('plan')
  const [activeDay, setActiveDay] = useState(0)
  const [activeVideo, setActiveVideo] = useState(null)

  const days = Array.isArray(plan) ? plan : plan?.week_plan
  if (!days?.length) return null

  const day = days[activeDay]
  const mainTabs = [['plan', 'Тренировки'], ['tips', 'Питание'], ['recovery', 'Восстановление']]

  return (
    <div className={styles.planCard}>
      {activeVideo && <VideoModal exerciseName={activeVideo} onClose={() => setActiveVideo(null)} />}
      <div className={styles.planCardTitle}>// ТВОЙ ПЛАН</div>

      <div className={styles.planMainTabs}>
        {mainTabs.map(([key, label]) => (
          <button
            key={key}
            className={`${styles.planMainTab} ${activeTab === key ? styles.planMainTabActive : ''}`}
            onClick={() => setActiveTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'plan' && (
        <>
          <div className={styles.planTabs}>
            {days.map((d, i) => (
              <button
                key={i}
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
                  <button className={styles.planWatchBtn} onClick={() => setActiveVideo(ex.name)}>
                    ▶ КАК ДЕЛАТЬ
                  </button>
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

// ============================================================
// Утилиты состояния чата
// ============================================================

// Парсит блок ПЛАН_СТАРТ/ПЛАН_КОНЕЦ из ответа AI
function extractPlanFromReply(reply) {
  if (!reply.includes('ПЛАН_СТАРТ')) return { plan: null, clean: reply }

  const start = reply.indexOf('ПЛАН_СТАРТ') + 'ПЛАН_СТАРТ'.length
  const end = reply.indexOf('ПЛАН_КОНЕЦ')

  let plan = null
  if (end > start) {
    try { plan = JSON.parse(reply.slice(start, end).trim()) } catch {}
  }
  const clean = reply.replace(/ПЛАН_СТАРТ[\s\S]*?ПЛАН_КОНЕЦ/g, '').trim()
  return { plan, clean }
}

function buildPendingWelcome(planData) {
  const todayDay = getTodayPlan(planData.plan)
  return {
    role: 'assistant',
    content: `Готово! Вот твой план на ${planData.plan?.length || 0} дней под цель "${planData.form.goal}".${todayDay ? ` Сегодня у тебя: ${todayDay.focus}.` : ''} Пиши если есть вопросы.`,
    plan: planData.plan,
    timestamp: Date.now()
  }
}

function buildFirstWelcome(planData) {
  const todayDay = planData ? getTodayPlan(planData.plan) : null
  return {
    role: 'assistant',
    content: planData
      ? `Привет! Вижу твою цель — ${planData.form?.goal || 'тренировки'}.${todayDay ? ` Сегодня: ${todayDay.focus}. Готов?` : ' Как последняя тренировка?'}`
      : 'Привет! Я FORGE — твой персональный тренер. Расскажи о себе: цель, возраст, оборудование?',
    timestamp: Date.now()
  }
}

// ============================================================
// Главный компонент
// ============================================================
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

  const today = todayISO()
  const anonCount = messages.filter(m => m.role === 'user').length

  // -----------------------------------------------
  // Инициализация — разбита на отдельные функции
  // -----------------------------------------------

  // Обработка свежесозданного плана из Generate (через localStorage)
  const handlePendingPlan = async (pending) => {
    const { form, plan } = JSON.parse(pending)
    const pd = { form, plan: plan?.week_plan || plan }
    planDataRef.current = pd
    setPlanData(pd)

    if (user) {
      await setDoc(doc(db, 'plans', user.uid), {
        plan: pd.plan, form: pd.form, createdAt: new Date().toISOString()
      })

      // Параллельно подтягиваем tips и recovery в фоне
      Promise.all([
        fetchTipsRaw({
          gender: pd.form.gender, age: pd.form.age, weight: pd.form.weight,
          goal: pd.form.goal, level: pd.form.level, plan: JSON.stringify(pd.plan)
        }),
        fetchRecoveryRaw({ age: pd.form.age, goal: pd.form.goal, level: pd.form.level })
      ]).then(([tipsRes, recoveryRes]) => {
        const updatedPd = { ...pd, tips: tipsRes.data?.tips, recovery: recoveryRes.data?.tips }
        planDataRef.current = updatedPd
        setPlanData(updatedPd)
        return setDoc(doc(db, 'plans', user.uid), { ...updatedPd, createdAt: new Date().toISOString() })
      }).catch(console.error)
    }

    const welcomeMsg = buildPendingWelcome(pd)
    const msgs = [welcomeMsg]
    setMessages(msgs)
    if (user) await setDoc(doc(db, 'chats', user.uid), { messages: msgs }, { merge: true })
    else localStorage.setItem('forge_chat', JSON.stringify(msgs))
  }

  // Чат для авторизованного — план/чат/streak из Firestore
  const loadAuthenticatedChat = async () => {
    // Миграция чата при только что состоявшейся регистрации
    const migrated = localStorage.getItem('forge_chat_migrate')
    if (migrated) {
      localStorage.removeItem('forge_chat_migrate')
      try {
        const migratedMsgs = JSON.parse(migrated)
        if (migratedMsgs.length > 0) {
          setMessages(migratedMsgs)
          await setDoc(doc(db, 'chats', user.uid), { messages: migratedMsgs }, { merge: true })
          return
        }
      } catch {}
    }

    const [planSnap, chatSnap, streakSnap] = await Promise.all([
      getDoc(doc(db, 'plans', user.uid)),
      getDoc(doc(db, 'chats', user.uid)),
      getDoc(doc(db, 'streaks', user.uid))
    ])

    // Streak
    let alreadyDone = false
    if (streakSnap.exists()) {
      const dates = streakSnap.data().dates || []
      setStreak(calcStreak(dates))
      alreadyDone = dates.includes(today)
      setTodayDone(alreadyDone)
    }

    // План
    if (planSnap.exists()) {
      const pd = planSnap.data()
      planDataRef.current = pd
      setPlanData(pd)

      const todayDay = getTodayPlan(pd.plan)
      // Сплеш показываем только если тренировка ещё не отмечена сделанной.
      // Раньше показывался при каждом заходе на /chat, даже после нажатия "Сделал".
      if (todayDay && !alreadyDone) {
        setTodayWorkout(todayDay)
        setShowSplash(true)
      }
    }

    // Сообщения
    if (chatSnap.exists() && chatSnap.data().messages?.length > 0) {
      setMessages(chatSnap.data().messages.slice(-CHAT_HISTORY_LIMIT))
    } else {
      const pd = planSnap.exists() ? planSnap.data() : null
      setMessages([buildFirstWelcome(pd)])
    }
  }

  // Чат для анонима — только localStorage
  const loadAnonymousChat = () => {
    const saved = localStorage.getItem('forge_chat')
    if (saved) {
      try {
        setMessages(JSON.parse(saved))
        return
      } catch {}
    }
    setMessages([buildFirstWelcome(null)])
  }

  useEffect(() => {
    if (authLoading || initialized) return
    setInitialized(true)

    const init = async () => {
      try {
        const pending = localStorage.getItem('forge_pending')
        if (pending) {
          localStorage.removeItem('forge_pending')
          await handlePendingPlan(pending)
          return
        }

        if (user) {
          await loadAuthenticatedChat()
        } else {
          loadAnonymousChat()
        }
      } catch (e) {
        console.error('Chat init error:', e)
      }
    }

    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, showPaywall])

  // -----------------------------------------------
  // Действия
  // -----------------------------------------------

  const saveMessages = async (msgs) => {
    if (user) {
      await setDoc(doc(db, 'chats', user.uid), { messages: msgs }, { merge: true })
    } else {
      localStorage.setItem('forge_chat', JSON.stringify(msgs.slice(-ANON_HISTORY_LIMIT)))
    }
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

      const data = await sendChatMessage({
        messages: apiMessages,
        userData: currentPlan?.form || null,
        plan: currentPlan?.plan || null,
      })

      const reply = data.choices?.[0]?.message?.content || ''
      // План может прийти отдельно в data.plan ИЛИ в спецблоке ПЛАН_СТАРТ/КОНЕЦ
      const { plan: parsedPlan, clean: cleanReply } = extractPlanFromReply(reply)
      const newPlan = data.plan || parsedPlan

      const assistantMsg = {
        role: 'assistant',
        content: cleanReply,
        plan: newPlan ? (newPlan.week_plan || newPlan) : null,
        timestamp: Date.now()
      }

      const updatedMessages = [...newMessages, assistantMsg]
      setMessages(updatedMessages)
      await saveMessages(updatedMessages)

      if (newPlan && user) {
        const days = newPlan.week_plan || newPlan
        // Применяем новые goal/level из ответа AI если они пришли.
        // Раньше form никогда не обновлялся → цель в Profile оставалась старой.
        const updatedForm = {
          ...planData?.form,
          ...(newPlan.goal && { goal: newPlan.goal }),
          ...(newPlan.level && { level: newPlan.level }),
        }
        const pd = { ...planData, plan: days, form: updatedForm }
        planDataRef.current = pd
        setPlanData(pd)
        await setDoc(doc(db, 'plans', user.uid), { ...pd, createdAt: new Date().toISOString() })
      }

      if (!user && updatedMessages.filter(m => m.role === 'user').length >= FREE_LIMIT) {
        setTimeout(() => setShowPaywall(true), PAYWALL_DELAY_MS)
      }
    } catch (e) {
      console.error(e)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Ошибка соединения. Попробуй ещё раз.',
        timestamp: Date.now()
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleRegister = () => {
    localStorage.setItem('forge_chat_migrate', JSON.stringify(messages))
    navigate('/register')
  }

  // -----------------------------------------------
  // Рендер
  // -----------------------------------------------

  if (authLoading || !initialized) return (
    <div className={styles.loadingPage}>
      <div className={styles.dots}><span /><span /><span /></div>
    </div>
  )

  return (
    <div className={styles.page}>
      <Header variant="chat" />

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
              {msg.plan && (
                <PlanInMessage
                  plan={msg.plan}
                  tips={planData?.tips}
                  recovery={planData?.recovery}
                  key={`${planData?.tips?.length}-${planData?.recovery?.length}`}
                />
              )}
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
              <div className={styles.typing}><span /><span /><span /></div>
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
                {['Безлимитный чат', 'Тренер помнит историю', 'Персональный план', 'Советы по питанию', 'Анализ фото'].map(p => (
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
              onInput={e => {
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'
              }}
            />
            <button
              className={styles.sendBtn}
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
