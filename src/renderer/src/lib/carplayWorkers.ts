import { CarPlayWorker } from '../components/worker/types'

export const videoChannel = new MessageChannel()
export const micChannel = new MessageChannel()

export const carplayWorker = new Worker(
  new URL('../components/worker/CarPlay.worker.ts', import.meta.url),
  { type: 'module' }
) as CarPlayWorker

carplayWorker.postMessage(
  {
    type: 'initialise',
    payload: {
      videoPort: videoChannel.port1,
      microphonePort: micChannel.port1
    }
  },
  [videoChannel.port1, micChannel.port1]
)
