import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { sendEmailVerification } from 'firebase/auth'
import { auth } from '../firebase'
import { useEffect, useState } from 'react'

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

  useEffect(() => {
    if (!user || user.emailVerified) return
    const interval = setInterval(async () => {
      await user.reload()
      if (user.emailVerified) {
        clearInterval(interval)
        window.location.reload()
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [user])

  const handleResend = async () => {
    if (resendCooldown > 0) return
    setResendCooldown(60)
    try {
      await sendEmailVerification(auth.currentUser)
    } catch (e) {
      console.error('Не удалось отправить:', e)
    }
  }

  if (loading) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', fontFamily: 'var(--mono)', color: 'var(--muted)',
      letterSpacing: '3px', fontSize: '12px'
    }}>
      ЗАГРУЗКА...
    </div>
  )

  if (user && !user.emailVerified) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100vh', gap: 16,
        fontFamily: 'var(--mono)', color: '#888', textAlign: 'center', padding: 20
      }}>
        <div style={{ fontSize: 32 }}>📧</div>
        <div style={{ color: '#F0EDE8', fontSize: 18, fontWeight: 700 }}>Подтверди email</div>
        <div style={{ fontSize: 13 }}>Мы отправили письмо на {user.email}</div>

        <button
          onClick={handleResend}
          disabled={resendCooldown > 0}
          style={{
            padding: '10px 20px',
            background: resendCooldown > 0 ? '#555' : '#FF2D2D',
            border: 'none', borderRadius: 8, color: 'white',
            cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer', fontSize: 13
          }}
        >
          {resendCooldown > 0 ? `ОТПРАВИТЬ СНОВА (${resendCooldown}с)` : 'ОТПРАВИТЬ СНОВА'}
        </button>

        <button
          onClick={logout}
          style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: 13 }}
        >
          Выйти
        </button>
      </div>
    )
  }

  return user ? children : <Navigate to="/login" replace />
}
