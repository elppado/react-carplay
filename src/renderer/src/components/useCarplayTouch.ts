import { useRef, useCallback } from 'react'
import { TouchAction } from 'node-carplay/web'
import { CarPlayWorker } from './worker/types'

export const useCarplayTouch = (worker: CarPlayWorker, width: number, height: number) => {
  const pointerDownRef = useRef(false)

  const sendTouchEvent: React.PointerEventHandler<HTMLDivElement> = useCallback(
    (e) => {
      let action = TouchAction.Up
      if (e.type === 'pointerdown') {
        action = TouchAction.Down
        pointerDownRef.current = true
      } else if (pointerDownRef.current) {
        switch (e.type) {
          case 'pointermove':
            action = TouchAction.Move
            break
          case 'pointerup':
          case 'pointercancel':
          case 'pointerout':
            pointerDownRef.current = false
            action = TouchAction.Up
            break
        }
      } else {
        return
      }

      const { offsetX: x, offsetY: y } = e.nativeEvent
      worker.postMessage({
        type: 'touch',
        payload: { x: x / width, y: y / height, action }
      })
    },
    [worker, width, height]
  )

  return sendTouchEvent
}
