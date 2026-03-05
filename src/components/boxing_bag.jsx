import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'

export function BoxingBag(props) {
  const group = useRef()
  const { scene } = useGLTF('/boxing_bag.glb') // path in public/

  // Slow idle spin
  useFrame((_, delta) => {
    if (!group.current) return
    group.current.rotation.y += delta * 0.1 // adjust speed if needed
  })

  return (
    <group ref={group} {...props} dispose={null}>
      <primitive object={scene} />
    </group>
  )
}

// optional: preloading
useGLTF.preload('/boxing_bag.glb')