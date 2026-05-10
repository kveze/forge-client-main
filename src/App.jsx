import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Generate from './pages/Generate' 
import Login from './pages/Login'
import Register from './pages/Register'
import PrivateRoute from './components/PrivateRoute'
import Today from './pages/Today'
import Profile from './pages/Profile'
import LooksMaxTip from './pages/LooksMaxTip'
import Chat from './pages/Chat'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/generate" element={<Generate />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/looksmax" element={<PrivateRoute><LooksMaxTip /></PrivateRoute>} />
      <Route path="/today" element={<PrivateRoute><Today /></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
      <Route path="/chat" element={<Chat />} />
    </Routes>
  )
}
