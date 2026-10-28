import { useLayoutEffect, useRef } from 'react'
import { CatmullRomCurve3, IcosahedronGeometry, InstancedMesh, Matrix4, TubeGeometry, Vector3 } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { STRING_LIGHTS } from './layout'
import { COLOR, GLOW } from './palette'

// string lights draped along the ceiling beams.
// bulbs are unlit + bloom, no actual lights, so they're basically free

// wire height at s (0-1) along a swag
function droop(s: number) {
  return STRING_LIGHTS.hangFrom - STRING_LIGHTS.sag * 4 * s * (1 - s)
}

// one swag per pair of tie-offs, on each beam
const SWAGS = STRING_LIGHTS.z.flatMap((z) =>
  STRING_LIGHTS.ties.slice(1).map((to, i) => ({ from: STRING_LIGHTS.ties[i], to, z })),
)

// all the wire merged into one mesh
const WIRE = mergeGeometries(
  SWAGS.map(({ from, to, z }) => {
    const points = Array.from({ length: 13 }, (_, i) => {
      const s = i / 12
      return new Vector3(from + (to - from) * s, droop(s), z)
    })
    return new TubeGeometry(new CatmullRomCurve3(points), 24, 0.004, 4, false)
  }),
)

// bulbs hang just under the wire
const BULBS = SWAGS.flatMap(({ from, to, z }) => {
  const count = Math.max(1, Math.round((to - from) / STRING_LIGHTS.spacing))
  return Array.from({ length: count }, (_, i) => {
    const s = (i + 0.5) / count
    return new Vector3(from + (to - from) * s, droop(s) - 0.03, z)
  })
})
const BULB = new IcosahedronGeometry(0.02, 0)

export function StringLights() {
  const bulbs = useRef<InstancedMesh>(null!)

  useLayoutEffect(() => {
    const matrix = new Matrix4()
    BULBS.forEach((position, i) => {
      // stretch y a bit for a teardrop shape
      matrix.makeScale(1, 1.3, 1).setPosition(position)
      bulbs.current.setMatrixAt(i, matrix)
    })
    bulbs.current.instanceMatrix.needsUpdate = true
    bulbs.current.computeBoundingSphere()
  }, [])

  return (
    <group>
      <mesh geometry={WIRE}>
        <meshStandardMaterial color={COLOR.wire} roughness={0.8} />
      </mesh>
      <instancedMesh key={BULBS.length} ref={bulbs} args={[BULB, undefined, BULBS.length]}>
        <meshBasicMaterial color={GLOW.stringBulb} />
      </instancedMesh>
    </group>
  )
}
