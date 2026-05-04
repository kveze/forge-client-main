import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import styles from './Header.module.css'

export default function Header({ variant = 'default' }) {
  const navigate = useNavigate()
  const { user } = useAuth()

  // 🔥 Конфигурация кнопок для разных страниц
  const variants = {
    // Главная (лендинг)
    landing: {
      left: null,
      right: [
        { label: 'Мой профиль', to: '/profile', show: !!user },
        { label: 'Войти', to: '/login', show: !user },
        { label: 'Регистрация', to: '/register', show: !user, accent: true },
        { label: 'Создать план', to: '/generate', show: true, accent: true },
      ]
    },
    
    // Генератор плана
    generate: {
      left: null,
      right: [
        { label: 'Мой профиль', to: '/profile', show: true },
      ]
    },
    
    // Сегодняшняя тренировка
    today: {
      left: null,
      right: [
        { label: 'Мой профиль', to: '/profile', show: true },
        { label: 'Новый план', to: '/generate', show: true, accent: true },
      ]
    },
    
    // Профиль
    profile: {
      right: [
        { label: '🔥 Сегодня', to: '/today', show: true },
        { label: '+ Новый план', to: '/generate', show: true, accent: true},
        { label: '💎 LooksMax', to: '/looksmax', show: true},
      ],
      left: null
    },
    
    // По умолчанию
    default: {
      left: null,
      right: [
        { label: 'Мой профиль', to: '/profile', show: !!user },
        { label: 'Войти', to: '/login', show: !user },

      ]
    }
  }

  const config = variants[variant] || variants.default

  return (
    <header className={styles.header}>
      <div className={styles.logo} onClick={() => navigate('/')}>
        FOR<span>G</span>E
      </div>
      
      <div className={styles.left}>
        {config.left?.filter(btn => btn.show).map((btn, i) => (
          <button 
            key={i} 
            className={btn.accent ? styles.accentBtn : styles.ghostBtn}
            onClick={() => navigate(btn.to)}
          >
            {btn.label}
          </button>
        ))}
      </div>
      
      <div className={styles.right}>
        {config.right?.filter(btn => btn.show).map((btn, i) => (
          <button 
            key={i} 
            className={btn.accent ? styles.accentBtn : styles.ghostBtn}
            onClick={() => navigate(btn.to)}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </header>
  )
}
