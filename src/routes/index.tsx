import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "@/components/libras/Header";
import { LibrasParaTexto } from "@/components/libras/LibrasParaTexto";
import { TextoParaLibras } from "@/components/libras/TextoParaLibras";
import { InfoSections } from "@/components/libras/InfoSections";
import { Toaster } from "@/components/ui/sonner";
import { Camera, MessagesSquare } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LibrasVision — Tradutor bidirecional Libras ↔ Português" },
      {
        name: "description",
        content:
          "LibrasVision: tecnologia acessível que traduz Libras para texto em tempo real e converte frases em português para sinalização com avatar 3D.",
      },
      { property: "og:title", content: "LibrasVision — Tradutor Libras ↔ Português" },
      {
        property: "og:description",
        content: "Comunicação acessível com IA, visão computacional e avatar 3D em Libras.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Tab = "libras-texto" | "texto-libras";

function Index() {
  const [tab, setTab] = useState<Tab>("libras-texto");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Toaster richColors position="top-right" />
      <Header />

      <section className="max-w-[1200px] mx-auto w-full px-4 mt-2">
        <div className="flex justify-center">
          <div
            role="tablist"
            aria-label="Modo de tradução"
            className="bg-stone-soft p-1.5 rounded-full flex gap-1 border border-border shadow-[var(--shadow-soft)]"
          >
            <button
              role="tab"
              aria-selected={tab === "libras-texto"}
              onClick={() => setTab("libras-texto")}
              className={`px-5 sm:px-8 py-3 rounded-full font-medium text-sm sm:text-base transition-all flex items-center gap-2 ${
                tab === "libras-texto"
                  ? "bg-card text-foreground shadow-[var(--shadow-soft)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Camera className="size-4" />
              Libras para Texto
            </button>
            <button
              role="tab"
              aria-selected={tab === "texto-libras"}
              onClick={() => setTab("texto-libras")}
              className={`px-5 sm:px-8 py-3 rounded-full font-medium text-sm sm:text-base transition-all flex items-center gap-2 ${
                tab === "texto-libras"
                  ? "bg-card text-foreground shadow-[var(--shadow-soft)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MessagesSquare className="size-4" />
              Texto para Libras
            </button>
          </div>
        </div>
      </section>

      <main className="max-w-[1200px] mx-auto w-full px-4 mt-8 flex-1">
        <div key={tab} className="animate-in fade-in duration-300">
          {tab === "libras-texto" ? <LibrasParaTexto /> : <TextoParaLibras />}
        </div>
      </main>

      <InfoSections />

      <footer className="border-t border-border mt-8 py-6">
        <div className="max-w-[1200px] mx-auto w-full px-4 flex flex-col sm:flex-row justify-between gap-2 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} LibrasVision · Tecnologia acessível</p>
          <p>Feito com foco em inclusão e comunicação.</p>
        </div>
      </footer>
    </div>
  );
}
