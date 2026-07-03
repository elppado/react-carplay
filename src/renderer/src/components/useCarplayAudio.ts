import { useCallback, useEffect, useRef, useState } from 'react'
import { AudioCommand, AudioData, WebMicrophone, decodeTypeMap } from 'node-carplay/web'
import { PcmPlayer } from 'pcm-ringbuf-player'
import { AudioPlayerKey, CarPlayWorker } from './worker/types'
import { createAudioPlayerKey } from './worker/utils'

const defaultAudioVolume = 1
const defaultNavVolume = 0.5

const useCarplayAudio = (worker: CarPlayWorker, microphonePort: MessagePort) => {
  const micRef = useRef<WebMicrophone | null>(null)
  const micInitRef = useRef<Promise<WebMicrophone | null> | null>(null)
  const [audioPlayers] = useState(new Map<AudioPlayerKey, PcmPlayer>())

  const ensureMic = useCallback(async (): Promise<WebMicrophone | null> => {
    if (micRef.current) return micRef.current
    if (micInitRef.current) return micInitRef.current

    micInitRef.current = (async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mic = new WebMicrophone(mediaStream, microphonePort)
        micRef.current = mic
        return mic
      } catch (err) {
        console.error('Failed to init microphone', err)
        return null
      } finally {
        micInitRef.current = null
      }
    })()

    return micInitRef.current
  }, [microphonePort])

  const getAudioPlayer = useCallback(
    async (audio: AudioData): Promise<PcmPlayer> => {
      const { decodeType, audioType } = audio
      const format = decodeTypeMap[decodeType]
      const audioKey = createAudioPlayerKey(decodeType, audioType)
      let player = audioPlayers.get(audioKey)
      if (player) return player
      player = new PcmPlayer(format.frequency, format.channel)
      audioPlayers.set(audioKey, player)
      player.volume(defaultAudioVolume)
      await player.start()
      worker.postMessage({
        type: 'audioPlayer',
        payload: {
          sab: player.getRawBuffer(),
          decodeType,
          audioType
        }
      })
      return player
    },
    [audioPlayers, worker]
  )

  const processAudio = useCallback(
    async (audio: AudioData) => {
      if (audio.volumeDuration) {
        const { volume, volumeDuration } = audio
        const player = await getAudioPlayer(audio)
        player.volume(volume, volumeDuration)
      } else if (audio.command) {
        switch (audio.command) {
          case AudioCommand.AudioNaviStart: {
            const navPlayer = await getAudioPlayer(audio)
            navPlayer.volume(defaultNavVolume)
            break
          }
          case AudioCommand.AudioMediaStart:
          case AudioCommand.AudioOutputStart: {
            const mediaPlayer = await getAudioPlayer(audio)
            mediaPlayer.volume(defaultAudioVolume)
            break
          }
        }
      }
    },
    [getAudioPlayer]
  )

  useEffect(() => {
    return (): void => {
      audioPlayers.forEach((p) => p.stop())
    }
  }, [audioPlayers])

  const startRecording = useCallback(() => {
    void ensureMic().then((mic) => mic?.start())
  }, [ensureMic])

  const stopRecording = useCallback(() => {
    micRef.current?.stop()
  }, [])

  return { processAudio, getAudioPlayer, startRecording, stopRecording }
}

export default useCarplayAudio
