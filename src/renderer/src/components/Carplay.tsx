import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { RotatingLines, Loader } from 'react-loader-spinner'
//import './App.css'
import { findDevice, requestDevice, CommandMapping } from 'node-carplay/web'
import { CarPlayWorker, KeyCommand } from './worker/types'
import useCarplayAudio from './useCarplayAudio'
import { useCarplayTouch } from './useCarplayTouch'
import { useLocation, useNavigate } from 'react-router-dom'
import { ExtraConfig } from '../../../main/Globals'
import { useCarplayStore } from '../store/store'
import { InitEvent } from './worker/render/RenderEvents'
import init, { VideoProcessor } from '../../../wasm/pkg'
// import { Dialog, DialogTitle, DialogContent, Slide, Button } from '@mui/material';
// import { TransitionProps } from '@mui/material/transitions/transition';

const width = 1920
const height = 720

const videoChannel = new MessageChannel()
const micChannel = new MessageChannel()

const RETRY_DELAY_MS = 5000

interface CarplayProps {
  receivingVideo: boolean
  setReceivingVideo: (receivingVideo: boolean) => void
  settings: ExtraConfig
  command: string
  commandCounter: number
}

function Carplay({
  setReceivingVideo,
  settings,
  command,
  commandCounter
}: CarplayProps): JSX.Element {
  const [isPlugged, setPlugged] = useState(false)
  const [deviceFound, setDeviceFound] = useState(false)
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null)
  const mainElem = useRef<HTMLDivElement>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const stream = useCarplayStore((state) => state.stream)
  const config = {
    fps: settings.fps,
    width: width,
    height: height,
    mediaDelay: settings.mediaDelay
  }
  console.log(pathname)

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

  // subscribe to worker messages
  useEffect(() => {
    carplayWorker.onmessage = (ev): void => {
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
          //TODO: implement
          break
        case 'command': {
          const {
            message: { value }
          } = ev.data
          switch (value) {
            case CommandMapping.startRecordAudio: {
              startRecording()
              break
            }
            case CommandMapping.stopRecordAudio: {
              stopRecording()
              break
            }
            case CommandMapping.requestHostUI: {
              break
            }
          }
          break
        }
        case 'failure': {
          if (retryTimeoutRef.current == null) {
            console.error(`Carplay initialization failed -- Reloading page in ${RETRY_DELAY_MS}ms`)
            retryTimeoutRef.current = setTimeout(() => {
              window.location.reload()
            }, RETRY_DELAY_MS)
          }
          break
        }
      }
    }
  }, [
    carplayWorker,
    clearRetryTimeout,
    getAudioPlayer,
    processAudio,
    renderWorker,
    startRecording,
    stopRecording
  ])

  useEffect(() => {
    const element = mainElem?.current
    if (!element) return
    const observer = new ResizeObserver(() => {
      console.log('size change')
      carplayWorker.postMessage({ type: 'frame' })
    })
    observer.observe(element)
    return () => {
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    carplayWorker.postMessage({ type: 'keyCommand', command: command as KeyCommand })
  }, [commandCounter])

  const checkDevice = useCallback(
    async (request: boolean = false) => {
      const device = request ? await requestDevice() : await findDevice()
      if (device) {
        console.log('starting in check')
        setDeviceFound(true)
        setReceivingVideo(true)
        carplayWorker.postMessage({ type: 'start', payload: { config } })
      } else {
        setDeviceFound(false)
      }
    },
    [carplayWorker]
  )

  // usb connect/disconnect handling and device check
  useEffect(() => {
    navigator.usb.onconnect = async (): Promise<void> => {
      checkDevice()
    }

    navigator.usb.ondisconnect = async (): Promise<void> => {
      const device = await findDevice()
      if (!device) {
        carplayWorker.postMessage({ type: 'stop' })
        setDeviceFound(false)
      }
    }

    //checkDevice()
  }, [carplayWorker, checkDevice])

  // const onClick = useCallback(() => {
  //   checkDevice(true)
  // }, [checkDevice])

  const sendTouchEvent = useCarplayTouch(carplayWorker, width, height)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const videoProcessorRef = useRef<VideoProcessor | null>(null)

  useEffect(() => {
    const initWasm = async () => {
      try {
        await init()
        if (videoRef.current) {
          const { videoWidth, videoHeight } = videoRef.current
          videoProcessorRef.current = new VideoProcessor(videoWidth, videoHeight)
        }
      } catch (err) {
        console.error('Failed to initialize WebAssembly:', err)
      }
    }

    initWasm()
  }, [])

  const handleVideoFrame = () => {
    if (!videoRef.current || !canvasRef.current || !videoProcessorRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // WebAssembly를 사용한 프레임 처리
    const frameData = new Uint8Array(video.videoWidth * video.videoHeight * 4)
    const tempCanvas = document.createElement('canvas')
    const tempCtx = tempCanvas.getContext('2d')
    if (!tempCtx) return

    tempCanvas.width = video.videoWidth
    tempCanvas.height = video.videoHeight
    tempCtx.drawImage(video, 0, 0)
    const imageData = tempCtx.getImageData(0, 0, video.videoWidth, video.videoHeight)
    
    const processedData = videoProcessorRef.current.process_frame(imageData.data)
    const processedImageData = new ImageData(
      new Uint8ClampedArray(processedData),
      video.videoWidth,
      video.videoHeight
    )

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.putImageData(processedImageData, 0, 0)

    requestAnimationFrame(handleVideoFrame)
  }

  return (
    <div
      style={pathname === '/' ? { height: '100%', touchAction: 'none' } : { height: '100%' }}
      id={'main'}
      className="App"
      ref={mainElem}
    >
      {(deviceFound === false || !isPlugged) && pathname === '/' && (
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
          {deviceFound === false && (
            <button rel="noopener noreferrer" style={{ display: 'none' }}></button>
          )}
          {deviceFound && (
            <RotatingLines
              strokeColor="grey"
              strokeWidth="5"
              animationDuration="0.75"
              width="96"
              visible={true}
            />
          )}
        </div>
      )}
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
      {isLoading && (
        <div className="loading-container">
          <Loader type="ThreeDots" color="#00BFFF" height={100} width={100} />
        </div>
      )}
      {error && <div className="error-message">{error}</div>}
      <video
        ref={videoRef}
        style={{ display: 'none' }}
        onLoadedData={() => {
          setIsLoading(false)
          handleVideoFrame()
        }}
      />
    </div>
  )
}

export default React.memo(Carplay)
