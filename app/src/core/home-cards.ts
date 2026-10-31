// Las tarjetas de Inicio en la ventana de NEO: cuáles hay, en qué orden y de qué ancho.
// Se guardan en los ajustes (`homeCards`); el orden de la lista es el de la página.

export const HOME_CARD_IDS = ["notifications", "sessions", "agents", "status", "services", "dictation"] as const;

export type HomeCardId = (typeof HOME_CARD_IDS)[number];

export interface HomeCard {
  id: string;
  /** Ocupa las dos columnas. */
  wide: boolean;
}

export const DEFAULT_HOME_CARDS: HomeCard[] = [
  { id: "notifications", wide: true },
  { id: "sessions", wide: false },
  { id: "agents", wide: false },
  { id: "status", wide: true },
];

const known = (id: string) => (HOME_CARD_IDS as readonly string[]).includes(id);

/** Lo guardado, sin tarjetas que ya no existen ni repetidas. */
export function cleanCards(cards: HomeCard[]): HomeCard[] {
  return cards.filter((c, i) => known(c.id) && cards.findIndex((o) => o.id === c.id) === i);
}

export function missingCards(cards: HomeCard[]): HomeCardId[] {
  return HOME_CARD_IDS.filter((id) => !cards.some((c) => c.id === id));
}

export function addCard(cards: HomeCard[], id: string): HomeCard[] {
  return known(id) && !cards.some((c) => c.id === id) ? [...cards, { id, wide: false }] : cards;
}

export function removeCard(cards: HomeCard[], id: string): HomeCard[] {
  return cards.filter((c) => c.id !== id);
}

export function moveCard(cards: HomeCard[], id: string, to: number): HomeCard[] {
  const card = cards.find((c) => c.id === id);
  if (!card) return cards;
  const rest = cards.filter((c) => c !== card);
  rest.splice(Math.max(0, Math.min(to, rest.length)), 0, card);
  return rest;
}

export function toggleWide(cards: HomeCard[], id: string): HomeCard[] {
  return cards.map((c) => (c.id === id ? { ...c, wide: !c.wide } : c));
}
