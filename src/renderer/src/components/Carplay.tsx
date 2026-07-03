import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { findDevice, CommandMapping } from 'node-carplay/web'
import { CarplayWorkerMessage, KeyCommand } from './worker/types'
import useCarplayAudio from './useCarplayAudio'
import { useCarplayTouch } from './useCarplayTouch'
import { ExtraConfig } from '../../../main/Globals'
import { InitEvent } from './worker/render/RenderEvents'
import { carplayWorker, micChannel, videoChannel } from '../lib/carplayWorkers'

const RETRY_DELAY_MS = 1500
const MAX_START_RETRIES = 8

interface CarplayProps {
  settings: ExtraConfig
  command: string
  commandCounter: number
}

function Carplay({ settings, command, commandCounter }: CarplayProps): JSX.Element {
  const [isPlugged, setPlugged] = useState(false)
  const width = settings.width
  const height = settings.height

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mainElem = useRef<HTMLDivElement>(null)
  const renderWorkerRef = useRef<Worker | null>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const retryCountRef = useRef(0)
  const sessionStartedRef = useRef(false)

  const config = useMemo(
    () => ({
      fps: settings.fps,
      width,
      height,
      mediaDelay: settings.mediaDelay
    }),
    [settings.fps, settings.mediaDelay, width, height]
  )

  const configRef = useRef(config)
  configRef.current = config

  const { processAudio, getAudioPlayer, startRecording, stopRecording } = useCarplayAudio(
    carplayWorker,
    micChannel.port2
  )

  const clearRetryTimeout = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }
  }, [])

  const startSession = useCallback(() => {
    carplayWorker.postMessage({ type: 'start', payload: { config: configRef.current } })
  }, [])

  const retrySession = useCallback(() => {
    if (retryCountRef.current >= MAX_START_RETRIES) return

    retryCountRef.current += 1
    carplayWorker.postMessage({ type: 'stop' })
    startSession()
  }, [startSession])

  const scheduleRetry = useCallback(() => {
    if (retryTimeoutRef.current != null || retryCountRef.current >= MAX_START_RETRIES) return

    retryTimeoutRef.current = setTimeout(() => {
      retryTimeoutRef.current = null
      retrySession()
    }, RETRY_DELAY_MS)
  }, [retrySession])

  const handleWorkerMessage = useCallback(
    (ev: CarplayWorkerMessage) => {
      const { type } = ev.data
      switch (type) {
        case 'plugged':
          clearRetryTimeout()
          retryCountRef.current = 0
          setPlugged(true)
          carplayWorker.postMessage({ type: 'frame' })
          break
        case 'unplugged':
          setPlugged(false)
          break
        case 'getAudioPlayer':
          clearRetryTimeout()
          void getAudioPlayer(ev.data.message)
          break
        case 'audio':
          clearRetryTimeout()
          void processAudio(ev.data.message)
          break
        case 'media':
          break
        case 'command': {
          const {
            message: { value }
          } = ev.data
          switch (value) {
            case CommandMapping.startRecordAudio:
              startRecording()
              break
            case CommandMapping.stopRecordAudio:
              stopRecording()
              break
            case CommandMapping.requestHostUI:
              break
          }
          break
        }
        case 'failure':
          scheduleRetry()
          break
      }
    },
    [
      clearRetryTimeout,
      getAudioPlayer,
      processAudio,
      scheduleRetry,
      startRecording,
      stopRecording
    ]
  )

  useLayoutEffect(() => {
    if (sessionStartedRef.current) return

    const canvas = canvasRef.current
    if (!canvas) return

    sessionStartedRef.current = true

    const worker = new Worker(new URL('./worker/render/Render.worker.ts', import.meta.url), {
      type: 'module'
    })
    const offscreen = canvas.transferControlToOffscreen()
    worker.postMessage(new InitEvent(offscreen, videoChannel.port2), [offscreen, videoChannel.port2])
    renderWorkerRef.current = worker

    startSession()
  }, [startSession])

  useEffect(() => {
    carplayWorker.onmessage = handleWorkerMessage
  }, [handleWorkerMessage])

  useEffect(() => {
    return () => {
      clearRetryTimeout()
      carplayWorker.postMessage({ type: 'stop' })
      renderWorkerRef.current?.terminate()
      renderWorkerRef.current = null
      sessionStartedRef.current = false
    }
  }, [clearRetryTimeout])

  const handleResize = useCallback(() => {
    carplayWorker.postMessage({ type: 'frame' })
  }, [])

  useEffect(() => {
    const element = mainElem.current
    if (!element) return
    const observer = new ResizeObserver(handleResize)
    observer.observe(element)
    return () => observer.disconnect()
  }, [handleResize])

  useEffect(() => {
    if (!command) return
    carplayWorker.postMessage({ type: 'keyCommand', command: command as KeyCommand })
  }, [command, commandCounter])

  useEffect(() => {
    navigator.usb.onconnect = () => startSession()
    navigator.usb.ondisconnect = async () => {
      const device = await findDevice()
      if (!device) {
        carplayWorker.postMessage({ type: 'stop' })
        setPlugged(false)
      }
    }
  }, [startSession])

  const sendTouchEvent = useCarplayTouch(carplayWorker, width, height)

  return (
    <div style={{ height: '100%', touchAction: 'none' }} id="main" className="App" ref={mainElem}>
      {!isPlugged && <div className="loading-spinner" aria-label="Connecting" />}
      <div
        id="videoContainer"
        onPointerDown={sendTouchEvent}
        onPointerMove={sendTouchEvent}
        onPointerUp={sendTouchEvent}
        onPointerCancel={sendTouchEvent}
        onPointerOut={sendTouchEvent}
        style={{ width: '100%', height: '100%', display: 'flex' }}
      >
        <canvas ref={canvasRef} id="video" style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  )
}

export default Carplay
