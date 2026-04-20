/**
 * Dicionário MVP de sinais reconhecidos.
 * Cada entrada tem palavras-chave (PT-BR) e uma sequência de animação simbólica
 * para o avatar (poses pré-definidas).
 */

export type AvatarPose =
  | "idle"
  | "wave"           // Olá / Até logo
  | "sun-rise"       // Bom dia
  | "sun-set"        // Boa tarde
  | "thanks"         // Obrigado
  | "please"         // Por favor
  | "help"           // Preciso de ajuda
  | "where"          // Onde fica…
  | "drink"          // Quero água
  | "yes"            // Sim
  | "no";            // Não

export interface SignEntry {
  id: string;
  phrase: string;        // Frase canônica em PT-BR
  keywords: string[];    // Gatilhos de busca (lowercase, sem acento)
  sequence: AvatarPose[];
  description: string;   // Explicação da execução do sinal
}

export const SIGN_DICTIONARY: SignEntry[] = [
  {
    id: "ola",
    phrase: "Olá",
    keywords: ["ola", "oi", "hello"],
    sequence: ["idle", "wave", "idle"],
    description: "Mão aberta na altura da cabeça, movimento lateral de saudação.",
  },
  {
    id: "bom-dia",
    phrase: "Bom dia",
    keywords: ["bom dia", "bomdia", "dia"],
    sequence: ["idle", "sun-rise", "wave"],
    description: "Mão simulando o sol nascendo, seguida de saudação.",
  },
  {
    id: "boa-tarde",
    phrase: "Boa tarde",
    keywords: ["boa tarde", "tarde"],
    sequence: ["idle", "sun-set", "wave"],
    description: "Mão simulando o sol no alto descendo lateralmente.",
  },
  {
    id: "obrigado",
    phrase: "Obrigado",
    keywords: ["obrigado", "obrigada", "valeu", "agradeco", "agradecido"],
    sequence: ["idle", "thanks", "idle"],
    description: "Mão tocando o queixo e movendo para frente.",
  },
  {
    id: "por-favor",
    phrase: "Por favor",
    keywords: ["por favor", "favor", "please"],
    sequence: ["idle", "please", "idle"],
    description: "Mão aberta no peito em movimento circular suave.",
  },
  {
    id: "ajuda",
    phrase: "Preciso de ajuda",
    keywords: ["ajuda", "preciso de ajuda", "socorro", "help"],
    sequence: ["idle", "help", "help", "idle"],
    description: "Mão fechada sobre a palma aberta, elevando juntas.",
  },
  {
    id: "banheiro",
    phrase: "Onde fica o banheiro?",
    keywords: ["banheiro", "onde fica o banheiro", "toalete", "wc"],
    sequence: ["idle", "where", "where", "idle"],
    description: "Mão indicadora apontando e oscilando, expressão interrogativa.",
  },
  {
    id: "agua",
    phrase: "Quero água",
    keywords: ["agua", "quero agua", "beber", "sede"],
    sequence: ["idle", "drink", "idle"],
    description: "Mão em forma de copo levada à boca.",
  },
  {
    id: "sim",
    phrase: "Sim",
    keywords: ["sim", "yes", "claro"],
    sequence: ["idle", "yes", "idle"],
    description: "Cabeça acena positivamente, mão fechada balançando.",
  },
  {
    id: "nao",
    phrase: "Não",
    keywords: ["nao", "no", "negativo"],
    sequence: ["idle", "no", "idle"],
    description: "Indicador balançando lateralmente, expressão neutra.",
  },
  {
    id: "ate-logo",
    phrase: "Até logo",
    keywords: ["ate logo", "tchau", "adeus", "ate mais"],
    sequence: ["idle", "wave", "wave", "idle"],
    description: "Mão aberta acenando em despedida.",
  },
];

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Procura sinal por frase digitada (texto → libras). */
export function findSignForText(text: string): SignEntry | null {
  const n = normalize(text);
  if (!n) return null;
  // Match exato primeiro
  for (const s of SIGN_DICTIONARY) {
    if (s.keywords.some((k) => n === normalize(k))) return s;
  }
  // Match por contém
  for (const s of SIGN_DICTIONARY) {
    if (s.keywords.some((k) => n.includes(normalize(k)))) return s;
  }
  return null;
}
