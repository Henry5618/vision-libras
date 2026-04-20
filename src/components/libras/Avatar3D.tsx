import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, useGLTF } from "@react-three/drei";
import {
  Component,
  type ErrorInfo,
  type ReactNode,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import type { AvatarPose } from "@/lib/libras-data";

interface Props {
  sequence: AvatarPose[];
  playing: boolean;
  onStepChange?: (pose: AvatarPose, idx: number) => void;
  onComplete?: () => void;
}

// Soldier.glb (threejs.org examples) — humanoide com bones Mixamo, sempre disponível via CORS.
const AVATAR_URL = "https://threejs.org/examples/models/gltf/Soldier.glb";
// Preload só no browser (evita ProgressEvent crash no SSR Node)
if (typeof window !== "undefined") {
  useGLTF.preload(AVATAR_URL);
}

const STEP_DURATION = 1.1;

function setBone(b: THREE.Object3D | undefined, x: number, y: number, z: number) {
  if (!b) return;
  b.rotation.set(x, y, z);
}

function GLBAvatar({ sequence, playing, onStepChange, onComplete }: Props) {
  const { scene } = useGLTF(AVATAR_URL);
  const cloned = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    return c;
  }, [scene]);

  const bones = useMemo(() => {
    const map: Record<string, THREE.Object3D | undefined> = {};
    cloned.traverse((obj) => {
      if ((obj as THREE.Bone).isBone) map[obj.name] = obj;
    });
    // Mixamo bones (Soldier.glb usa prefixo "mixamorig")
    const get = (name: string) => map[name] ?? map[`mixamorig${name}`] ?? map[`mixamorig:${name}`];
    return {
      head: get("Head"),
      neck: get("Neck"),
      spine: get("Spine") ?? get("Spine1"),
      lArm: get("LeftArm"),
      rArm: get("RightArm"),
      lForeArm: get("LeftForeArm"),
      rForeArm: get("RightForeArm"),
      lHand: get("LeftHand"),
      rHand: get("RightHand"),
    };
  }, [cloned]);

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

    // Baseline (braços relaxados ao lado do corpo)
    setBone(bones.lArm, 0, 0, 1.25);
    setBone(bones.rArm, 0, 0, -1.25);
    setBone(bones.lForeArm, 0, 0, 0);
    setBone(bones.rForeArm, 0, 0, 0);
    setBone(bones.head, 0, 0, 0);
    setBone(bones.spine, Math.sin(t * 1.4) * 0.01, 0, 0);

    const wave = Math.sin(t * 6);
    const sway = Math.sin(t * 2);
    const pulse = Math.abs(Math.sin(t * 3));

    switch (currentPose) {
      case "wave":
        setBone(bones.rArm, 0, 0, -2.6);
        setBone(bones.rForeArm, 0, wave * 0.6, -0.4);
        setBone(bones.head, 0, 0, sway * 0.15);
        break;
      case "sun-rise":
        setBone(bones.rArm, 0, 0, -2.0 - pulse * 0.4);
        setBone(bones.rForeArm, -0.6, 0, -0.3);
        break;
      case "sun-set":
        setBone(bones.rArm, 0, 0, -2.7 + Math.sin(t * 1.5) * 0.3);
        setBone(bones.rForeArm, -0.4, 0, -0.2);
        break;
      case "thanks":
        setBone(bones.rArm, 0, 0, -1.6);
        setBone(bones.rForeArm, -1.6, 0, -0.4 + Math.sin(t * 3) * 0.3);
        setBone(bones.head, 0.12, 0, 0);
        break;
      case "please":
        setBone(bones.rArm, 0, 0, -1.3);
        setBone(bones.rForeArm, -1.3, Math.sin(t * 4) * 0.4, -0.3);
        setBone(bones.head, 0.05, 0, 0);
        break;
      case "help":
        setBone(bones.rArm, 0, 0, -2.4);
        setBone(bones.lArm, 0, 0, 2.4);
        setBone(bones.rForeArm, -1.0, 0, -0.3);
        setBone(bones.lForeArm, -1.0, 0, 0.3);
        setBone(bones.head, -0.1, 0, 0);
        break;
      case "where":
        setBone(bones.rArm, 0, 0, -2.0);
        setBone(bones.rForeArm, -0.6, 0, -0.2);
        setBone(bones.head, 0, sway * 0.3, 0);
        break;
      case "drink":
        setBone(bones.rArm, 0, 0, -1.7);
        setBone(bones.rForeArm, -1.9, 0, -0.3);
        setBone(bones.head, -0.18, 0, 0);
        break;
      case "yes":
        setBone(bones.head, Math.sin(t * 5) * 0.25, 0, 0);
        setBone(bones.rArm, 0, 0, -0.6);
        break;
      case "no":
        setBone(bones.head, 0, Math.sin(t * 5) * 0.35, 0);
        setBone(bones.rArm, 0, 0, -1.5);
        setBone(bones.rForeArm, -1.0, Math.sin(t * 6) * 0.5, -0.2);
        break;
      case "idle":
      default:
        setBone(bones.head, 0, sway * 0.08, 0);
        break;
    }
  });

  return <primitive object={cloned} position={[0, -1.6, 0]} scale={1.4} />;
}

/* ---------- Fallback primitivo (caso GLB falhe) ---------- */

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
    if (!rightArm.current || !leftArm.current || !rightForeArm.current || !leftForeArm.current || !head.current) return;
    const wave = Math.sin(t * 6) * 0.6;
    const sway = Math.sin(t * 2) * 0.15;
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
      case "thanks":
        rightArm.current.rotation.z = -1.3;
        rightForeArm.current.rotation.x = -1.4;
        head.current.rotation.x = 0.15;
        break;
      case "help":
        rightArm.current.rotation.z = -1.6;
        leftArm.current.rotation.z = 1.6;
        rightForeArm.current.rotation.x = -1.2;
        leftForeArm.current.rotation.x = -1.2;
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
        head.current.rotation.y = Math.sin(t * 5) * 0.3;
        break;
      default:
        head.current.rotation.y = sway * 0.1;
    }
  });

  const skin = useMemo(() => new THREE.MeshStandardMaterial({ color: "#d8b39a", roughness: 0.7 }), []);
  const cloth = useMemo(() => new THREE.MeshStandardMaterial({ color: "#5C574F", roughness: 0.8 }), []);

  return (
    <group position={[0, -1, 0]}>
      <group ref={head} position={[0, 1.55, 0]}>
        <mesh material={skin}><sphereGeometry args={[0.22, 32, 32]} /></mesh>
        <mesh position={[-0.07, 0.03, 0.2]}><sphereGeometry args={[0.025, 16, 16]} /><meshStandardMaterial color="#292723" /></mesh>
        <mesh position={[0.07, 0.03, 0.2]}><sphereGeometry args={[0.025, 16, 16]} /><meshStandardMaterial color="#292723" /></mesh>
      </group>
      <mesh position={[0, 0.95, 0]} material={cloth}><boxGeometry args={[0.55, 0.7, 0.28]} /></mesh>
      <group ref={rightArm} position={[-0.32, 1.22, 0]}>
        <mesh position={[0, -0.22, 0]} material={cloth}><capsuleGeometry args={[0.07, 0.32, 8, 16]} /></mesh>
        <group ref={rightForeArm} position={[0, -0.46, 0]}>
          <mesh position={[0, -0.2, 0]} material={skin}><capsuleGeometry args={[0.06, 0.3, 8, 16]} /></mesh>
          <mesh position={[0, -0.4, 0]} material={skin}><sphereGeometry args={[0.08, 16, 16]} /></mesh>
        </group>
      </group>
      <group ref={leftArm} position={[0.32, 1.22, 0]}>
        <mesh position={[0, -0.22, 0]} material={cloth}><capsuleGeometry args={[0.07, 0.32, 8, 16]} /></mesh>
        <group ref={leftForeArm} position={[0, -0.46, 0]}>
          <mesh position={[0, -0.2, 0]} material={skin}><capsuleGeometry args={[0.06, 0.3, 8, 16]} /></mesh>
          <mesh position={[0, -0.4, 0]} material={skin}><sphereGeometry args={[0.08, 16, 16]} /></mesh>
        </group>
      </group>
      <mesh position={[0, 0.4, 0]} material={cloth}><boxGeometry args={[0.5, 0.3, 0.26]} /></mesh>
      <mesh position={[-0.13, 0.0, 0]} material={cloth}><capsuleGeometry args={[0.09, 0.4, 8, 16]} /></mesh>
      <mesh position={[0.13, 0.0, 0]} material={cloth}><capsuleGeometry args={[0.09, 0.4, 8, 16]} /></mesh>
    </group>
  );
}

/* ---------- Error boundary para o GLB ---------- */

class GLBBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn("GLB avatar failed, using primitive fallback:", error.message, info);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function Avatar3D(props: Props) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 0.2, 3.0], fov: 38 }}
      style={{ width: "100%", height: "100%" }}
      dpr={[1, 2]}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 4]} intensity={1.1} castShadow />
      <directionalLight position={[-3, 2, -2]} intensity={0.4} color="#C27A63" />
      <GLBBoundary fallback={<PrimitiveAvatar {...props} />}>
        <Suspense fallback={<PrimitiveAvatar {...props} />}>
          <GLBAvatar {...props} />
          <Environment preset="apartment" />
        </Suspense>
      </GLBBoundary>
      <OrbitControls
        target={[0, 0.1, 0]}
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI / 2.6}
        maxPolarAngle={Math.PI / 1.9}
      />
    </Canvas>
  );
}
