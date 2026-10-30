import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry, HalfFloatType, InterleavedBufferAttribute, Matrix4, WebGLRenderTarget, Mesh, Sphere, SpotLight, Vector3, type Material, type Object3D, type Scene, type Texture } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { markSceneReady } from '../loading'
import { tagOccluders } from './DeviceScreens'

// one pass over the cafe after it loads, to cut how much each frame has to do:
// - anything that never moves gets merged into one mesh per material (per area of the room),
//   so a few hundred draw calls instead of thousands
// - things no shadow-casting light can reach stop casting shadows
// - shaders get compiled up front instead of stuttering the first time something shows up
// people, steam, drips and ducks are tagged userData.dynamic and left alone. so is anything
// clickable, see-through, or that moved while we watched

// how long to watch for movement before deciding what's static
const WATCH_MS = 1000
// merged meshes are split into squares this big so the parts behind the camera still get culled
const CELL = 10
// shadow maps redraw every this many frames. people move slowly, nobody can tell
const SHADOW_EVERY = 2

const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))
const offscreen = new WebGLRenderTarget(1, 1, { type: HalfFloatType })

export function ScenePrep() {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  const camera = useThree((state) => state.camera)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      await frame()
      await frame()
      const moving = await watchForMovement(scene, () => cancelled)
      if (cancelled) return
      tagOccluders(scene)
      trimShadowCasters(scene)
      mergeStatic(scene, moving)
      mergeRigid(scene)
      // compile into an offscreen target like the EffectComposer does, otherwise these are
      // the to-screen versions of the shaders and the real ones still compile on first use
      const target = gl.getRenderTarget()
      gl.setRenderTarget(offscreen)
      // the programs get created right away, the await is just for the gpu to finish
      const compiled = gl.compileAsync(scene, camera)
      gl.setRenderTarget(target)
      await compiled
      if (!cancelled) markSceneReady()
    }
    run()
    return () => {
      cancelled = true
    }
  }, [gl, scene, camera])

  // redraw shadows every few frames instead of every frame
  useEffect(() => {
    gl.shadowMap.autoUpdate = false
    gl.shadowMap.needsUpdate = true
    return () => {
      gl.shadowMap.autoUpdate = true
    }
  }, [gl])
  const frames = useRef(0)
  useFrame(() => {
    // before the EffectComposer (priority 1) renders
    if (++frames.current % SHADOW_EVERY === 0) gl.shadowMap.needsUpdate = true
  })

  return null
}

// editing anything in scene/ during dev would leave the old merged copy behind, so reload
if (import.meta.hot) {
  import.meta.hot.on('vite:beforeUpdate', (payload: { updates: { path: string }[] }) => {
    if (payload.updates.some((update) => update.path.includes('/scene/'))) location.reload()
  })
}

function isDynamic(object: Object3D) {
  for (let o: Object3D | null = object; o; o = o.parent) {
    if (o.userData.dynamic) return true
    // clickable (r3f event handlers on it or a parent)
    if ((o as Object3D & { __r3f?: { eventCount?: number } }).__r3f?.eventCount) return true
  }
  return false
}

function shownInTree(object: Object3D) {
  for (let o: Object3D | null = object; o; o = o.parent) if (!o.visible) return false
  return true
}

async function watchForMovement(scene: Scene, cancelled: () => boolean) {
  const start = new Map<Mesh, { matrix: Matrix4; visible: boolean }>()
  scene.traverse((o) => {
    if ((o as Mesh).isMesh) start.set(o as Mesh, { matrix: o.matrixWorld.clone(), visible: shownInTree(o) })
  })
  const moving = new Set<Mesh>()
  const until = performance.now() + WATCH_MS
  while (performance.now() < until && !cancelled()) {
    await frame()
    start.forEach(({ matrix, visible }, mesh) => {
      if (!mesh.matrixWorld.equals(matrix) || shownInTree(mesh) !== visible || !mesh.parent) moving.add(mesh)
    })
  }
  return moving
}

// groups tagged userData.rigid (a person's head, their torso) move as one piece, so what's
// inside them can be merged in the group's own space and still move with it
function mergeRigid(scene: Scene) {
  const rigid: Object3D[] = []
  scene.traverse((o) => {
    if (o.userData.rigid) rigid.push(o)
  })
  rigid.forEach((group) => {
    group.updateMatrixWorld(true)
    const toGroup = group.matrixWorld.clone().invert()
    const groups = new Map<string, { material: Material; attributes: string[]; meshes: Mesh[] }>()
    group.traverse((o) => {
      const mesh = o as Mesh
      if (!mesh.isMesh || o === group || !mergeable(mesh)) return
      // only things fixed to this group, not ones with their own animation inside it
      for (let p: Object3D | null = mesh; p && p !== group; p = p.parent) if (p.userData.dynamic || !p.visible) return
      const attributes = attributesFor(mesh)
      if (!attributes) return
      const key = [materialKey(mesh.material as Material), attributes.join(), mesh.castShadow, mesh.receiveShadow, mesh.layers.mask, mesh.renderOrder].join('#')
      let entry = groups.get(key)
      if (!entry) {
        entry = { material: mesh.material as Material, attributes, meshes: [] }
        groups.set(key, entry)
      }
      entry.meshes.push(mesh)
    })
    groups.forEach(({ material, attributes, meshes }) => {
      if (meshes.length < 2) return
      const merged = combine(meshes, material, attributes, (mesh) => mesh.matrixWorld.clone().premultiply(toGroup))
      if (merged) group.add(merged)
    })
  })
}

// a shadow only shows up if the object is inside a shadow-casting light's cone. everything
// else drawing into the shadow maps is wasted work
function trimShadowCasters(scene: Scene) {
  const lights: { position: Vector3; direction: Vector3; angle: number; distance: number }[] = []
  scene.traverse((o) => {
    const light = o as SpotLight
    if (!light.isSpotLight || !light.castShadow) return
    const position = new Vector3().setFromMatrixPosition(light.matrixWorld)
    const target = new Vector3().setFromMatrixPosition(light.target.matrixWorld)
    lights.push({ position, direction: target.sub(position).normalize(), angle: light.angle, distance: light.distance || Infinity })
  })
  const bounds = new Sphere()
  const toward = new Vector3()
  scene.traverse((o) => {
    const mesh = o as Mesh
    if (!mesh.isMesh || !mesh.castShadow) return
    if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere()
    bounds.copy(mesh.geometry.boundingSphere!).applyMatrix4(mesh.matrixWorld)
    // people shift around a bit, give them room
    const radius = bounds.radius + (isDynamic(mesh) ? 0.4 : 0.05)
    const lit = lights.some(({ position, direction, angle, distance }) => {
      toward.copy(bounds.center).sub(position)
      const length = toward.length()
      if (length < radius) return true
      if (length - radius > distance) return false
      const off = Math.acos(Math.min(1, toward.dot(direction) / length))
      return off <= angle + Math.asin(Math.min(1, radius / length))
    })
    if (!lit) mesh.castShadow = false
  })
}

const TEXTURE_SLOTS = ['map', 'matcap', 'emissiveMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'alphaMap', 'aoMap', 'lightMap', 'bumpMap', 'envMap'] as const

// materials that would draw the same get the same key
function materialKey(material: Material) {
  const m = material as Material & Record<string, unknown>
  const color = (name: string) => (m[name] as { getHexString?: () => string } | undefined)?.getHexString?.() ?? ''
  const textures = TEXTURE_SLOTS.map((slot) => (m[slot] as Texture | null | undefined)?.uuid ?? '').join(',')
  return [
    m.type,
    color('color'),
    color('emissive'),
    m.emissiveIntensity,
    m.roughness,
    m.metalness,
    m.flatShading,
    m.side,
    m.vertexColors,
    m.fog,
    m.toneMapped,
    m.alphaTest,
    m.depthWrite,
    m.depthTest,
    m.colorWrite,
    m.polygonOffset,
    m.polygonOffsetFactor,
    m.polygonOffsetUnits,
    m.wireframe,
    m.blending,
    textures,
  ].join('|')
}

function mergeStatic(scene: Scene, moving: Set<Mesh>) {
  scene.updateMatrixWorld(true)
  const groups = new Map<string, { material: Material; attributes: string[]; meshes: Mesh[] }>()
  const bounds = new Sphere()
  scene.traverse((o) => {
    const mesh = o as Mesh
    if (!mesh.isMesh || !mergeable(mesh) || moving.has(mesh) || !shownInTree(mesh) || isDynamic(mesh)) return
    const material = mesh.material as Material
    const attributes = attributesFor(mesh)
    if (!attributes) return
    const geometry = mesh.geometry
    if (!geometry.boundingSphere) geometry.computeBoundingSphere()
    bounds.copy(geometry.boundingSphere!).applyMatrix4(mesh.matrixWorld)
    const cell = `${Math.floor(bounds.center.x / CELL)},${Math.floor(bounds.center.z / CELL)}`
    const key = [materialKey(material), attributes.join(), mesh.castShadow, mesh.receiveShadow, mesh.layers.mask, mesh.renderOrder, cell].join('#')
    let group = groups.get(key)
    if (!group) {
      group = { material, attributes, meshes: [] }
      groups.set(key, group)
    }
    group.meshes.push(mesh)
  })

  groups.forEach(({ material, attributes, meshes }) => {
    if (meshes.length < 2) return
    const merged = combine(meshes, material, attributes, (mesh) => mesh.matrixWorld)
    if (merged) scene.add(merged)
  })
}

function mergeable(mesh: Mesh) {
  if ((mesh as Mesh & { isInstancedMesh?: boolean }).isInstancedMesh || (mesh as Mesh & { isSkinnedMesh?: boolean }).isSkinnedMesh) return false
  if (Array.isArray(mesh.material) || Object.keys(mesh.geometry.morphAttributes).length) return false
  const material = mesh.material as Material
  // see-through things need sorting per object, custom shaders animate
  return !material.transparent && ['MeshStandardMaterial', 'MeshBasicMaterial', 'MeshLambertMaterial', 'MeshPhongMaterial', 'MeshMatcapMaterial'].includes(material.type)
}

// the attributes the material actually reads, or null if the geometry's missing one
function attributesFor(mesh: Mesh) {
  const material = mesh.material as Material & { vertexColors?: boolean }
  const attributes = ['position', 'normal']
  if (TEXTURE_SLOTS.some((slot) => slot !== 'matcap' && (material as unknown as Record<string, unknown>)[slot])) attributes.push('uv')
  if (material.vertexColors) attributes.push('color')
  return attributes.every((name) => mesh.geometry.attributes[name]) ? attributes : null
}

// one mesh from many, each placed by `place`. the originals stay mounted for React, just
// not drawn
function combine(meshes: Mesh[], material: Material, attributes: string[], place: (mesh: Mesh) => Matrix4) {
  const parts = meshes.map((mesh) => bake(mesh, attributes, place(mesh)))
  const geometry = mergeGeometries(parts, false)
  parts.forEach((part) => part.dispose())
  if (!geometry) return null
  const merged = new Mesh(geometry, material)
  const first = meshes[0]
  merged.castShadow = first.castShadow
  merged.receiveShadow = first.receiveShadow
  merged.layers.mask = first.layers.mask
  merged.renderOrder = first.renderOrder
  merged.userData.merged = true
  meshes.forEach((mesh) => (mesh.visible = false))
  return merged
}

// a copy of the mesh's geometry, transformed, indexed, with just the attributes we need
function bake(mesh: Mesh, attributes: string[], matrix: Matrix4) {
  const source = mesh.geometry
  const geometry = new BufferGeometry()
  const getters = ['getX', 'getY', 'getZ', 'getW'] as const
  attributes.forEach((name) => {
    const attribute = source.attributes[name] as BufferAttribute | InterleavedBufferAttribute
    const { count, itemSize } = attribute
    const values = new Float32Array(count * itemSize)
    for (let i = 0; i < count; i++) for (let k = 0; k < itemSize; k++) values[i * itemSize + k] = attribute[getters[k]](i)
    geometry.setAttribute(name, new BufferAttribute(values, itemSize))
  })
  const count = source.attributes.position.count
  const index: number[] = []
  if (source.index) for (let i = 0; i < source.index.count; i++) index.push(source.index.getX(i))
  else for (let i = 0; i < count; i++) index.push(i)
  // mirrored transforms flip the winding, flip it back so the right side faces out
  if (matrix.determinant() < 0) {
    for (let i = 0; i < index.length; i += 3) [index[i + 1], index[i + 2]] = [index[i + 2], index[i + 1]]
  }
  geometry.setIndex(index)
  geometry.applyMatrix4(matrix)
  return geometry
}
