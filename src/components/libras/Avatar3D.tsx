import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { AvatarPose } from "@/lib/libras-data";

interface Props {
  sequence: AvatarPose[];
  playing: boolean;
  onStepChange?: (pose: AvatarPose, idx: number) => void;
  onComplete?: () => void;
}

// Avatar Ready Player Me público (humanoide com bones Mixamo-style)
const AVATAR_URL =
  "https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb?morphTargets=ARKit&textureAtlas=1024";

useGLTF.preload(AVATAR_URL);

const STEP_DURATION = 1.1;

/** Helper: aplica rotação Euler em um bone se ele existir. */
function setBone(
  bone: THREE.Object3D | undefined,
  x: number,
  y: number,
  z: number,
) {
  if (!bone) return;
  bone.rotation.set(x, y, z);
}

interface AvatarModelProps extends Props {}

function AvatarModel({ sequence, playing, onStepChange, onComplete }: AvatarModelProps) {
  const { scene } = useGLTF(AVATAR_URL);
  const cloned = useMemo(() => scene.clone(true), [scene]);

  const bones = useMemo(() => {
    const b: Record<string, THREE.Object3D | undefined> = {};
    cloned.traverse((obj) => {
      if ((obj as THREE.Bone).isBone) {
        b[obj.name] = obj;
      }
    });
    return {
      head: b["Head"],
      neck: b["Neck"],
      spine: b["Spine"] ?? b["Spine1"],
      lShoulder: b["LeftShoulder"],
      rShoulder: b["RightShoulder"],
      lArm: b["LeftArm"],
      rArm: b["RightArm"],
      lForeArm: b["LeftForeArm"],
      rForeArm: b["RightForeArm"],
      lHand: b["LeftHand"],
      rHand: b["RightHand"],
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

    // Reset baseline (T-pose ajustada → braços para baixo)
    setBone(bones.lArm, 0, 0, 1.25);
    setBone(bones.rArm, 0, 0, -1.25);
    setBone(bones.lForeArm, 0, 0, 0);
    setBone(bones.rForeArm, 0, 0, 0);
    setBone(bones.head, 0, 0, 0);
    setBone(bones.neck, 0, 0, 0);
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
        // Mão na boca → para frente
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

  return (
    <primitive
      object={cloned}
      position={[0, -1.45, 0]}
      scale={1.05}
      castShadow
      receiveShadow
    />
  );
}

function FallbackPrimitive() {
  return (
    <mesh position={[0, 0, 0]}>
      <capsuleGeometry args={[0.3, 0.8, 8, 16]} />
      <meshStandardMaterial color="#d8b39a" />
    </mesh>
  );
}

export function Avatar3D(props: Props) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 0.2, 2.6], fov: 35 }}
      style={{ width: "100%", height: "100%" }}
      dpr={[1, 2]}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 4]} intensity={1.1} castShadow />
      <directionalLight position={[-3, 2, -2]} intensity={0.4} color="#C27A63" />
      <Suspense fallback={<FallbackPrimitive />}>
        <AvatarModel {...props} />
        <Environment preset="apartment" />
      </Suspense>
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
