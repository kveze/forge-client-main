import { useState } from 'react'
import Nav from '../components/Nav'
import Wizard from '../components/Wizard'
import Result from '../components/Result'
import { useGenerate } from '../hooks/useGenerate'
import styles from './Home.module.css'

export default function Home() {
  const [userData, setUserData] = useState(null)
  const { plan, loading, error, generate } = useGenerate()

  const handleSubmit = (data) => {
    setUserData(data)
    generate(data)
  }

  return (
    <div className={styles.page}>
      <Nav />
      <main className={styles.main}>
        <Wizard onSubmit={handleSubmit} />
        <Result plan={plan} loading={loading} error={error} userData={userData} />
      </main>
    </div>
  )
}
