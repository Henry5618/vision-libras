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
  if (handsList.length === 0) return null;

  const hand = handsList[0];
  const fingers = fingersExtended(hand);
  const wrist = hand[WRIST];

  const hasPose = pose.length >= 25;
  const shoulderY = hasPose
    ? avg(pose[P_L_SHOULDER].y, pose[P_R_SHOULDER].y)
    : 0.45;
  const noseY = hasPose ? pose[P_NOSE].y : 0.3;

  // Altura relativa: -1 (alto) a +1 (baixo) em relação ao ombro
  const handHeight = wrist.y - shoulderY;

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
    // POR FAVOR: ambas as mãos abertas no peito
    if (bothOpen && handHeight > -0.05 && handHeight < 0.25) {
      return { id: "por-favor", confidence: 0.8 };
    }
  }

  // ===== UMA MÃO =====

  // OLÁ / ATÉ LOGO: palma aberta na altura/acima do ombro
  if (isOpenPalm(fingers) && handHeight < 0.05) {
    // Se a mão está bem próxima da boca, prioriza OBRIGADO
    if (handHeight > -0.15 && hasPose && wrist.y > noseY) {
      return { id: "obrigado", confidence: 0.78 };
    }
    return { id: "ola", confidence: 0.85 };
  }

  // ONDE FICA…: indicador apontando, mão na altura do peito ou acima
  if (isPointing(fingers) && handHeight < 0.2) {
    // Apontando para CIMA acima do ombro = NÃO
    if (handHeight < -0.1) {
      return { id: "nao", confidence: 0.75 };
    }
    return { id: "banheiro", confidence: 0.78 };
  }

  // QUERO ÁGUA: gesto de "C" — polegar e indicador fora, demais dentro
  if (
    fingers.thumb &&
    fingers.index &&
    !fingers.middle &&
    !fingers.ring &&
    !fingers.pinky &&
    handHeight < 0.15
  ) {
    return { id: "agua", confidence: 0.78 };
  }

  // SIM: punho fechado próximo do peito
  if (isFist(fingers) && handHeight > -0.2 && handHeight < 0.3) {
    return { id: "sim", confidence: 0.72 };
  }

  // BOM DIA: paz/V (2 dedos) na altura do rosto
  if (isPeace(fingers) && handHeight < -0.05) {
    return { id: "bom-dia", confidence: 0.7 };
  }

  return null;
}
