import { useEffect, useState, useCallback } from 'react'
import { HashRouter as Router } from 'react-router-dom'
import { RotatingLines } from 'react-loader-spinner'
import './App.css'
import Carplay from './components/Carplay'
import { useCarplayStore } from './store/store'

function App(): JSX.Element {
  const [commandCounter, setCommandCounter] = useState(0)
  const [keyCommand, setKeyCommand] = useState('')
  const settings = useCarplayStore((state) => state.settings)
  const getSettings = useCarplayStore((state) => state.getSettings)

  useEffect(() => {
    getSettings()
  }, [getSettings])

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
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
    },
    [settings]
  )

  useEffect(() => {
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onKeyDown])

  if (!settings) {
    return (
      <div className="full" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <RotatingLines
          strokeColor="grey"
          strokeWidth="5"
          animationDuration="1"
          width="64"
          visible={true}
        />
      </div>
    )
  }

  return (
    <Router>
      <div className="full">
        <Carplay settings={settings} command={keyCommand} commandCounter={commandCounter} />
      </div>
    </Router>
  )
}

export default App
