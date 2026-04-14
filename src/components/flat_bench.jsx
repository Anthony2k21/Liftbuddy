import { useRef } from 'react'
import { useGLTF } from '@react-three/drei'

export function FlatBench(props) {
  const group = useRef()
  const { scene } = useGLTF(import.meta.env.BASE_URL + 'flat_bench.glb')

  return (
    <group ref={group} {...props} dispose={null}>
      <primitive object={scene} />
    </group>
  )
}

// optional: preloading
useGLTF.preload('/flat_bench.glb')