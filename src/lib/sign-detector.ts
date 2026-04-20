/**
 * Detector simulado de sinais (placeholder para MediaPipe + modelo real).
 * Emite eventos periódicos com:
 *  - status de detecção (mãos, rosto, corpo)
 *  - landmarks fictícios para visualização
 *  - sinal reconhecido (escolhido aleatoriamente do dicionário a cada N segundos)
 */

import { SIGN_DICTIONARY, type SignEntry } from "./libras-data";

export interface Landmark {
  x: number;
  y: number;
  id: number;
}

export interface DetectionFrame {
  hands: Landmark[];
  face: Landmark[];
  pose: Landmark[];
  handsDetected: boolean;
  faceDetected: boolean;
  poseDetected: boolean;
  confidence: number;
}

export interface DetectorEvents {
  onFrame: (frame: DetectionFrame) => void;
  onSign: (sign: SignEntry, confidence: number) => void;
  onStatus: (status: string) => void;
}

export class SimulatedSignDetector {
  private frameTimer: number | null = null;
  private signTimer: number | null = null;
  private running = false;
  private events: DetectorEvents;

  constructor(events: DetectorEvents) {
    this.events = events;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.events.onStatus("Inicializando detecção...");

    // ~20fps de landmarks simulados
    this.frameTimer = window.setInterval(() => {
      this.events.onFrame(this.generateFrame());
    }, 50);

    // Cada 3.5s "reconhece" um sinal
    this.signTimer = window.setInterval(() => {
      const sign =
        SIGN_DICTIONARY[Math.floor(Math.random() * SIGN_DICTIONARY.length)];
      const confidence = 0.78 + Math.random() * 0.2;
      this.events.onStatus(`Traduzindo: ${sign.phrase}`);
      this.events.onSign(sign, confidence);
    }, 3500);

    setTimeout(() => {
      if (this.running) this.events.onStatus("Detectando mãos, rosto e corpo");
    }, 800);
  }

  stop() {
    this.running = false;
    if (this.frameTimer) window.clearInterval(this.frameTimer);
    if (this.signTimer) window.clearInterval(this.signTimer);
    this.frameTimer = null;
    this.signTimer = null;
    this.events.onStatus("Câmera desligada");
  }

  private generateFrame(): DetectionFrame {
    const t = Date.now() / 1000;
    const hands: Landmark[] = Array.from({ length: 21 }, (_, i) => ({
      id: i,
      x: 0.5 + Math.cos(t + i * 0.3) * 0.18 + (i % 5) * 0.02,
      y: 0.55 + Math.sin(t + i * 0.25) * 0.12 + (i % 4) * 0.03,
    }));
    const face: Landmark[] = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: 0.5 + Math.cos((i / 12) * Math.PI * 2) * 0.08,
      y: 0.3 + Math.sin((i / 12) * Math.PI * 2) * 0.1,
    }));
    const pose: Landmark[] = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      x: 0.3 + (i / 8) * 0.4,
      y: 0.45 + Math.sin(t + i) * 0.05,
    }));
    return {
      hands,
      face,
      pose,
      handsDetected: true,
      faceDetected: true,
      poseDetected: true,
      confidence: 0.85 + Math.sin(t) * 0.1,
    };
  }
}
