import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CanvasTexture, Euler, Mesh, MeshBasicMaterial, PlaneGeometry, Quaternion, Scene, SRGBColorSpace, Vector3 } from 'three'
import { SCREEN_ASPECT, screenRect } from '../desktop/screen'
import { getSnapshot, useSnapshotVersion } from '../desktop/snapshot'
import { smoothedScroll, useDesktopActive } from '../handoff'
import { LAPTOP, MY_SCREEN, SCREEN_SIZE } from './layout'

// slightly dimmed from far away so it doesn't glow, full brightness on landing
const BRIGHTNESS = { far: 0.82, fadeFrom: 0.6, fadeTo: 0.95 }

// my laptop's screen showing the latest desktop snapshot (black until there is one).
// rendered in a separate pass after post-processing so tone mapping doesn't change its
// colors. skips the depth buffer, nothing in the scene ever passes in front of it
export function DesktopScreen() {
  const version = useSnapshotVersion()
  const anisotropy = useThree((state) => state.gl.capabilities.getMaxAnisotropy())
  const size = useThree((state) => state.size)

  const { scene, material, mesh } = useMemo(() => {
    const material = new MeshBasicMaterial({ color: '#000000', fog: false })
    const mesh = new Mesh(new PlaneGeometry(SCREEN_SIZE.width, SCREEN_SIZE.height), material)
    // same transform as the lid in Laptop (CafeBlockout)
    mesh.position.copy(new Vector3(...MY_SCREEN.center))
    mesh.quaternion.setFromEuler(new Euler(LAPTOP.tilt, 0, 0)).multiply(new Quaternion().setFromEuler(new Euler(0, Math.PI, 0)))
    const scene = new Scene()
    scene.add(mesh)
    return { scene, material, mesh }
  }, [])

  // match the desktop rect's aspect exactly (whole pixels, so not quite 16:10)
  useEffect(() => {
    const rect = screenRect(size.width, size.height)
    mesh.scale.x = rect.width / rect.height / SCREEN_ASPECT
  }, [mesh, size])

  useEffect(() => {
    const image = getSnapshot()
    if (!image) return
    const texture = new CanvasTexture(image)
    texture.colorSpace = SRGBColorSpace
    texture.anisotropy = Math.min(8, anisotropy)
    const previous = material.map
    material.map = texture
    material.needsUpdate = true
    previous?.dispose()
  }, [version, material, anisotropy])

  // runs after the EffectComposer (priority 1)
  useFrame(({ gl, camera }) => {
    const t = (smoothedScroll.progress - BRIGHTNESS.fadeFrom) / (BRIGHTNESS.fadeTo - BRIGHTNESS.fadeFrom)
    const brightness = material.map ? BRIGHTNESS.far + (1 - BRIGHTNESS.far) * Math.min(Math.max(t, 0), 1) : 0
    material.color.setScalar(brightness)
    const autoClear = gl.autoClear
    gl.autoClear = false
    gl.setRenderTarget(null)
    gl.render(scene, camera)
    gl.autoClear = autoClear
  }, 2)

  return null
}

// stop rendering the cafe while you're on the desktop, it's covered apart from the laptop's
// edges. scroll or resize wakes it up. a new snapshot renders one frame so the texture is
// already uploaded when you leave
export function PauseOnDesktop() {
  const setFrameloop = useThree((state) => state.setFrameloop)
  const invalidate = useThree((state) => state.invalidate)
  const active = useDesktopActive()
  const version = useSnapshotVersion()

  useEffect(() => {
    if (active) invalidate()
  }, [version, active, invalidate])

  useEffect(() => {
    if (!active) return
    let timer = setTimeout(() => setFrameloop('demand'), 600)
    const wake = () => {
      setFrameloop('always')
      clearTimeout(timer)
      timer = setTimeout(() => setFrameloop('demand'), 600)
    }
    window.addEventListener('scroll', wake, { passive: true })
    window.addEventListener('resize', wake)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('scroll', wake)
      window.removeEventListener('resize', wake)
      setFrameloop('always')
    }
  }, [active, setFrameloop])

  return null
}
