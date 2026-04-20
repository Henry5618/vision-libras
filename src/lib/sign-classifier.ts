/**
 * Heurísticas simples para classificar sinais do MVP a partir de
 * landmarks reais do MediaPipe (mãos + pose).
 *
 * Coordenadas estão normalizadas (0..1, origem no canto sup. esq.).
 * Lembrando: y MENOR = mais ALTO no quadro.
 */

import type { Landmark } from "./sign-detector";

export interface ClassifyResult {
  id: string;
  confidence: number;
}

// Índices MediaPipe Hand
const WRIST = 0;
const THUMB_TIP = 4;
const INDEX_TIP = 8;
const INDEX_MCP = 5;
const MIDDLE_TIP = 12;
const MIDDLE_MCP = 9;
const RING_TIP = 16;
const RING_MCP = 13;
const PINKY_TIP = 20;
const PINKY_MCP = 17;

// Índices MediaPipe Pose
const P_NOSE = 0;
const P_L_SHOULDER = 11;
const P_R_SHOULDER = 12;
const P_L_ELBOW = 13;
const P_R_ELBOW = 14;
const P_L_WRIST = 15;
const P_R_WRIST = 16;
const P_MOUTH_L = 9;
const P_MOUTH_R = 10;

interface FingerState {
  index: boolean;
  middle: boolean;
  ring: boolean;
  pinky: boolean;
  thumb: boolean;
}

function fingersExtended(hand: Landmark[]): FingerState {
  // Dedo "estendido" se a ponta está mais distante do pulso que o MCP
  const wrist = hand[WRIST];
  const dist = (a: Landmark, b: Landmark) =>
    Math.hypot(a.x - b.x, a.y - b.y);
  return {
    index: dist(hand[INDEX_TIP], wrist) > dist(hand[INDEX_MCP], wrist) * 1.4,
    middle: dist(hand[MIDDLE_TIP], wrist) > dist(hand[MIDDLE_MCP], wrist) * 1.4,
    ring: dist(hand[RING_TIP], wrist) > dist(hand[RING_MCP], wrist) * 1.4,
    pinky: dist(hand[PINKY_TIP], wrist) > dist(hand[PINKY_MCP], wrist) * 1.4,
    thumb:
      dist(hand[THUMB_TIP], wrist) >
      dist(hand[INDEX_MCP], wrist) * 0.9,
  };
}

function isOpenPalm(s: FingerState) {
  return s.index && s.middle && s.ring && s.pinky;
}

function isFist(s: FingerState) {
  return !s.index && !s.middle && !s.ring && !s.pinky;
}

function isPointing(s: FingerState) {
  return s.index && !s.middle && !s.ring && !s.pinky;
}

function avg(...nums: number[]) {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function classifySign(
  handsList: Landmark[][],
  pose: Landmark[],
): ClassifyResult | null {
  if (handsList.length === 0) return null;

  const hand = handsList[0];
  const fingers = fingersExtended(hand);
  const wrist = hand[WRIST];

  const hasPose = pose.length >= 25;
  const shoulderY = hasPose
    ? avg(pose[P_L_SHOULDER].y, pose[P_R_SHOULDER].y)
    : 0.4;
  const noseY = hasPose ? pose[P_NOSE].y : 0.25;
  const mouthY = hasPose ? avg(pose[P_MOUTH_L].y, pose[P_MOUTH_R].y) : 0.3;
  const chestY = shoulderY + 0.08;

  // ===== Sinais com DUAS mãos =====
  if (handsList.length === 2) {
    const h2 = handsList[1];
    const f2 = fingersExtended(h2);
    const bothOpen = isOpenPalm(fingers) && isOpenPalm(f2);
    const bothFist = isFist(fingers) && isFist(f2);
    const bothAboveHead = wrist.y < noseY && h2[WRIST].y < noseY;

    // PRECISO DE AJUDA: ambas as mãos acima da cabeça (abertas ou fechadas)
    if (bothAboveHead && (bothOpen || bothFist)) {
      return { id: "ajuda", confidence: 0.85 };
    }

    // POR FAVOR: ambas as mãos abertas no peito
    if (bothOpen && wrist.y > shoulderY && wrist.y < chestY + 0.15) {
      return { id: "por-favor", confidence: 0.78 };
    }
  }

  // ===== Sinais com UMA mão =====

  // OLÁ / ATÉ LOGO: palma aberta acima da cabeça
  if (isOpenPalm(fingers) && wrist.y < noseY) {
    return { id: "ola", confidence: 0.82 };
  }

  // QUERO ÁGUA: mão em forma de "C" (polegar+indicador estendidos, outros não)
  // próxima da boca
  if (
    fingers.thumb &&
    fingers.index &&
    !fingers.middle &&
    !fingers.ring &&
    !fingers.pinky &&
    wrist.y < mouthY + 0.1 &&
    wrist.y > noseY - 0.05
  ) {
    return { id: "agua", confidence: 0.78 };
  }

  // OBRIGADO: palma aberta tocando o queixo (mão aberta perto da boca)
  if (isOpenPalm(fingers) && Math.abs(wrist.y - mouthY) < 0.1) {
    return { id: "obrigado", confidence: 0.78 };
  }

  // ONDE FICA…: indicador apontando, mão na altura do ombro/peito
  if (isPointing(fingers) && wrist.y > shoulderY - 0.05 && wrist.y < chestY + 0.1) {
    return { id: "banheiro", confidence: 0.75 };
  }

  // SIM: mão fechada (punho) na altura do peito
  if (isFist(fingers) && wrist.y > shoulderY && wrist.y < chestY + 0.15) {
    return { id: "sim", confidence: 0.7 };
  }

  // NÃO: indicador apontando para cima na altura da cabeça
  if (isPointing(fingers) && wrist.y < shoulderY) {
    return { id: "nao", confidence: 0.7 };
  }

  return null;
}
