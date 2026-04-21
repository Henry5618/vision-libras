/**
 * Classificador heurístico de sinais de Libras a partir de landmarks
 * MediaPipe (Hands + Pose). Coordenadas normalizadas (0..1).
 * Lembrando: y MENOR = mais ALTO no quadro.
 *
 * Estratégia: começar por gestos discrimináveis SÓ pelas mãos
 * (mais robusto à câmera/enquadramento) e usar a pose só quando
 * disponível para refinar.
 */

import type { Landmark } from "./sign-detector";

export interface ClassifyResult {
  id: string;
  confidence: number;
}

/**
 * Buffer global de pulsos para detectar movimento (aceno).
 * Guarda os últimos N x's do pulso da mão dominante.
 */
const WRIST_HISTORY: number[] = [];
const WRIST_HISTORY_MAX = 20;

function pushWristX(x: number) {
  WRIST_HISTORY.push(x);
  if (WRIST_HISTORY.length > WRIST_HISTORY_MAX) WRIST_HISTORY.shift();
}

/** Amplitude horizontal do pulso (0..1). Acima de ~0.06 = movimento lateral claro. */
function wristLateralRange(): number {
  if (WRIST_HISTORY.length < 6) return 0;
  let min = Infinity;
  let max = -Infinity;
  for (const x of WRIST_HISTORY) {
    if (x < min) min = x;
    if (x > max) max = x;
  }
  return max - min;
}

// Índices MediaPipe Hand (21 pontos)
const WRIST = 0;
const THUMB_TIP = 4;
const INDEX_TIP = 8;
const INDEX_PIP = 6;
const INDEX_MCP = 5;
const MIDDLE_TIP = 12;
const MIDDLE_PIP = 10;
const MIDDLE_MCP = 9;
const RING_TIP = 16;
const RING_PIP = 14;
const PINKY_TIP = 20;
const PINKY_PIP = 18;
const PINKY_MCP = 17;

// Pose
const P_NOSE = 0;
const P_L_SHOULDER = 11;
const P_R_SHOULDER = 12;

interface FingerState {
  index: boolean;
  middle: boolean;
  ring: boolean;
  pinky: boolean;
  thumb: boolean;
  extendedCount: number;
}

/** Dedo "estendido" = ponta acima (y menor) do PIP. Mais robusto que distância. */
function fingersExtended(hand: Landmark[]): FingerState {
  const index = hand[INDEX_TIP].y < hand[INDEX_PIP].y - 0.01;
  const middle = hand[MIDDLE_TIP].y < hand[MIDDLE_PIP].y - 0.01;
  const ring = hand[RING_TIP].y < hand[RING_PIP].y - 0.01;
  const pinky = hand[PINKY_TIP].y < hand[PINKY_PIP].y - 0.01;
  // Polegar: usa eixo X (depende de ser mão esquerda/direita), aproximação simples
  const thumb =
    Math.abs(hand[THUMB_TIP].x - hand[INDEX_MCP].x) >
    Math.abs(hand[INDEX_MCP].x - hand[PINKY_MCP].x) * 0.4;
  const extendedCount = [index, middle, ring, pinky].filter(Boolean).length;
  return { index, middle, ring, pinky, thumb, extendedCount };
}

const isOpenPalm = (s: FingerState) => s.extendedCount >= 3;
const isFist = (s: FingerState) => s.extendedCount === 0;
const isPointing = (s: FingerState) => s.index && !s.middle && !s.ring && !s.pinky;
const isPeace = (s: FingerState) =>
  s.index && s.middle && !s.ring && !s.pinky;

function avg(...nums: number[]) {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function classifySign(
  handsList: Landmark[][],
  pose: Landmark[],
): ClassifyResult | null {
  if (handsList.length === 0) {
    WRIST_HISTORY.length = 0;
    return null;
  }

  const hand = handsList[0];
  const fingers = fingersExtended(hand);
  const wrist = hand[WRIST];
  pushWristX(wrist.x);
  const lateral = wristLateralRange();

  const hasPose = pose.length >= 25;
  const shoulderY = hasPose
    ? avg(pose[P_L_SHOULDER].y, pose[P_R_SHOULDER].y)
    : 0.45;
  const noseY = hasPose ? pose[P_NOSE].y : 0.3;

  const handHeight = wrist.y - shoulderY;
  const handAboveShoulder = handHeight < 0.1; // mão acima/perto da linha do ombro
  const handNearMouth = hasPose && wrist.y > noseY && wrist.y < noseY + 0.25;

  // ===== DUAS MÃOS =====
  if (handsList.length === 2) {
    const h2 = handsList[1];
    const f2 = fingersExtended(h2);
    const wrist2 = h2[WRIST];
    const bothOpen = isOpenPalm(fingers) && isOpenPalm(f2);
    const bothFist = isFist(fingers) && isFist(f2);
    const bothHigh = wrist.y < noseY + 0.05 && wrist2.y < noseY + 0.05;

    // PRECISO DE AJUDA: ambas as mãos próximo/acima da cabeça
    if (bothHigh && (bothOpen || bothFist)) {
      return { id: "ajuda", confidence: 0.9 };
    }
    // POR FAVOR: ambas as mãos abertas, na altura do peito, próximas entre si
    const handsClose = Math.abs(wrist.x - wrist2.x) < 0.25;
    if (bothOpen && handHeight > 0.0 && handHeight < 0.3 && handsClose) {
      return { id: "por-favor", confidence: 0.8 };
    }
  }

  // ===== UMA MÃO =====

  // OBRIGADO: mão aberta tocando/saindo do queixo (perto da boca, sem aceno lateral)
  if (isOpenPalm(fingers) && handNearMouth && lateral < 0.04) {
    return { id: "obrigado", confidence: 0.82 };
  }

  // OLÁ / ATÉ LOGO: palma aberta acima do ombro COM aceno lateral
  if (isOpenPalm(fingers) && handAboveShoulder && lateral > 0.05) {
    return { id: "ola", confidence: 0.9 };
  }

  // Fallback: mão aberta bem alta (acima do nariz) sem movimento ainda → ainda assim Olá
  if (isOpenPalm(fingers) && hasPose && wrist.y < noseY) {
    return { id: "ola", confidence: 0.75 };
  }

  // ONDE FICA…: indicador apontando, mão na altura do peito ou acima
  if (isPointing(fingers) && handHeight < 0.25) {
    // Apontando para CIMA acima do ombro = NÃO
    if (handHeight < -0.05 && lateral > 0.04) {
      return { id: "nao", confidence: 0.75 };
    }
    return { id: "banheiro", confidence: 0.78 };
  }

  // QUERO ÁGUA: gesto de "C" perto da boca
  if (
    fingers.thumb &&
    fingers.index &&
    !fingers.middle &&
    !fingers.ring &&
    !fingers.pinky &&
    handNearMouth
  ) {
    return { id: "agua", confidence: 0.78 };
  }

  // SIM: punho fechado próximo do peito, balançando verticalmente
  if (isFist(fingers) && handHeight > -0.1 && handHeight < 0.3) {
    return { id: "sim", confidence: 0.72 };
  }

  // BOM DIA: paz/V (2 dedos) na altura do rosto
  if (isPeace(fingers) && handHeight < 0.0) {
    return { id: "bom-dia", confidence: 0.7 };
  }

  return null;
}
