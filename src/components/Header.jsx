import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import styles from './Header.module.css'

const VARIANTS = {
  landing: {
    right: [
      { label: 'Мой профиль', to: '/profile', show: (user) => !!user },
      { label: 'Войти', to: '/login', show: (user) => !user },
      { label: 'Регистрация', to: '/register', show: (user) => !user, accent: true },
      { label: 'Создать план', to: '/generate', show: () => true, accent: true },
    ]
  },
  generate: {
    right: [
      { label: 'Мой профиль', to: '/profile', show: () => true },
    ]
  },
  today: {
    right: [
      { label: 'Мой профиль', to: '/profile', show: () => true },
      { label: 'Новый план', to: '/generate', show: () => true, accent: true },
    ]
  },
  profile: {
    right: [
      { label: '+ Новый план', to: '/generate', show: () => true, accent: true },
      { label: '💬 Тренер', to: '/chat', show: () => true, accent: true },
      { label: '💎 LooksMax', to: '/looksmax', show: () => true },
    ]
  },
  chat: {
    right: [
      { label: 'Профиль', to: '/profile', show: (user) => !!user },
      { label: '+ Новый план', to: '/generate', show: (user) => !!user, accent: true },
      { label: '💎 LooksMax', to: '/looksmax', show: (user) => !!user },
      { label: 'Войти', to: '/login', show: (user) => !user },
      { label: 'Регистрация', to: '/register', show: (user) => !user, accent: true },
    ]
  },
  default: {
    right: [
      { label: 'Мой профиль', to: '/profile', show: (user) => !!user },
      { label: 'Войти', to: '/login', show: (user) => !user },
    ]
  },
}

export default function Header({ variant = 'default' }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  const config = VARIANTS[variant] || VARIANTS.default
  const buttons = config.right?.filter(btn => btn.show(user)) || []

  useEffect(() => {
    if (!menuOpen) return
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  const handleNav = (to) => {
    setMenuOpen(false)
    navigate(to)
  }

  return (
    <header className={styles.header}>
      <div className={styles.logo} onClick={() => navigate('/')}>
        FOR<span>G</span>E
      </div>

      <div className={styles.right}>
        {buttons.map((btn, i) => (
          <button
            key={i}
            className={btn.accent ? styles.accentBtn : styles.ghostBtn}
            onClick={() => navigate(btn.to)}
          >
            {btn.label}
          </button>
        ))}
      </div>

      <div ref={menuRef} className={styles.burgerWrap}>
        <button
          className={`${styles.burger} ${menuOpen ? styles.burgerOpen : ''}`}
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Меню"
        >
          <span />
          <span />
          <span />
        </button>

        {menuOpen && (
          <>
            <div className={styles.overlay} onClick={() => setMenuOpen(false)} />
            <div className={styles.mobileMenu}>
              {buttons.map((btn, i) => (
                <button
                  key={i}
                  className={btn.accent ? styles.mobileAccentBtn : styles.mobileBtn}
                  onClick={() => handleNav(btn.to)}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </header>
  )
}
