import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CanvasTexture, Euler, InstancedMesh, LessEqualDepth, MathUtils, Matrix4, Mesh, MeshBasicMaterial, PlaneGeometry, Quaternion, Scene, Sphere, SRGBColorSpace, Vector3, type Texture } from 'three'
import { DISPLAYS, screenRect, type Device } from '../desktop/screen'
import { getSnapshot, useSnapshotVersion } from '../desktop/snapshot'
import { smoothedScroll, useDesktopActive } from '../handoff'
import { LAPTOP, MY_PHONE, MY_SCREEN, MY_TABLE, PHONE_SCREEN, SCREEN_SIZE, TABLE_HEIGHT } from './layout'

// scroll progress where the snapshot fades in over the plain screen underneath (blue on the
// laptop like everyone else's, black glass on the phone). the phone only comes into view late
const FADE = { laptop: [0.4, 0.75], phone: [0.62, 0.85] } as const

type ScreenProps = {
  device: Device
  position: Vector3
  quaternion: Quaternion
  width: number
  height: number
}

// the latest snapshot, fading in over the screen in the cafe as you get close. drawn in its own
// pass after post so tone mapping doesn't touch the colors. depth comes from Occluders
function DeviceScreen({ device, position, quaternion, width, height }: ScreenProps) {
  const version = useSnapshotVersion()
  const anisotropy = useThree((state) => state.gl.capabilities.getMaxAnisotropy())
  const size = useThree((state) => state.size)
  const rect = screenRect(size.width, size.height)
  const active = rect.device === device

  const { scene, material, mesh } = useMemo(() => {
    // sits right on the black glass, nudge it forward
    const material = new MeshBasicMaterial({
      fog: false,
      transparent: true,
      depthFunc: LessEqualDepth,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -8,
    })
    const mesh = new Mesh(new PlaneGeometry(width, height), material)
    mesh.position.copy(position)
    mesh.quaternion.copy(quaternion)
    const scene = new Scene()
    scene.add(mesh)
    return { scene, material, mesh }
  }, [position, quaternion, width, height])

  // match the UI rect's aspect exactly (it's whole pixels)
  useEffect(() => {
    mesh.scale.x = active ? rect.width / rect.height / DISPLAYS[device].aspect : 1
  }, [mesh, active, rect.width, rect.height, device])

  // only the device the camera ends on shows the UI, the other one stays a plain screen
  useEffect(() => {
    let texture: Texture | null = null
    const image = active ? getSnapshot() : null
    if (image) {
      texture = new CanvasTexture(image)
      texture.colorSpace = SRGBColorSpace
      texture.anisotropy = Math.min(8, anisotropy)
    }
    const previous = material.map
    material.map = texture
    material.needsUpdate = true
    previous?.dispose()
  }, [version, active, material, anisotropy])

  // after the EffectComposer (priority 1) and Occluders (2)
  useFrame(({ gl, camera }) => {
    if (!material.map) return
    const [from, to] = FADE[device]
    material.opacity = MathUtils.smoothstep(smoothedScroll.progress, from, to)
    if (!material.opacity) return
    const autoClear = gl.autoClear
    gl.autoClear = false
    gl.setRenderTarget(null)
    gl.render(scene, camera)
    gl.autoClear = autoClear
  }, 3)

  return null
}

// stuff around my table that can get between the camera and a screen (me, chair, cup, the
// laptop in front of the phone). drawn depth-only before the screens so they get covered
const OCCLUDER_LAYER = 1
const NEAR_TABLE = new Sphere(new Vector3(MY_TABLE.position[0], TABLE_HEIGHT, MY_TABLE.position[2]), 1.2)
const depthOnly = new MeshBasicMaterial({ colorWrite: false })

// called once by ScenePrep, before it merges anything
export function tagOccluders(scene: Scene) {
  const bounds = new Sphere()
  scene.traverse((object) => {
    if (!(object instanceof Mesh) || !object.visible) return
    if (!object.geometry.boundingSphere) object.geometry.computeBoundingSphere()
    bounds.copy(object.geometry.boundingSphere!).applyMatrix4(object.matrixWorld)
    // skip big instanced sets (rain, gravel)
    if (object instanceof InstancedMesh && bounds.radius > 1) return
    if (bounds.center.distanceTo(NEAR_TABLE.center) < NEAR_TABLE.radius) object.layers.enable(OCCLUDER_LAYER)
  })
}

export function Occluders() {
  const scene = useThree((state) => state.scene)

  useFrame(({ gl, camera }) => {
    const { mask } = camera.layers
    const { autoClear } = gl
    const shadows = gl.shadowMap.autoUpdate
    // otherwise three clears the frame for the background color
    const background = scene.background
    scene.background = null
    camera.layers.set(OCCLUDER_LAYER)
    scene.overrideMaterial = depthOnly
    gl.shadowMap.autoUpdate = false
    gl.autoClear = false
    gl.setRenderTarget(null)
    gl.clearDepth()
    gl.render(scene, camera)
    gl.autoClear = autoClear
    gl.shadowMap.autoUpdate = shadows
    scene.overrideMaterial = null
    scene.background = background
    camera.layers.mask = mask
  }, 2)

  return null
}

// same transform as the lid in Laptop (CafeBlockout)
const LAPTOP_POSE = {
  position: new Vector3(...MY_SCREEN.center),
  quaternion: new Quaternion().setFromEuler(new Euler(LAPTOP.tilt, 0, 0)).multiply(new Quaternion().setFromEuler(new Euler(0, Math.PI, 0))),
}

// lying flat: plane faces up, its top edge along the phone's top
const PHONE_POSE = (() => {
  const top = new Vector3(...MY_PHONE.top)
  const normal = new Vector3(...MY_PHONE.normal)
  const right = top.clone().cross(normal)
  return {
    position: new Vector3(...MY_PHONE.center),
    quaternion: new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(right, top, normal)),
  }
})()

export function LaptopScreen() {
  return <DeviceScreen device="laptop" {...LAPTOP_POSE} width={SCREEN_SIZE.width} height={SCREEN_SIZE.height} />
}

export function PhoneScreen() {
  return <DeviceScreen device="phone" {...PHONE_POSE} width={PHONE_SCREEN.width} height={PHONE_SCREEN.height} />
}

// stop rendering the cafe while you're on the desktop/phone UI, it's covered apart from the
// device's edges. scroll or resize wakes it up. a new snapshot renders one frame so the
// texture is already uploaded when you leave
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
