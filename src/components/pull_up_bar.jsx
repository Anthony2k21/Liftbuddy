import { useRef } from 'react'
import { useGLTF } from '@react-three/drei'

// Pull-up bar GLB loader
export function PullUpBar(props) {
  const group = useRef()
  const { scene } = useGLTF('/pull_up_bar.glb') // path in public/

  return (
    <group ref={group} {...props} dispose={null}>
      <primitive object={scene} />
    </group>
  )
}

// optional: preloading
useGLTF.preload('/pull_up_bar.glb')