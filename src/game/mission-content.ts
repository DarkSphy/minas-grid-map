/** Versioned local mission content. Never change a published question's answer in place. */
export const DAILY_QUIZ = [
  {
    id: "mg-capital-v1",
    question: "Qual é a capital de Minas Gerais?",
    options: ["Ouro Preto", "Belo Horizonte", "Uberlândia"],
    answer: 1,
    explanation: "Belo Horizonte é a capital de Minas Gerais. Ouro Preto foi a antiga capital.",
  },
  {
    id: "grid-area-v1",
    question: "Um quadrado de 500 × 500 metros representa aproximadamente quanto?",
    options: ["0,25 km²", "2,5 km²", "25 km²"],
    answer: 0,
    explanation: "500 × 500 são 250 mil metros quadrados, equivalentes a 0,25 km².",
  },
  {
    id: "football-team-v1",
    question: "Quantos jogadores de cada time começam uma partida de futebol de campo?",
    options: ["9", "10", "11"],
    answer: 2,
    explanation: "Cada equipe começa com onze jogadores em campo, incluindo o goleiro.",
  },
  {
    id: "mg-cities-v1",
    question: "Quantos municípios formam o mapa de Minas Gerais neste jogo?",
    options: ["853", "645", "417"],
    answer: 0,
    explanation:
      "Minas Gerais tem 853 municípios. Cada um deles pode ser palco da disputa entre torcidas.",
  },
  {
    id: "free-map-v1",
    question: "Você precisa de um território vizinho para conquistar outro quadrado?",
    options: [
      "Sim, sempre",
      "Não, pode escolher qualquer posição disponível",
      "Só pode conquistar na capital",
    ],
    answer: 1,
    explanation:
      "A conquista é livre: você pode apoiar sua torcida em qualquer município disponível no estado.",
  },
  {
    id: "daily-reset-v1",
    question: "Quando a ação gratuita é renovada?",
    options: [
      "A cada vez que abrir o jogo",
      "A cada conquista",
      "À meia-noite no horário de Brasília",
    ],
    answer: 2,
    explanation:
      "A renovação acontece à meia-noite de Brasília. Abrir novas abas não renova suas ações.",
  },
] as const;
const CITIES = [
  "Belo Horizonte",
  "Vespasiano",
  "Uberlândia",
  "Juiz de Fora",
  "Montes Claros",
  "Ouro Preto",
  "Uberaba",
  "Divinópolis",
  "Ipatinga",
  "Sete Lagoas",
  "Poços de Caldas",
  "Governador Valadares",
] as const;
const dayIndex = (day: string) => Math.floor(Date.parse(`${day}T00:00:00Z`) / 86_400_000);
export const quizForDay = (day: string) =>
  DAILY_QUIZ[((dayIndex(day) % DAILY_QUIZ.length) + DAILY_QUIZ.length) % DAILY_QUIZ.length]!;
/** Stable for everyone all day, independent of ownership changes and refreshes. */
export function missionCities(day: string): string[] {
  const start = ((dayIndex(day) % CITIES.length) + CITIES.length) % CITIES.length;
  return [
    CITIES[start]!,
    CITIES[(start + 4) % CITIES.length]!,
    CITIES[(start + 8) % CITIES.length]!,
  ];
}
export const MISSION_IDS = ["first-capture", "quiz", "support-city"] as const;
export type MissionId = (typeof MISSION_IDS)[number];
