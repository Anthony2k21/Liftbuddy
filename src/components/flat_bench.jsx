import { useRef } from 'react'
import { useGLTF } from '@react-three/drei'

export function FlatBench(props) {
  const group = useRef()
  const { scene } = useGLTF('/flat_bench.glb') // path in public/

  return (
    <group ref={group} {...props} dispose={null}>
      <primitive object={scene} />
    </group>
  )
}

// optional: preloading
useGLTF.preload('/flat_bench.glb')