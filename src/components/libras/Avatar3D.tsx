import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { AvatarPose } from "@/lib/libras-data";

interface Props {
  sequence: AvatarPose[];
  playing: boolean;
  onStepChange?: (pose: AvatarPose, idx: number) => void;
  onComplete?: () => void;
}

const STEP_DURATION = 1.1;

function PrimitiveAvatar({ sequence, playing, onStepChange, onComplete }: Props) {
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const leftForeArm = useRef<THREE.Group>(null);
  const rightForeArm = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);

  const [stepIdx, setStepIdx] = useState(0);
  const stepStart = useRef(0);

  useEffect(() => {
    setStepIdx(0);
    stepStart.current = 0;
  }, [sequence]);

  const currentPose: AvatarPose = playing ? sequence[stepIdx] ?? "idle" : "idle";

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (playing) {
      if (stepStart.current === 0) stepStart.current = t;
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
    if (
      !rightArm.current ||
      !leftArm.current ||
      !rightForeArm.current ||
      !leftForeArm.current ||
      !head.current
    )
      return;

    const wave = Math.sin(t * 6);
    const sway = Math.sin(t * 2) * 0.15;
    const pulse = Math.abs(Math.sin(t * 3));

    // Baseline
    rightArm.current.rotation.set(0, 0, -0.1);
    leftArm.current.rotation.set(0, 0, 0.1);
    rightForeArm.current.rotation.set(0, 0, 0);
    leftForeArm.current.rotation.set(0, 0, 0);
    head.current.rotation.set(0, 0, 0);
    head.current.position.y = 1.55 + Math.sin(t * 1.6) * 0.01;

    switch (currentPose) {
      case "wave":
        rightArm.current.rotation.z = -2.0;
        rightForeArm.current.rotation.z = wave * 0.4 - 0.3;
        head.current.rotation.z = sway * 0.2;
        break;
      case "sun-rise":
        rightArm.current.rotation.z = -1.2 - pulse * 0.6;
        rightForeArm.current.rotation.x = -0.3;
        break;
      case "sun-set":
        rightArm.current.rotation.z = -2.4 + Math.sin(t * 1.5) * 0.4;
        rightForeArm.current.rotation.x = -0.2;
        break;
      case "thanks":
        rightArm.current.rotation.z = -1.3;
        rightForeArm.current.rotation.x = -1.4 + Math.sin(t * 3) * 0.2;
        head.current.rotation.x = 0.15;
        break;
      case "please":
        rightArm.current.rotation.z = -1.0;
        rightForeArm.current.rotation.x = -1.0;
        rightForeArm.current.rotation.y = Math.sin(t * 4) * 0.4;
        head.current.rotation.x = 0.05;
        break;
      case "help":
        rightArm.current.rotation.z = -1.6;
        leftArm.current.rotation.z = 1.6;
        rightForeArm.current.rotation.x = -1.2;
        leftForeArm.current.rotation.x = -1.2;
        head.current.rotation.x = -0.1;
        break;
      case "where":
        rightArm.current.rotation.z = -1.3;
        rightForeArm.current.rotation.x = -0.4;
        head.current.rotation.y = sway * 1.5;
        break;
      case "drink":
        rightArm.current.rotation.z = -1.4;
        rightForeArm.current.rotation.x = -1.6;
        head.current.rotation.x = -0.2;
        break;
      case "yes":
        head.current.rotation.x = Math.sin(t * 5) * 0.25;
        break;
      case "no":
        head.current.rotation.y = Math.sin(t * 5) * 0.35;
        rightArm.current.rotation.z = -1.3;
        rightForeArm.current.rotation.y = Math.sin(t * 6) * 0.5;
        break;
      case "idle":
      default:
        head.current.rotation.y = sway * 0.6;
    }
  });

  const skin = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#d8b39a", roughness: 0.7 }),
    [],
  );
  const cloth = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#5C574F", roughness: 0.85 }),
    [],
  );
  const pants = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#3d3a35", roughness: 0.9 }),
    [],
  );

  return (
    <group position={[0, -1, 0]}>
      <group ref={head} position={[0, 1.55, 0]}>
        <mesh material={skin}>
          <sphereGeometry args={[0.22, 32, 32]} />
        </mesh>
        <mesh position={[-0.07, 0.03, 0.2]}>
          <sphereGeometry args={[0.025, 16, 16]} />
          <meshStandardMaterial color="#292723" />
        </mesh>
        <mesh position={[0.07, 0.03, 0.2]}>
          <sphereGeometry args={[0.025, 16, 16]} />
          <meshStandardMaterial color="#292723" />
        </mesh>
      </group>
      <mesh position={[0, 0.95, 0]} material={cloth}>
        <boxGeometry args={[0.55, 0.7, 0.28]} />
      </mesh>
      <group ref={rightArm} position={[-0.32, 1.22, 0]}>
        <mesh position={[0, -0.22, 0]} material={cloth}>
          <capsuleGeometry args={[0.07, 0.32, 8, 16]} />
        </mesh>
        <group ref={rightForeArm} position={[0, -0.46, 0]}>
          <mesh position={[0, -0.2, 0]} material={skin}>
            <capsuleGeometry args={[0.06, 0.3, 8, 16]} />
          </mesh>
          <mesh position={[0, -0.4, 0]} material={skin}>
            <sphereGeometry args={[0.08, 16, 16]} />
          </mesh>
        </group>
      </group>
      <group ref={leftArm} position={[0.32, 1.22, 0]}>
        <mesh position={[0, -0.22, 0]} material={cloth}>
          <capsuleGeometry args={[0.07, 0.32, 8, 16]} />
        </mesh>
        <group ref={leftForeArm} position={[0, -0.46, 0]}>
          <mesh position={[0, -0.2, 0]} material={skin}>
            <capsuleGeometry args={[0.06, 0.3, 8, 16]} />
          </mesh>
          <mesh position={[0, -0.4, 0]} material={skin}>
            <sphereGeometry args={[0.08, 16, 16]} />
          </mesh>
        </group>
      </group>
      <mesh position={[0, 0.4, 0]} material={pants}>
        <boxGeometry args={[0.5, 0.3, 0.26]} />
      </mesh>
      <mesh position={[-0.13, 0.0, 0]} material={pants}>
        <capsuleGeometry args={[0.09, 0.4, 8, 16]} />
      </mesh>
      <mesh position={[0.13, 0.0, 0]} material={pants}>
        <capsuleGeometry args={[0.09, 0.4, 8, 16]} />
      </mesh>
    </group>
  );
}

export function Avatar3D(props: Props) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 0.4, 3.6], fov: 38 }}
      style={{ width: "100%", height: "100%" }}
      dpr={[1, 2]}
    >
      <ambientLight intensity={0.65} />
      <directionalLight position={[3, 5, 4]} intensity={1.1} castShadow />
      <directionalLight position={[-3, 2, -2]} intensity={0.4} color="#C27A63" />
      <PrimitiveAvatar {...props} />
      <OrbitControls
        target={[0, 0.4, 0]}
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI / 2.6}
        maxPolarAngle={Math.PI / 1.9}
      />
    </Canvas>
  );
}