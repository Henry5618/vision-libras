import type { DetectionFrame } from "@/lib/sign-detector";

interface Props {
  frame: DetectionFrame | null;
}

export function LandmarkOverlay({ frame }: Props) {
  if (!frame) return null;
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 1 1"
      preserveAspectRatio="none"
      aria-hidden
    >
      {/* Pose connections */}
      {frame.pose.slice(0, -1).map((p, i) => {
        const n = frame.pose[i + 1];
        return (
          <line
            key={`pl-${i}`}
            x1={p.x}
            y1={p.y}
            x2={n.x}
            y2={n.y}
            stroke="oklch(0.72 0.06 145)"
            strokeWidth={0.004}
            strokeLinecap="round"
          />
        );
      })}
      {/* Hands */}
      {frame.hands.map((p) => (
        <circle key={`h-${p.id}`} cx={p.x} cy={p.y} r={0.008} fill="oklch(0.68 0.12 38)" />
      ))}
      {/* Face */}
      {frame.face.map((p) => (
        <circle key={`f-${p.id}`} cx={p.x} cy={p.y} r={0.005} fill="oklch(0.98 0.005 80)" opacity={0.9} />
      ))}
      {/* Pose joints */}
      {frame.pose.map((p) => (
        <circle key={`p-${p.id}`} cx={p.x} cy={p.y} r={0.009} fill="oklch(0.72 0.06 145)" />
      ))}
    </svg>
  );
}
