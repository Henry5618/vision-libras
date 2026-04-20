import { useEffect, useState } from "react";
import { Moon, Sun, Hand } from "lucide-react";

export function Header() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("lv-theme");
    if (saved === "dark") {
      document.documentElement.classList.add("dark");
      setDark(true);
    }
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("lv-theme", next ? "dark" : "light");
  };

  return (
    <header className="max-w-[1200px] mx-auto w-full flex items-center justify-between gap-4 pt-8 pb-4 px-4">
      <div className="flex items-center gap-3">
        <div className="size-11 rounded-2xl bg-clay text-clay-foreground flex items-center justify-center shadow-[var(--shadow-soft)]">
          <Hand className="size-5" aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Libras<span className="text-clay">Vision</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Tecnologia acessível para comunicação em Libras e português.
          </p>
        </div>
      </div>
      <button
        onClick={toggle}
        aria-label="Alternar tema"
        className="size-11 rounded-full bg-card border border-border flex items-center justify-center text-foreground hover:bg-accent transition-colors shadow-[var(--shadow-soft)]"
      >
        {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </button>
    </header>
  );
}
