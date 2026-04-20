/**
 * Detector real de sinais usando @mediapipe/tasks-vision.
 * Roda HandLandmarker, FaceLandmarker e PoseLandmarker em paralelo
 * sobre o <video> da webcam e classifica sinais via heurísticas simples.
 */

import {
  FilesetResolver,
  HandLandmarker,
  FaceLandmarker,
  PoseLandmarker,
  type HandLandmarkerResult,
  type FaceLandmarkerResult,
  type PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";
import { SIGN_DICTIONARY, type SignEntry } from "./libras-data";
import { classifySign } from "./sign-classifier";

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
  /** Lista de mãos separadas (cada uma com 21 pontos) — útil para classificador */
  handsList?: Landmark[][];
  /** Pose bruta (33 pontos) — útil para classificador */
  poseRaw?: Landmark[];
}

export interface DetectorEvents {
  onFrame: (frame: DetectionFrame) => void;
  onSign: (sign: SignEntry, confidence: number) => void;
  onStatus: (status: string) => void;
}

const WASM_BASE =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm";

const MODELS = {
  hand: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task",
  face: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
  pose: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
};

export class SimulatedSignDetector {
  private events: DetectorEvents;
  private video: HTMLVideoElement | null = null;
  private rafId: number | null = null;
  private running = false;

  private hand: HandLandmarker | null = null;
  private face: FaceLandmarker | null = null;
  private pose: PoseLandmarkerResult extends never ? never : PoseLandmarker | null = null;

  private lastSignId: string | null = null;
  private lastSignAt = 0;
  private holdFrames = 0;
  private candidateId: string | null = null;

  constructor(events: DetectorEvents) {
    this.events = events;
  }

  async start(video?: HTMLVideoElement) {
    if (this.running) return;
    this.running = true;
    this.video = video ?? null;
    this.events.onStatus("Carregando modelos de visão...");

    try {
      const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
      const [hand, face, pose] = await Promise.all([
        HandLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODELS.hand, delegate: "GPU" },
          runningMode: "VIDEO",
          numHands: 2,
        }),
        FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODELS.face, delegate: "GPU" },
          runningMode: "VIDEO",
          numFaces: 1,
          outputFaceBlendshapes: false,
        }),
        PoseLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODELS.pose, delegate: "GPU" },
          runningMode: "VIDEO",
          numPoses: 1,
        }),
      ]);
      this.hand = hand;
      this.face = face;
      this.pose = pose;
      this.events.onStatus("Detectando mãos, rosto e corpo");
      this.loop();
    } catch (err) {
      console.error("MediaPipe init failed:", err);
      this.events.onStatus("Falha ao carregar modelos. Tente novamente.");
      this.running = false;
    }
  }

  stop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.hand?.close();
    this.face?.close();
    this.pose?.close();
    this.hand = null;
    this.face = null;
    this.pose = null;
    this.events.onStatus("Câmera desligada");
  }

  private loop = () => {
    if (!this.running) return;
    const v = this.video;
    if (!v || v.readyState < 2 || v.videoWidth === 0) {
      this.rafId = requestAnimationFrame(this.loop);
      return;
    }

    const ts = performance.now();
    let handsResult: HandLandmarkerResult | null = null;
    let faceResult: FaceLandmarkerResult | null = null;
    let poseResult: PoseLandmarkerResult | null = null;

    try {
      handsResult = this.hand?.detectForVideo(v, ts) ?? null;
      faceResult = this.face?.detectForVideo(v, ts) ?? null;
      poseResult = this.pose?.detectForVideo(v, ts) ?? null;
    } catch (err) {
      // Frame skip on transient errors
    }

    const handsList: Landmark[][] = (handsResult?.landmarks ?? []).map((hand) =>
      hand.map((p, i) => ({ id: i, x: p.x, y: p.y })),
    );
    const hands: Landmark[] = handsList.flatMap((h, hi) =>
      h.map((p) => ({ ...p, id: hi * 100 + p.id })),
    );

    const faceLandmarks = faceResult?.faceLandmarks?.[0] ?? [];
    // Subamostra rosto para overlay (não precisa dos 478 pontos)
    const face: Landmark[] = faceLandmarks
      .filter((_, i) => i % 12 === 0)
      .map((p, i) => ({ id: i, x: p.x, y: p.y }));

    const poseLandmarks = poseResult?.landmarks?.[0] ?? [];
    const poseRaw: Landmark[] = poseLandmarks.map((p, i) => ({
      id: i,
      x: p.x,
      y: p.y,
    }));
    // Subset de pose para overlay (ombros, cotovelos, pulsos, quadris)
    const KEY_POSE = [11, 13, 15, 12, 14, 16, 23, 24];
    const pose: Landmark[] = KEY_POSE.map((idx, i) => {
      const p = poseLandmarks[idx];
      return p ? { id: i, x: p.x, y: p.y } : { id: i, x: 0, y: 0 };
    });

    const handsDetected = handsList.length > 0;
    const faceDetected = faceLandmarks.length > 0;
    const poseDetected = poseLandmarks.length > 0;

    const confidence =
      (handsDetected ? 0.45 : 0) +
      (faceDetected ? 0.25 : 0) +
      (poseDetected ? 0.3 : 0);

    this.events.onFrame({
      hands,
      face,
      pose,
      handsDetected,
      faceDetected,
      poseDetected,
      confidence,
      handsList,
      poseRaw,
    });

    // ---- Reconhecimento ----
    const result = classifySign(handsList, poseRaw);
    if (result) {
      // Estabilização: precisa repetir N frames consecutivos
      if (this.candidateId === result.id) {
        this.holdFrames += 1;
      } else {
        this.candidateId = result.id;
        this.holdFrames = 1;
      }

      const now = Date.now();
      if (
        this.holdFrames >= 8 &&
        (this.lastSignId !== result.id || now - this.lastSignAt > 2500)
      ) {
        const sign = SIGN_DICTIONARY.find((s) => s.id === result.id);
        if (sign) {
          this.lastSignId = result.id;
          this.lastSignAt = now;
          this.events.onStatus(`Traduzindo: ${sign.phrase}`);
          this.events.onSign(sign, result.confidence);
        }
      }
    } else {
      this.candidateId = null;
      this.holdFrames = 0;
    }

    this.rafId = requestAnimationFrame(this.loop);
  };
}
