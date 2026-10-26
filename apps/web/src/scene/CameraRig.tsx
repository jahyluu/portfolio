import { useEffect, useLayoutEffect, useState } from 'react'
import { useThree } from '@react-three/fiber'
import { CAMERA_BEATS } from './layout'

// temp: pin camera to a beat. 1-5 to hop around. scroll path replaces this in step 3
export function CameraRig() {
  const camera = useThree((state) => state.camera)
  const [beat, setBeat] = useState(0)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const n = Number(event.key)
      if (n >= 1 && n <= CAMERA_BEATS.length) setBeat(n - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useLayoutEffect(() => {
    const { position, target } = CAMERA_BEATS[beat]
    camera.position.set(...position)
    camera.lookAt(...target)
  }, [camera, beat])

  return null
}
