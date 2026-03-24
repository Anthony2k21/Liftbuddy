import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import * as THREE from 'three'


function createCircleGlowTexture() {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0,   'rgba(0, 229, 255, 0.55)')
  gradient.addColorStop(0.4, 'rgba(0, 229, 255, 0.15)')
  gradient.addColorStop(1,   'rgba(0, 229, 255, 0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(canvas)
}

const COLORS = {
  high: new THREE.Color(0x39ff14),
  med:  new THREE.Color(0x00e5ff),
  low:  new THREE.Color(0xff3d71),
  rest: new THREE.Color(0xaaaaaa),
}

const LEVEL_RANK = { rest: 0, low: 1, med: 2, high: 3 }

function getMuscleGroup(name, muscleData) {
  const n = name.toLowerCase()
  if (n.includes('chest') || n.includes('pectoral'))                                          return 'chest'
  if (n.includes('abs') || n.includes('core') || n.includes('abdom'))                         return 'abs'
  if (n.includes('arm') || n.includes('bicep') || n.includes('tricep'))                       return 'arms'
  if (n.includes('back') || n.includes('lat') || n.includes('trap'))                          return 'back'
  // Combined mesh — pick whichever has higher activity
  if ((n.includes('leg') || n.includes('quad') || n.includes('hamstring') || n.includes('calf')) &&
      (n.includes('shoulder') || n.includes('delt'))) {
    const legsRank     = LEVEL_RANK[muscleData?.legs]      ?? 0
    const shoulderRank = LEVEL_RANK[muscleData?.shoulders] ?? 0
    return shoulderRank > legsRank ? 'shoulders' : 'legs'
  }
  if (n.includes('leg') || n.includes('quad') || n.includes('hamstring') || n.includes('calf')) return 'legs'
  if (n.includes('shoulder') || n.includes('delt'))                                            return 'shoulders'
  return null
}

export function HumanModel({ muscleData, autoRotate, rotY, rotX, onClickModel }) {
  const groupRef    = useRef()
  const glowRef     = useRef()
  const glowTexture  = useMemo(() => createCircleGlowTexture(), [])
  const { scene, animations } = useGLTF('/model.glb')
  const { actions, names }    = useAnimations(animations, groupRef)

  // Play a specific animation clip from the GLB
  // Play first available animation
  useEffect(() => {
    if (!actions) return

    const keys = Object.keys(actions)
    if (keys.length === 0) return

    // Log so you can see which one is used
    console.log('Available action keys:', keys)

    const action = actions[keys[0]] // or keys[1], keys[2], etc.
    if (!action) return

    action.reset().setLoop(THREE.LoopRepeat).play()

    return () => {
      action.stop()
    }
  }, [actions])

  // Apply muscle colours
  const originalMaterials = useRef(new Map())

  // Log the animation clips and names
  useEffect(() => {
    console.log('Animation clips:', animations)
    console.log('Animation names:', names)
  }, [animations, names])

useEffect(() => {
  if (!scene) return
  scene.traverse((child) => {
    if (!child.isMesh) return
    if (!originalMaterials.current.has(child.uuid)) {
      originalMaterials.current.set(child.uuid, child.material.clone())
    }
    const original = originalMaterials.current.get(child.uuid)
    child.material = original.clone()
    const group = getMuscleGroup(child.name, muscleData)
    if (group && muscleData[group] && muscleData[group] !== 'rest') {
      const color = COLORS[muscleData[group]]
      child.material.color.set(color)
      child.material.emissive = color.clone()
      child.material.emissiveIntensity = 0.15
    } else {
      child.material.emissive = new THREE.Color(0x000000)
      child.material.emissiveIntensity = 0
    }
    child.material.needsUpdate = true
  })
}, [scene, muscleData])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (groupRef.current) {
      groupRef.current.rotation.y = autoRotate ? t * 0.4 : rotY
      groupRef.current.rotation.x = rotX
    }
    if (glowRef.current) {
      glowRef.current.material.opacity = 0.7 + Math.sin(t * 1.5) * 0.15
    }
  })

  return (
    <>
      <ambientLight intensity={3} />
      <directionalLight intensity={1.5} position={[2, 4, 3]} castShadow />
      <directionalLight intensity={0.5} position={[-2, 2, -2]} />

      <group
        ref={groupRef}
        position={[0, -1, -1.5]}
        scale={70}
        onClick={onClickModel}
      >
        <primitive object={scene} />
      </group>

      {/* Solid floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.07, -1.5]}>
        <planeGeometry args={[10, 10]} />
        <meshBasicMaterial color={0x0a0f1a} />
      </mesh>

      {/* Subtle grid */}
      <gridHelper args={[10, 10, 0x0d3d4f, 0x0a2030]} position={[0, -1.065, -1.5]} />

      {/* Circular glow spot under model */}
      <mesh ref={glowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.06, -1.5]}>
        <planeGeometry args={[3, 3]} />
        <meshBasicMaterial map={glowTexture} transparent depthWrite={false} />
      </mesh>
    </>
  )
}

useGLTF.preload('/model.glb')