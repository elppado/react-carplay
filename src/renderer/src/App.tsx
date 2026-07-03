import { lazy, Suspense, useEffect, useState, useCallback } from 'react'
import './App.css'
import { useCarplayStore } from './store/store'

const Carplay = lazy(() => import('./components/Carplay'))

function App(): JSX.Element {
  const [commandCounter, setCommandCounter] = useState(0)
  const [keyCommand, setKeyCommand] = useState('')
  const settings = useCarplayStore((state) => state.settings)

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
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

  return (
    <div className="full">
      <Suspense fallback={<div className="startup-spinner" aria-label="Loading" />}>
        <Carplay settings={settings} command={keyCommand} commandCounter={commandCounter} />
      </Suspense>
    </div>
  )
}

export default App
