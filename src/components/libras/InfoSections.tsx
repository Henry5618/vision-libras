import { Eye, Hand, Cpu, Heart } from "lucide-react";

export function InfoSections() {
  const items = [
    {
      icon: Eye,
      title: "Captura visual",
      text: "A câmera identifica mãos, rosto e postura corporal em tempo real, com pontos de referência (landmarks).",
    },
    {
      icon: Cpu,
      title: "Interpretação",
      text: "Um modelo de visão computacional classifica os sinais e converte para frases em português.",
    },
    {
      icon: Hand,
      title: "Avatar 3D",
      text: "Para o caminho inverso, um avatar humanoide executa a sinalização correspondente à frase digitada.",
    },
  ];
  return (
    <section className="max-w-[1200px] mx-auto w-full px-4 py-12 grid gap-8">
      <div>
        <h2 className="text-2xl font-semibold text-foreground tracking-tight">Como funciona</h2>
        <p className="text-muted-foreground mt-1 max-w-2xl">
          O LibrasVision conecta visão computacional, processamento de linguagem e animação 3D para tornar a
          comunicação mais acessível.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {items.map((it) => (
          <div
            key={it.title}
            className="bg-card border border-border rounded-[1.5rem] p-6 shadow-[var(--shadow-soft)]"
          >
            <div className="size-11 rounded-2xl bg-stone-soft border border-border flex items-center justify-center mb-4">
              <it.icon className="size-5 text-clay" />
            </div>
            <h3 className="font-medium text-foreground">{it.title}</h3>
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{it.text}</p>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-br from-stone-soft to-card border border-border rounded-[2rem] p-8 mt-4 flex flex-col md:flex-row gap-6 items-start">
        <div className="size-12 rounded-2xl bg-clay text-clay-foreground flex items-center justify-center shrink-0">
          <Heart className="size-5" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-foreground">Sobre o projeto</h3>
          <p className="text-muted-foreground mt-2 leading-relaxed">
            O LibrasVision é um MVP focado em acessibilidade e inclusão. Ele demonstra um fluxo completo de tradução
            bidirecional entre Libras e português, com arquitetura preparada para integrações futuras com MediaPipe,
            modelos de IA reais e avatares 3D mais expressivos. Atualmente reconhece um conjunto inicial de sinais
            essenciais para situações cotidianas.
          </p>
        </div>
      </div>
    </section>
  );
}
