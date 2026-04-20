import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Trash2, Copy, Check } from "lucide-react";
import { SimulatedSignDetector, type DetectionFrame } from "@/lib/sign-detector";
import type { SignEntry } from "@/lib/libras-data";
import { LandmarkOverlay } from "./LandmarkOverlay";
import { toast } from "sonner";

interface HistItem {
  phrase: string;
  at: string;
  confidence: number;
}

export function LibrasParaTexto() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const detectorRef = useRef<SimulatedSignDetector | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [active, setActive] = useState(false);
  const [status, setStatus] = useState("Câmera desligada");
  const [frame, setFrame] = useState<DetectionFrame | null>(null);
  const [current, setCurrent] = useState<{ sign: SignEntry; confidence: number } | null>(null);
  const [history, setHistory] = useState<HistItem[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    return () => {
      stopAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopAll = () => {
    detectorRef.current?.stop();
    detectorRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const toggle = async () => {
    if (active) {
      stopAll();
      setActive(false);
      setFrame(null);
      setStatus("Câmera desligada");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 1280, height: 720 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      const det = new SimulatedSignDetector({
        onFrame: setFrame,
        onStatus: setStatus,
        onSign: (sign, confidence) => {
          setCurrent({ sign, confidence });
          setHistory((h) =>
            [
              {
                phrase: sign.phrase,
                at: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
                confidence,
              },
              ...h,
            ].slice(0, 8),
          );
        },
      });
      detectorRef.current = det;
      det.start();
      setActive(true);
    } catch (err) {
      toast.error("Não foi possível acessar a câmera. Verifique as permissões.");
      console.error(err);
    }
  };

  const copyText = async () => {
    if (!current) return;
    await navigator.clipboard.writeText(current.sign.phrase);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Camera */}
      <div className="lg:col-span-8 flex flex-col gap-5">
        <div className="relative bg-stone-soft rounded-[2rem] overflow-hidden aspect-[16/10] border border-border shadow-[var(--shadow-soft)]">
          <video
            ref={videoRef}
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover bg-muted"
          />
          {!active && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 bg-stone-soft/80 backdrop-blur-sm">
              <div className="size-16 rounded-full bg-card border border-border flex items-center justify-center mb-4 shadow-[var(--shadow-soft)]">
                <Camera className="size-7 text-clay" />
              </div>
              <p className="text-foreground font-medium">A câmera está desligada</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Ative a câmera para iniciar a detecção de mãos, rosto e corpo.
              </p>
            </div>
          )}
          <LandmarkOverlay frame={active ? frame : null} />

          <div className="absolute top-4 left-4 flex gap-2 z-10">
            <span className="bg-card/90 backdrop-blur-md text-foreground text-xs px-3 py-1.5 rounded-full font-medium flex items-center gap-2 shadow-[var(--shadow-soft)] border border-border">
              <span className={`size-2.5 rounded-full ${active ? "bg-sage relative" : "bg-muted-foreground/50"}`}>
                {active && <span className="absolute inset-0 rounded-full bg-sage animate-ping opacity-50" />}
              </span>
              {active ? "Câmera ativa" : "Câmera inativa"}
            </span>
          </div>

          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 z-10">
            <button
              onClick={toggle}
              className={`flex items-center gap-2 px-5 py-3 rounded-full font-medium shadow-[var(--shadow-warm)] transition-all ${
                active
                  ? "bg-card text-foreground border border-border hover:bg-accent"
                  : "bg-clay text-clay-foreground hover:opacity-90"
              }`}
            >
              {active ? <CameraOff className="size-4" /> : <Camera className="size-4" />}
              {active ? "Desativar câmera" : "Ativar câmera"}
            </button>
            {active && (
              <span className="text-xs font-medium text-foreground bg-card/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-border">
                Confiança: {Math.round((frame?.confidence ?? 0) * 100)}%
              </span>
            )}
          </div>
        </div>

        {/* Indicators */}
        <div className="bg-card rounded-[1.5rem] p-5 border border-border flex items-center justify-between gap-6 shadow-[var(--shadow-soft)]">
          <div>
            <h3 className="text-foreground font-medium">Detecção em tempo real</h3>
            <p className="text-muted-foreground text-sm">{status}</p>
          </div>
          <div className="flex gap-2">
            {[
              { label: "Mãos", on: !!frame?.handsDetected },
              { label: "Rosto", on: !!frame?.faceDetected },
              { label: "Corpo", on: !!frame?.poseDetected },
            ].map((d) => (
              <div
                key={d.label}
                className="px-3 py-2 rounded-2xl bg-stone-soft border border-border flex flex-col items-center min-w-[68px]"
              >
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                  {d.label}
                </span>
                <span className={`mt-1 size-2 rounded-full ${d.on ? "bg-sage" : "bg-muted-foreground/30"}`} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Output */}
      <div className="lg:col-span-4 flex flex-col gap-5">
        <div className="bg-card rounded-[2rem] p-7 border border-border shadow-[var(--shadow-soft)] flex flex-col min-h-[280px] relative overflow-hidden">
          <div className="absolute -top-16 -right-16 size-48 bg-stone-soft rounded-full blur-3xl opacity-70 pointer-events-none" />
          <div className="flex justify-between items-center mb-6 relative z-10">
            <h2 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
              Tradução corrente
            </h2>
            {current && (
              <button
                onClick={copyText}
                className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium flex items-center gap-1.5"
              >
                {copied ? <Check className="size-4 text-sage" /> : <Copy className="size-4" />}
                {copied ? "Copiado" : "Copiar"}
              </button>
            )}
          </div>
          <div className="flex-1 flex flex-col justify-center relative z-10">
            {current ? (
              <>
                <p className="text-foreground text-3xl font-medium leading-tight">{current.sign.phrase}</p>
                <p className="text-muted-foreground text-sm mt-3">{current.sign.description}</p>
                <div className="mt-4 flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-stone-soft overflow-hidden">
                    <div
                      className="h-full bg-clay transition-all"
                      style={{ width: `${Math.round(current.confidence * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground tabular-nums">
                    {Math.round(current.confidence * 100)}%
                  </span>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-base">
                Ative a câmera e faça um sinal. A tradução aparecerá aqui em tempo real.
              </p>
            )}
          </div>
        </div>

        <div className="bg-card rounded-[2rem] p-6 border border-border shadow-[var(--shadow-soft)] flex flex-col min-h-[220px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
              Histórico
            </h3>
            <button
              onClick={() => setHistory([])}
              disabled={!history.length}
              className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium flex items-center gap-1.5 disabled:opacity-40"
            >
              <Trash2 className="size-4" />
              Limpar
            </button>
          </div>
          <div className="flex-1 flex flex-col gap-2">
            {history.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma tradução ainda.</p>
            )}
            {history.map((h, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-stone-soft border border-border"
              >
                <span className="text-foreground text-sm font-medium">{h.phrase}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{h.at}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
