import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { AvatarPose } from "@/lib/libras-data";

interface Props {
  sequence: AvatarPose[];
  playing: boolean;
  onStepChange?: (pose: AvatarPose, idx: number) => void;
  onComplete?: () => void;
}

/**
 * Avatar humanoide simplificado em primitivas Three.js.
 * Animação pré-definida por pose (braços, mãos, cabeça).
 */
function Humanoid({
  sequence,
  playing,
  onStepChange,
  onComplete,
}: Props) {
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const leftForearm = useRef<THREE.Group>(null);
  const rightForearm = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);

  const [stepIdx, setStepIdx] = useState(0);
  const stepStart = useRef<number>(0);
  const STEP_DURATION = 1.1;

  const currentPose: AvatarPose = playing ? sequence[stepIdx] ?? "idle" : "idle";

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (playing) {
      const elapsed = t - stepStart.current;
      if (elapsed > STEP_DURATION) {
        const next = stepIdx + 1;
        if (next >= sequence.length) {
          onComplete?.();
          stepStart.current = t;
          setStepIdx(0);
        } else {
          stepStart.current = t;
          setStepIdx(next);
          onStepChange?.(sequence[next], next);
        }
      }
    }

    // Idle breathing
    if (head.current) head.current.position.y = 1.55 + Math.sin(t * 1.6) * 0.01;

    const wave = Math.sin(t * 6) * 0.6;
    const sway = Math.sin(t * 2) * 0.15;

    // Reset arms then apply per-pose
    if (rightArm.current && leftArm.current && rightForearm.current && leftForearm.current && head.current) {
      // baseline
      rightArm.current.rotation.set(0, 0, -0.1);
      leftArm.current.rotation.set(0, 0, 0.1);
      rightForearm.current.rotation.set(0, 0, 0);
      leftForearm.current.rotation.set(0, 0, 0);
      head.current.rotation.set(0, 0, 0);

      switch (currentPose) {
        case "wave":
          rightArm.current.rotation.z = -2.0;
          rightArm.current.rotation.x = -0.3;
          rightForearm.current.rotation.z = wave * 0.4 - 0.3;
          head.current.rotation.z = sway * 0.2;
          break;
        case "sun-rise":
          rightArm.current.rotation.z = -1.2 - Math.abs(Math.sin(t * 1.5)) * 0.5;
          rightForearm.current.rotation.x = -0.5;
          break;
        case "sun-set":
          rightArm.current.rotation.z = -2.4 + Math.sin(t * 1.5) * 0.4;
          rightForearm.current.rotation.x = -0.3;
          break;
        case "thanks":
          rightArm.current.rotation.z = -1.3;
          rightForearm.current.rotation.x = -1.4;
          rightForearm.current.rotation.z = Math.sin(t * 3) * 0.3 - 0.4;
          head.current.rotation.x = 0.15;
          break;
        case "please":
          rightArm.current.rotation.z = -1.0;
          rightForearm.current.rotation.x = -1.1;
          rightForearm.current.rotation.y = Math.sin(t * 4) * 0.4;
          break;
        case "help":
          rightArm.current.rotation.z = -1.6;
          leftArm.current.rotation.z = 1.6;
          rightForearm.current.rotation.x = -1.2;
          leftForearm.current.rotation.x = -1.2;
          head.current.position.y = 1.55 + Math.abs(Math.sin(t * 3)) * 0.04;
          break;
        case "where":
          rightArm.current.rotation.z = -1.8;
          rightForearm.current.rotation.x = -0.6;
          head.current.rotation.y = Math.sin(t * 2) * 0.25;
          break;
        case "drink":
          rightArm.current.rotation.z = -1.4;
          rightForearm.current.rotation.x = -1.6;
          head.current.rotation.x = -0.2;
          break;
        case "yes":
          head.current.rotation.x = Math.sin(t * 5) * 0.25;
          rightArm.current.rotation.z = -0.4;
          break;
        case "no":
          head.current.rotation.y = Math.sin(t * 5) * 0.3;
          rightArm.current.rotation.z = -1.2;
          rightForearm.current.rotation.x = -0.8;
          rightForearm.current.rotation.y = Math.sin(t * 6) * 0.5;
          break;
        case "idle":
        default:
          head.current.rotation.y = sway * 0.1;
          break;
      }
    }
  });

  const skin = useMemo(() => new THREE.MeshStandardMaterial({ color: "#d8b39a", roughness: 0.7 }), []);
  const cloth = useMemo(() => new THREE.MeshStandardMaterial({ color: "#5C574F", roughness: 0.8 }), []);

  return (
    <group position={[0, -1, 0]}>
      {/* Head */}
      <group ref={head} position={[0, 1.55, 0]}>
        <mesh material={skin} castShadow>
          <sphereGeometry args={[0.22, 32, 32]} />
        </mesh>
        {/* Eyes */}
        <mesh position={[-0.07, 0.03, 0.2]}>
          <sphereGeometry args={[0.025, 16, 16]} />
          <meshStandardMaterial color="#292723" />
        </mesh>
        <mesh position={[0.07, 0.03, 0.2]}>
          <sphereGeometry args={[0.025, 16, 16]} />
          <meshStandardMaterial color="#292723" />
        </mesh>
        {/* Smile */}
        <mesh position={[0, -0.07, 0.2]} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.05, 0.008, 8, 16, Math.PI]} />
          <meshStandardMaterial color="#C27A63" />
        </mesh>
      </group>

      {/* Neck */}
      <mesh position={[0, 1.32, 0]} material={skin}>
        <cylinderGeometry args={[0.07, 0.08, 0.12, 16]} />
      </mesh>

      {/* Torso */}
      <mesh position={[0, 0.95, 0]} material={cloth} castShadow>
        <boxGeometry args={[0.55, 0.7, 0.28]} />
      </mesh>

      {/* Right arm group (avatar's right = viewer's left) */}
      <group ref={rightArm} position={[-0.32, 1.22, 0]}>
        <mesh position={[0, -0.22, 0]} material={cloth}>
          <capsuleGeometry args={[0.07, 0.32, 8, 16]} />
        </mesh>
        <group ref={rightForearm} position={[0, -0.46, 0]}>
          <mesh position={[0, -0.2, 0]} material={skin}>
            <capsuleGeometry args={[0.06, 0.3, 8, 16]} />
          </mesh>
          {/* Hand */}
          <mesh position={[0, -0.4, 0]} material={skin}>
            <sphereGeometry args={[0.08, 16, 16]} />
          </mesh>
        </group>
      </group>

      {/* Left arm group */}
      <group ref={leftArm} position={[0.32, 1.22, 0]}>
        <mesh position={[0, -0.22, 0]} material={cloth}>
          <capsuleGeometry args={[0.07, 0.32, 8, 16]} />
        </mesh>
        <group ref={leftForearm} position={[0, -0.46, 0]}>
          <mesh position={[0, -0.2, 0]} material={skin}>
            <capsuleGeometry args={[0.06, 0.3, 8, 16]} />
          </mesh>
          <mesh position={[0, -0.4, 0]} material={skin}>
            <sphereGeometry args={[0.08, 16, 16]} />
          </mesh>
        </group>
      </group>

      {/* Hips/legs */}
      <mesh position={[0, 0.4, 0]} material={cloth}>
        <boxGeometry args={[0.5, 0.3, 0.26]} />
      </mesh>
      <mesh position={[-0.13, 0.0, 0]} material={cloth}>
        <capsuleGeometry args={[0.09, 0.4, 8, 16]} />
      </mesh>
      <mesh position={[0.13, 0.0, 0]} material={cloth}>
        <capsuleGeometry args={[0.09, 0.4, 8, 16]} />
      </mesh>

      {/* Floor shadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.25, 0]} receiveShadow>
        <circleGeometry args={[0.9, 32]} />
        <meshBasicMaterial color="#000" opacity={0.06} transparent />
      </mesh>
    </group>
  );
}

export function Avatar3D(props: Props) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 1, 3.2], fov: 38 }}
      style={{ width: "100%", height: "100%" }}
      dpr={[1, 2]}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 5, 4]} intensity={1.1} castShadow />
      <directionalLight position={[-3, 2, -2]} intensity={0.4} color="#C27A63" />
      <Humanoid {...props} />
      <Environment preset="apartment" />
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI / 2.6}
        maxPolarAngle={Math.PI / 1.9}
      />
    </Canvas>
  );
}
