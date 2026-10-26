import { PENDANT } from './layout'

// blockout lighting, just enough to read the layout. real pass later
export function Lighting() {
  return (
    <>
      {/* cool fill so nothing goes full black */}
      <ambientLight intensity={0.35} color="#7d8bb0" />

      {/* hero pendant */}
      <pointLight position={PENDANT.position} color="#ffb46b" intensity={14} distance={7} decay={2} />

      {/* warm pools over the other tables */}
      <pointLight position={[3.2, 2.4, -2.0]} color="#ffb46b" intensity={4} distance={5} decay={2} />
      <pointLight position={[3.6, 2.4, 1.95]} color="#ffb46b" intensity={3} distance={5} decay={2} />
      <pointLight position={[3.5, 2.6, -3.6]} color="#ffcf99" intensity={4} distance={6} decay={2} />

      {/* window light */}
      <directionalLight position={[-10, 4, 1]} color="#5f7fbf" intensity={0.6} />

      {/* screen glow */}
      <pointLight position={[0, 0.95, -0.15]} color="#9cc0ff" intensity={0.8} distance={1.2} decay={2} />
    </>
  )
}
