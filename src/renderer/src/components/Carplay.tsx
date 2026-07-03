import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { findDevice, CommandMapping } from 'node-carplay/web'
import { CarPlayWorker, KeyCommand, CarplayWorkerMessage } from './worker/types'
import useCarplayAudio from './useCarplayAudio'
import { useCarplayTouch } from './useCarplayTouch'
import { ExtraConfig } from '../../../main/Globals'
import { InitEvent } from './worker/render/RenderEvents'

const width = 1920
const height = 720

const videoChannel = new MessageChannel()
const micChannel = new MessageChannel()

const RETRY_DELAY_MS = 0

interface CarplayProps {
  settings: ExtraConfig
  command: string
  commandCounter: number
}

const LoadingIndicator = React.memo(() => <div className="loading-spinner" aria-label="Connecting" />)

const VideoContainer = React.memo(
  ({
    sendTouchEvent,
    canvasRef,
    isPlugged
  }: {
    sendTouchEvent: React.PointerEventHandler<HTMLDivElement>
    canvasRef: React.RefObject<HTMLCanvasElement>
    isPlugged: boolean
  }) => (
    <div
      id="videoContainer"
      onPointerDown={sendTouchEvent}
      onPointerMove={sendTouchEvent}
      onPointerUp={sendTouchEvent}
      onPointerCancel={sendTouchEvent}
      onPointerOut={sendTouchEvent}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex'
      }}
    >
      <canvas ref={canvasRef} id={'video'} style={isPlugged ? { height: '100%' } : undefined} />
    </div>
  )
)

function Carplay({ settings, command, commandCounter }: CarplayProps): JSX.Element {
  const [isPlugged, setPlugged] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null)
  const mainElem = useRef<HTMLDivElement>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const config = useMemo(
    () => ({
      fps: settings.fps,
      width,
      height,
      mediaDelay: settings.mediaDelay
    }),
    [settings.fps, settings.mediaDelay]
  )

  const renderWorker = useMemo(() => {
    if (!canvasElement) return null

    const worker = new Worker(new URL('./worker/render/Render.worker.ts', import.meta.url), {
      type: 'module'
    })
    const canvas = canvasElement.transferControlToOffscreen()
    worker.postMessage(new InitEvent(canvas, videoChannel.port2), [canvas, videoChannel.port2])
    return worker
  }, [canvasElement])

  useLayoutEffect(() => {
    if (canvasRef.current) {
      setCanvasElement(canvasRef.current)
    }
  }, [])

  const carplayWorker = useMemo(() => {
    const worker = new Worker(new URL('./worker/CarPlay.worker.ts', import.meta.url), {
      type: 'module'
    }) as CarPlayWorker
    const payload = {
      videoPort: videoChannel.port1,
      microphonePort: micChannel.port1
    }
    worker.postMessage({ type: 'initialise', payload }, [videoChannel.port1, micChannel.port1])
    return worker
  }, [])

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

  const handleWorkerMessage = useCallback(
    (ev: CarplayWorkerMessage) => {
      const { type } = ev.data
      switch (type) {
        case 'plugged':
          setPlugged(true)
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
        case 'failure': {
          if (retryTimeoutRef.current == null) {
            retryTimeoutRef.current = setTimeout(() => {
              window.location.reload()
            }, RETRY_DELAY_MS)
          }
          break
        }
      }
    },
    [clearRetryTimeout, getAudioPlayer, processAudio, startRecording, stopRecording]
  )

  useEffect(() => {
    carplayWorker.onmessage = handleWorkerMessage
  }, [carplayWorker, handleWorkerMessage])

  useEffect(() => {
    return () => {
      clearRetryTimeout()
      carplayWorker.postMessage({ type: 'stop' })
      carplayWorker.terminate()
    }
  }, [carplayWorker, clearRetryTimeout])

  useEffect(() => {
    return () => {
      renderWorker?.terminate()
    }
  }, [renderWorker])

  const handleResize = useCallback(() => {
    carplayWorker.postMessage({ type: 'frame' })
  }, [carplayWorker])

  useEffect(() => {
    const element = mainElem?.current
    if (!element) return
    const observer = new ResizeObserver(handleResize)
    observer.observe(element)
    return () => {
      observer.disconnect()
    }
  }, [handleResize])

  useEffect(() => {
    if (!command) return
    carplayWorker.postMessage({ type: 'keyCommand', command: command as KeyCommand })
  }, [command, commandCounter, carplayWorker])

  const checkDevice = useCallback(async () => {
    const device = await findDevice()
    if (device) {
      carplayWorker.postMessage({ type: 'start', payload: { config } })
    }
  }, [carplayWorker, config])

  useEffect(() => {
    navigator.usb.onconnect = () => checkDevice()
    navigator.usb.ondisconnect = async () => {
      const device = await findDevice()
      if (!device) {
        carplayWorker.postMessage({ type: 'stop' })
      }
    }

    checkDevice()
  }, [carplayWorker, checkDevice])

  const sendTouchEvent = useCarplayTouch(carplayWorker, width, height)

  return (
    <div style={{ height: '100%', touchAction: 'none' }} id={'main'} className="App" ref={mainElem}>
      {!isPlugged && <LoadingIndicator />}
      <VideoContainer sendTouchEvent={sendTouchEvent} canvasRef={canvasRef} isPlugged={isPlugged} />
    </div>
  )
}

export default React.memo(Carplay)
