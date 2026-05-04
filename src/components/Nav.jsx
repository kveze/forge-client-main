import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import styles from './Nav.module.css'

export default function Nav() {
  const { user, logout } = useAuth()
  const loc = useLocation()

  return (
    <header className={styles.header}>
      <div className={styles.logo}>FOR<span>G</span>E</div>
      <nav className={styles.nav}>
        <Link to="/" className={`${styles.link} ${loc.pathname === '/' ? styles.active : ''}`}>ТРЕНИРОВКИ</Link>
        <Link to="/wellness" className={`${styles.link} ${loc.pathname === '/wellness' ? styles.active : ''}`}>ПИТАНИЕ И СОН</Link>
      </nav>
      <div className={styles.right}>
        <div className={styles.email}>{user?.email}</div>
        <button className={styles.logoutBtn} onClick={logout}>ВЫЙТИ</button>
      </div>
    </header>
  )
}
