import { useState } from 'react'
import Chat from './components/Chat.jsx'
import SplashScreen from './components/SplashScreen.jsx'
import './App.css'

function App() {
  const [showSplash, setShowSplash] = useState(true)

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />
  }

  return <Chat />
}

export default App
