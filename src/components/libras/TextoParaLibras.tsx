import { useState } from "react";
import { Send, Eraser, Sparkles } from "lucide-react";
import { findSignForText, SIGN_DICTIONARY, type SignEntry, type AvatarPose } from "@/lib/libras-data";
import { Avatar3D } from "./Avatar3D";
import { toast } from "sonner";

const SUGGESTIONS = ["Olá", "Bom dia", "Obrigado", "Por favor", "Quero água", "Onde fica o banheiro?"];

export function TextoParaLibras() {
  const [text, setText] = useState("");
  const [sign, setSign] = useState<SignEntry | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentPose, setCurrentPose] = useState<AvatarPose>("idle");
  const [stepIdx, setStepIdx] = useState(0);

  const translate = (input?: string) => {
    const value = (input ?? text).trim();
    if (!value) return;
    if (input !== undefined) setText(input);
    const found = findSignForText(value);
    if (!found) {
      setSign(null);
      setPlaying(false);
      toast.warning("Frase ainda não disponível no conjunto inicial de sinais.");
      return;
    }
    setSign(found);
    setStepIdx(0);
    setCurrentPose(found.sequence[0] ?? "idle");
    setPlaying(true);
  };

  const clear = () => {
    setText("");
    setSign(null);
    setPlaying(false);
    setCurrentPose("idle");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Avatar */}
      <div className="lg:col-span-7">
        <div className="relative bg-gradient-to-br from-stone-soft to-card rounded-[2rem] overflow-hidden border border-border shadow-[var(--shadow-soft)] aspect-[4/5] lg:aspect-auto lg:h-[560px]">
          <div className="absolute inset-0">
            <Avatar3D
              sequence={sign?.sequence ?? ["idle"]}
              playing={playing}
              onStepChange={(p, i) => {
                setCurrentPose(p);
                setStepIdx(i);
              }}
              onComplete={() => setPlaying(false)}
            />
          </div>

          <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-3 z-10 pointer-events-none">
            <span className="bg-card/90 backdrop-blur-md text-foreground text-xs px-3 py-1.5 rounded-full font-medium flex items-center gap-2 shadow-[var(--shadow-soft)] border border-border">
              <span className={`size-2.5 rounded-full ${playing ? "bg-clay" : "bg-muted-foreground/40"}`}>
                {playing && <span className="absolute inset-0 rounded-full bg-clay animate-ping opacity-50" />}
              </span>
              {playing ? "Sinalizando..." : "Avatar em repouso"}
            </span>
            {sign && (
              <span className="bg-card/90 backdrop-blur-md text-foreground text-xs px-3 py-1.5 rounded-full font-medium border border-border">
                Pose {stepIdx + 1}/{sign.sequence.length} · {currentPose}
              </span>
            )}
          </div>

          <div className="absolute bottom-4 left-4 right-4 z-10 pointer-events-none">
            <div className="bg-card/90 backdrop-blur-md border border-border rounded-2xl px-4 py-3 shadow-[var(--shadow-soft)]">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Sinal atual</p>
              <p className="text-foreground font-medium mt-0.5">
                {sign?.phrase ?? "Digite uma frase para começar"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="lg:col-span-5 flex flex-col gap-5">
        <div className="bg-card rounded-[2rem] p-7 border border-border shadow-[var(--shadow-soft)]">
          <h2 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase mb-4">
            Frase em português
          </h2>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                translate();
              }
            }}
            placeholder="Ex: Bom dia, preciso de ajuda."
            rows={3}
            className="w-full resize-none rounded-2xl bg-stone-soft border border-border px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-clay/40 transition-all"
          />
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => translate()}
              className="flex-1 bg-clay text-clay-foreground py-3.5 rounded-2xl font-medium hover:opacity-90 transition-all shadow-[var(--shadow-warm)] flex items-center justify-center gap-2"
            >
              <Send className="size-4" />
              Traduzir
            </button>
            <button
              onClick={clear}
              className="bg-card border border-border text-foreground px-5 py-3.5 rounded-2xl font-medium hover:bg-accent transition-colors flex items-center justify-center gap-2"
            >
              <Eraser className="size-4" />
              Limpar
            </button>
          </div>
        </div>

        <div className="bg-card rounded-[2rem] p-6 border border-border shadow-[var(--shadow-soft)]">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="size-4 text-clay" />
            <h3 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
              Sugestões rápidas
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => translate(s)}
                className="px-4 py-2 bg-stone-soft border border-border rounded-full text-sm text-foreground font-medium hover:border-clay/50 hover:bg-card transition-all"
              >
                {s}
              </button>
            ))}
          </div>
          <details className="mt-5 group">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
              Ver todos os sinais disponíveis ({SIGN_DICTIONARY.length})
            </summary>
            <ul className="mt-3 space-y-1.5 text-sm text-foreground">
              {SIGN_DICTIONARY.map((s) => (
                <li key={s.id} className="flex items-start gap-2">
                  <span className="size-1.5 rounded-full bg-clay mt-2 shrink-0" />
                  <span>
                    <span className="font-medium">{s.phrase}</span>
                    <span className="text-muted-foreground"> — {s.description}</span>
                  </span>
                </li>
              ))}
            </ul>
          </details>
        </div>
      </div>
    </div>
  );
}
