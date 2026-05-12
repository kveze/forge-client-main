import { Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { sendEmailVerification } from 'firebase/auth'
import { auth } from '../firebase'
import styles from './PrivateRoute.module.css'

const RESEND_COOLDOWN = 60
const RELOAD_INTERVAL_MS = 3000

export default function PrivateRoute({ children }) {
  const { user, loading, logout } = useAuth()
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown(prev => (prev <= 1 ? 0 : prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  // Раньше тут была подписка на user.emailVerified без перерисовки —
  // useEffect зависел только от [user], но user — это reference на firebase-объект,
  // он не меняется когда emailVerified становится true. Поэтому интервал крутил
  // user.reload() но проверял всё тот же объект. window.location.reload() это решал,
  // но это костыль. Оставлю интервал, но с явным разрешением reload через emailVerified.
  useEffect(() => {
    if (!user || user.emailVerified) return
    const interval = setInterval(async () => {
      try {
        await user.reload()
        if (user.emailVerified) {
          clearInterval(interval)
          window.location.reload()
        }
      } catch (e) {
        // Если токен протух — просто остановим интервал
        clearInterval(interval)
      }
    }, RELOAD_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [user])

  const handleResend = async () => {
    if (resendCooldown > 0) return
    setResendCooldown(RESEND_COOLDOWN)
    try {
      await sendEmailVerification(auth.currentUser)
    } catch (e) {
      console.error('Не удалось отправить:', e)
    }
  }

  if (loading) {
    return <div className={styles.loading}>ЗАГРУЗКА...</div>
  }

  if (user && !user.emailVerified) {
    return (
      <div className={styles.verifyWrap}>
        <div className={styles.verifyIcon}>📧</div>
        <div className={styles.verifyTitle}>Подтверди email</div>
        <div className={styles.verifyText}>Мы отправили письмо на {user.email}</div>

        <button
          className={styles.resendBtn}
          onClick={handleResend}
          disabled={resendCooldown > 0}
        >
          {resendCooldown > 0 ? `ОТПРАВИТЬ СНОВА (${resendCooldown}с)` : 'ОТПРАВИТЬ СНОВА'}
        </button>

        <button className={styles.logoutBtn} onClick={logout}>
          Выйти
        </button>
      </div>
    )
  }

  return user ? children : <Navigate to="/login" replace />
}
