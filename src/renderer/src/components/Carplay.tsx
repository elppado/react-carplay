import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { RotatingLines } from 'react-loader-spinner'
//import './App.css'
import { findDevice, requestDevice, CommandMapping, CarplayMessage } from 'node-carplay/web'
import { CarPlayWorker, KeyCommand, CarplayWorkerMessage } from './worker/types'
import useCarplayAudio from './useCarplayAudio'
import { useCarplayTouch } from './useCarplayTouch'
import { useLocation } from 'react-router-dom'
import { ExtraConfig } from '../../../main/Globals'
import { useCarplayStore } from '../store/store'
import { InitEvent } from './worker/render/RenderEvents'
// import { Dialog, DialogTitle, DialogContent, Slide, Button } from '@mui/material';
// import { TransitionProps } from '@mui/material/transitions/transition';

const width = 1920
const height = 720

const videoChannel = new MessageChannel()
const micChannel = new MessageChannel()

const RETRY_DELAY_MS = 0

interface CarplayProps {
  receivingVideo: boolean
  setReceivingVideo: (receivingVideo: boolean) => void
  settings: ExtraConfig
  command: string
  commandCounter: number
}

// 로딩 컴포넌트 분리
const LoadingIndicator = React.memo(() => (
  <div
    style={{
      position: 'absolute',
      width: '100%',
      height: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}
  >
    <RotatingLines
      strokeColor="grey"
      strokeWidth="5"
      animationDuration="1"
      width="128"
      visible={true}
    />
  </div>
))

// 비디오 컨테이너 컴포넌트 분리
const VideoContainer = React.memo(({ 
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
))

function Carplay({
  setReceivingVideo,
  settings,
  command,
  commandCounter
}: CarplayProps): JSX.Element {
  const [isPlugged, setPlugged] = useState(false)
  const [deviceFound, setDeviceFound] = useState(false)
  const { pathname } = useLocation()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null)
  const mainElem = useRef<HTMLDivElement>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const stream = useCarplayStore((state) => state.stream)

  const config = {
    fps: settings.fps,
    width,
    height,
    mediaDelay: settings.mediaDelay
  }

  const renderWorker = useMemo(() => {
    if (!canvasElement) return

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

  const handleWorkerMessage = useCallback((ev: CarplayWorkerMessage) => {
    const { type } = ev.data
    switch (type) {
      case 'plugged':
        setPlugged(true)
        break
      case 'unplugged':
        setPlugged(false)
        break
      case 'requestBuffer':
        clearRetryTimeout()
        getAudioPlayer(ev.data.message)
        break
      case 'audio':
        clearRetryTimeout()
        processAudio(ev.data.message)
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
  }, [clearRetryTimeout, getAudioPlayer, processAudio, startRecording, stopRecording])

  useEffect(() => {
    carplayWorker.onmessage = handleWorkerMessage
  }, [carplayWorker, handleWorkerMessage])

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
    carplayWorker.postMessage({ type: 'keyCommand', command: command as KeyCommand })
  }, [command, commandCounter, carplayWorker])

  const checkDevice = useCallback(
    async (request: boolean = false) => {
      const device = request ? await requestDevice() : await findDevice()
      if (device) {
        setDeviceFound(true)
        setReceivingVideo(true)
        carplayWorker.postMessage({ type: 'start', payload: { config } })
      } else {
        setDeviceFound(false)
      }
    },
    [carplayWorker, config, setReceivingVideo]
  )

  useEffect(() => {
    navigator.usb.onconnect = () => checkDevice()
    navigator.usb.ondisconnect = async () => {
      const device = await findDevice()
      if (!device) {
        carplayWorker.postMessage({ type: 'stop' })
        setDeviceFound(false)
      }
    }
  }, [carplayWorker, checkDevice])

  const sendTouchEvent = useCarplayTouch(carplayWorker, width, height)

  const isLoading = !isPlugged
  const isRootPath = pathname === '/'

  const mainStyle = useMemo(() => 
    isRootPath ? { height: '100%', touchAction: 'none' } : { height: '100%' }
  , [isRootPath])

  return (
    <div
      style={mainStyle}
      id={'main'}
      className="App"
      ref={mainElem}
    >
      {isLoading && isRootPath && (
        <LoadingIndicator />
      )}
      <VideoContainer 
        sendTouchEvent={sendTouchEvent}
        canvasRef={canvasRef}
        isPlugged={isPlugged}
      />
    </div>
  )
}

export default React.memo(Carplay)