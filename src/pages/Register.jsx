import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { sendEmailVerification } from 'firebase/auth'
import { auth } from '../firebase'
import styles from './Auth.module.css'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [needsVerification, setNeedsVerification] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resending, setResending] = useState(false)
  
  const { register, loginWithGoogle } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setInterval(() => {
        setResendCooldown(prev => prev <= 1 ? 0 : prev - 1)
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [resendCooldown])

  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return
    setResending(true)
    setResendCooldown(60)
    try {
      await sendEmailVerification(auth.currentUser)
    } catch {
      // Игнорируем ошибку повторной отправки
    } finally {
      setResending(false)
    }
  }

  const handleCheckVerification = async () => {
    setLoading(true)
    await auth.currentUser.reload()
    if (auth.currentUser.emailVerified) {
      navigate('/')
    } else {
      setError('Почта ещё не подтверждена')
    }
    setLoading(false)
  }

  const handleSubmit = async () => {
    if (!email || !password) return
    if (password !== confirm) { setError('Пароли не совпадают'); return }
    if (password.length < 6) { setError('Пароль минимум 6 символов'); return }

    setLoading(true)
    setError('')
    
    try {
      // 🔥 1. Создаём аккаунт
      const { user } = await register(email, password)
      
      // 🔥 2. Отправляем письмо (ОШИБКА ЗДЕСЬ НЕ БЛОКИРУЕТ)
      try {
        await sendEmailVerification(user)
      } catch (e) {
        console.warn('Письмо не отправлено, но аккаунт создан:', e)
        // НЕ показываем ошибку — аккаунт уже создан
      }
      
      // 🔥 3. Показываем экран подтверждения
      setNeedsVerification(true)
      
    } catch (e) {
      // 🔥 4. ОШИБКА РЕГИСТРАЦИИ (аккаунт НЕ создан)
      console.error('Register error:', e)
      const code = e.code?.split('/')[1] || e.code
      const msgs = {
        'email-already-in-use': 'Email уже зарегистрирован',
        'invalid-email': 'Некорректный email',
        'weak-password': 'Пароль слишком слабый',
      }
      setError(msgs[code] || 'Ошибка регистрации')
    } finally {
      setLoading(false)
    }
  }

  if (needsVerification) {
    return (
      <div className={styles.page}>
        <div className={styles.logo}>FOR<span>G</span>E</div>
        <div className={styles.card}>
          <div className={styles.title}>✅ ПИСЬМО ОТПРАВЛЕНО</div>
          <div className={styles.subtitle}>// ПРОВЕРЬ {email}</div>
          <div className={styles.verifyText}>
            Мы отправили ссылку для подтверждения.<br/>
            Нажми на неё чтобы активировать аккаунт.
          </div>
          <button className={styles.btn} onClick={handleCheckVerification} disabled={loading}>
            {loading ? 'ПРОВЕРЯЕМ...' : 'Я ПОДТВЕРДИЛ'}
          </button>
          <button className={styles.googleBtn} onClick={handleResend} disabled={resendCooldown > 0 || resending}>
            {resending ? 'ОТПРАВЛЯЕМ...' : resendCooldown > 0 ? `ОТПРАВИТЬ СНОВА (${resendCooldown}с)` : 'ОТПРАВИТЬ СНОВА'}
          </button>
          <div className={styles.link}>
            <Link to="/login">← На вход</Link>
          </div>
          {error && <div className={styles.error}>{error}</div>}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.logo}>FOR<span>G</span>E</div>
      <div className={styles.card}>
        <div className={styles.title}>РЕГИСТРАЦИЯ</div>
        <div className={styles.subtitle}>// СОЗДАЙ СВОЙ АККАУНТ</div>
        <div className={styles.field}>
          <div className={styles.label}>Email</div>
          <input className={styles.input} type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div className={styles.field}>
          <div className={styles.label}>Пароль</div>
          <input className={styles.input} type="password" placeholder="минимум 6 символов" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        <div className={styles.field}>
          <div className={styles.label}>Повтори пароль</div>
          <input className={styles.input} type="password" placeholder="••••••••" value={confirm} onChange={e => setConfirm(e.target.value)} />
        </div>
        <button className={styles.btn} onClick={handleSubmit} disabled={loading}>
          {loading ? 'СОЗДАЁМ...' : 'СОЗДАТЬ АККАУНТ'}
        </button>
        <button className={styles.googleBtn} onClick={async () => { try { await loginWithGoogle(); navigate('/') } catch { setError('Ошибка Google') } }}>
          <img src="https://www.google.com/favicon.ico" width={16} /> Войти через Google
        </button>
        {error && <div className={styles.error}>{error}</div>}
        <div className={styles.link}>
          Уже есть аккаунт?
          <Link to="/login">Войти</Link>
        </div>
      </div>
    </div>
  )
}
