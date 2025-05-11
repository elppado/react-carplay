import { useEffect, useState } from 'react'
import { HashRouter as Router } from 'react-router-dom'
// import Settings from './components/Settings'
import './App.css'
import Carplay from './components/Carplay'
import { useCarplayStore } from './store/store'

function App(): JSX.Element {
  const [receivingVideo, setReceivingVideo] = useState(false)
  const [commandCounter, setCommandCounter] = useState(0)
  const [keyCommand, setKeyCommand] = useState('')
  const settings = useCarplayStore((state) => state.settings)
  // const locationpath = useLocation()

  useEffect(() => {
    document.addEventListener('keydown', onKeyDown)

    return () => document.removeEventListener('keydown', onKeyDown)
  }, [settings])

  const onKeyDown = (event: KeyboardEvent): void => {
    console.log(event.code)
    console.log('KEYBOARDD')
    if (Object.values(settings!.bindings).includes(event.code)) {
      const action = Object.keys(settings!.bindings).find(
        (key) => settings!.bindings[key as keyof typeof settings.bindings] === event.code
      )
      if (action !== undefined) {
        setKeyCommand(action)
        setCommandCounter((prev) => prev + 1)
        if (action === 'selectDown') {
          console.log('select down')
          setTimeout(() => {
            setKeyCommand('selectUp')
            setCommandCounter((prev) => prev + 1)
          }, 200)
        }
      }
    }
  }

  return (
    <Router>
      <div className="full">
        {settings ? (
          <Carplay
            receivingVideo={receivingVideo}
            setReceivingVideo={setReceivingVideo}
            settings={settings}
            command={keyCommand}
            commandCounter={commandCounter}
          />
        ) : null}
      </div>
    </Router>
  )
}

export default App
