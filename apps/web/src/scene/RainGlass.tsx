import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { ShaderMaterial, Vector2 } from 'three'
import type { Vec3 } from './layout'
import { COLOR } from './palette'

// a pane of glass with rain on it: low-poly diamond drops (faceted, lit from the upper
// left) running down the glass, each leaving a thin wet trail. no drops sitting still
// on the glass: from across the room they read as snow. sizes are in meters, so the door pane and the
// storefront get the same size drops. it's all drawn in a shader on one flat plane,
// so it's cheap however many drops there are.
// drops are a little bigger than real ones so they read from across the room

type RainGlassProps = { position: Vec3; rotationY: number; width: number; height: number }

export function RainGlass({ position, rotationY, width, height }: RainGlassProps) {
  const rain = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uSize: { value: new Vector2(width, height) } },
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        transparent: true,
        depthWrite: false,
      }),
    [width, height],
  )

  useFrame(({ clock }) => {
    rain.uniforms.uTime.value = clock.elapsedTime
  })

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color={COLOR.glass} transparent opacity={0.06} roughness={0.05} depthWrite={false} />
      </mesh>
      {/* rain sits just on the room side of the glass */}
      <mesh position={[0, 0, 0.003]} material={rain}>
        <planeGeometry args={[width, height]} />
      </mesh>
    </group>
  )
}

const VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const FRAGMENT = /* glsl */ `
uniform float uTime;
uniform vec2 uSize; // pane size in meters
varying vec2 vUv;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

// a diamond at offset d (meters) from its center, half-width w, half-height h.
// returns how much of this pixel it covers, and the shade of the facet it's on:
// lit from the upper left, so four facets from light to dark
vec2 diamond(vec2 d, float w, float h) {
  float k = abs(d.x) / w + abs(d.y) / h;
  float cover = 1.0 - smoothstep(0.82, 1.0, k);
  float shade = d.y > 0.0 ? (d.x < 0.0 ? 1.0 : 0.78) : (d.x < 0.0 ? 0.62 : 0.48);
  return vec2(cover, shade);
}

// a long diamond sliding down its column with a little wiggle, a thin wet trail
// behind it. it reaches the bottom, waits, and starts again from the top.
// most columns (about three quarters) have a runner
vec2 runner(vec2 m, float column, float t, float seed) {
  float col = floor(m.x / column);
  float h = hash(vec2(col, seed));
  float x = (fract(m.x / column) - 0.5) * column;
  float speed = 0.08 + h * 0.2;
  float cycle = (uSize.y + 0.3) / speed + 1.0 + h * 4.0;
  float tt = mod(t + h * 40.0, cycle);
  float dropY = uSize.y - tt * speed;
  float dx = x - (h - 0.5) * column * 0.5 - sin(m.y * 25.0 + h * 6.0) * 0.004;
  float dy = m.y - dropY;
  float r = 0.012 + h * 0.006;
  vec2 drop = diamond(vec2(dx, dy), r * 0.65, r * 1.4);
  float trail = (1.0 - smoothstep(0.002, 0.004, abs(dx))) * step(0.0, dy) * exp(-dy * 3.5) * 0.5;
  vec2 result = drop.x >= trail ? drop : vec2(trail, 0.7);
  return vec2(result.x * step(0.25, hash(vec2(col, seed + 5.0))), result.y);
}

void main() {
  vec2 m = vUv * uSize; // meters from the bottom left corner
  // three layers of columns at different spacings and speeds, so the streaks don't line up
  vec2 best = runner(m, 0.16, uTime, 1.0);
  vec2 other = runner(m + vec2(0.08, 0.0), 0.23, uTime * 0.8, 2.0);
  if (other.x > best.x) best = other;
  other = runner(m + vec2(0.035, 0.0), 0.19, uTime * 1.15, 3.0);
  if (other.x > best.x) best = other;
  if (best.x < 0.01) discard;
  // water catching a little light, shaded by facet
  gl_FragColor = vec4(vec3(0.72, 0.76, 0.84) * best.y, best.x * 0.4);
}
`
