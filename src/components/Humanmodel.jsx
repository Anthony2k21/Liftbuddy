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

  rest: new THREE.Color(0x888888),
}

const LEVEL_RANK = { rest: 0, low: 1, med: 2, high: 3 }

function getMuscleGroup(name, muscleData) {
  const n = name.toLowerCase()
  if (n === 'underwear' || n === 'backmesh.001') return null
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

export function HumanModel({ muscleData, autoRotate, rotY, onClickModel, activeAnimation, onAnimationsLoaded }) {
  const groupRef    = useRef()
  const glowRef     = useRef()
  const glowTexture  = useMemo(() => createCircleGlowTexture(), [])
  const { scene, animations } = useGLTF('/model.glb')
  const { actions, names }    = useAnimations(animations, groupRef)

  useEffect(() => {
    if (!scene) return
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
  }, [scene])

  // Expose animation names to parent once loaded
  useEffect(() => {
    if (names && names.length > 0 && onAnimationsLoaded) {
      onAnimationsLoaded([...new Set(names)])
    }
  }, [names, onAnimationsLoaded])

  // Switch animation when activeAnimation changes
  useEffect(() => {
    if (!actions) return
    const keys = Object.keys(actions)
    if (keys.length === 0) return

    // Stop all currently playing actions
    keys.forEach(k => actions[k]?.stop())

    const target = activeAnimation && actions[activeAnimation] ? activeAnimation : keys[0]
    const action = actions[target]
    if (!action) return

    action.reset().setLoop(THREE.LoopRepeat).play()

    return () => {
      action.stop()
    }
  }, [actions, activeAnimation])

  // Apply muscle colours
  const originalMaterials = useRef(new Map())


useEffect(() => {
  if (!scene) return
  scene.traverse((child) => {
    if (!child.isMesh) return
    if (!originalMaterials.current.has(child.uuid)) {
      originalMaterials.current.set(child.uuid, child.material.clone())
    }
    const original = originalMaterials.current.get(child.uuid)
    child.material = original.clone()
    const n = child.name.toLowerCase()
    if (n === 'absmesh003' || n === 'absmesh003_1') return
    const group = getMuscleGroup(child.name, muscleData)
    if (group && muscleData[group] && muscleData[group] !== 'rest') {
      const color = COLORS[muscleData[group]]
      child.material.map = null
      child.material.color.set(color)
      child.material.roughness = 0.6
      child.material.metalness = 0.1
      child.material.emissive = new THREE.Color(0x000000)
      child.material.emissiveIntensity = 0
    } else {
      child.material.map = null
      child.material.color.set(COLORS.rest)
      child.material.roughness = 0.9
      child.material.metalness = 0.7
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
    }
    if (glowRef.current) {
      glowRef.current.material.opacity = 0.7 + Math.sin(t * 1.5) * 0.15
    }
  })

  return (
    <>
      <ambientLight intensity={0.4} color={0xffffff} />
      <directionalLight intensity={2} color={0xffffff} position={[2, 5, 3]} castShadow />
      {/* <directionalLight intensity={0.8} color={0xffffff} position={[-2, 2, -2]} /> */}
      <directionalLight intensity={0.6} color={0xffffff} position={[0, -2, -3]} />
      <pointLight intensity={1.5} color={0xffffff} position={[0, 3, 2]} />

      <group
        ref={groupRef}
        position={[0, -1.07, -0.8]}
        scale={0.7}
      >
        <primitive object={scene} />
        {/* Invisible click proxy covering the full body */}
        <mesh position={[0, 1, 0]} onClick={onClickModel}>
          <capsuleGeometry args={[0.4, 1.5, 4, 8]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>

      {/* Solid floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.07, -1.5]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <meshBasicMaterial color={0x000000} />
      </mesh>

      {/* Vibrant grid */}
      <gridHelper args={[10, 20, 0xffffff, 0x444444]} position={[0, -1.065, -1.5]} />

      {/* Circular glow spot under model */}
      <mesh ref={glowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.06, -0.5]}>
        <planeGeometry args={[5, 5]} />
        <meshBasicMaterial map={glowTexture} transparent depthWrite={false} />
      </mesh>
    </>
  )
}

useGLTF.preload('/model.glb')