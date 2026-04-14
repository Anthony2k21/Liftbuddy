import { useRef } from 'react'
import { useGLTF } from '@react-three/drei'

// Pull-up bar GLB loader
export function PullUpBar(props) {
  const group = useRef()
  const { scene } = useGLTF(import.meta.env.BASE_URL + 'pull_up_bar.glb')

  return (
    <group ref={group} {...props} dispose={null}>
      <primitive object={scene} />
    </group>
  )
}

// optional: preloading
useGLTF.preload('/pull_up_bar.glb')