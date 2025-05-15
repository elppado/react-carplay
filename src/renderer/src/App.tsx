import { useEffect, useState, useCallback } from 'react'
import { HashRouter as Router } from 'react-router-dom'
// import Settings from './components/Settings'
import './App.css'
import Carplay from './components/Carplay'
import { useCarplayStore } from './store/store'

function App(): JSX.Element | null {
  const [receivingVideo, setReceivingVideo] = useState(false)
  const [commandCounter, setCommandCounter] = useState(0)
  const [keyCommand, setKeyCommand] = useState('')
  const settings = useCarplayStore((state) => state.settings)
  // const locationpath = useLocation()

  const onKeyDown = useCallback((event: KeyboardEvent) => {
    if (!settings) return
    if (Object.values(settings.bindings).includes(event.code)) {
      const action = Object.keys(settings.bindings).find(
        (key) => settings.bindings[key] === event.code
      )
      if (action) {
        setKeyCommand(action)
        setCommandCounter((prev) => prev + 1)
        if (action === 'selectDown') {
          setTimeout(() => {
            setKeyCommand('selectUp')
            setCommandCounter((prev) => prev + 1)
          }, 200)
        }
      }
    }
  }, [settings])

  useEffect(() => {
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onKeyDown])

  if (!settings) return null

  return (
    <Router>
      <div className="full">
        <Carplay
          receivingVideo={receivingVideo}
          setReceivingVideo={setReceivingVideo}
          settings={settings}
          command={keyCommand}
          commandCounter={commandCounter}
        />
      </div>
    </Router>
  )
}

export default App
