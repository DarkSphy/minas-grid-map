export const CLUBS = [
  {
    id: "cruzeiro",
    name: "Cruzeiro",
    color: "#1464ff",
    crest: "/assets/clubs/cruzeiro.png",
    initials: "CRU",
  },
  {
    id: "atletico",
    name: "Atlético Mineiro",
    color: "#30363c",
    crest: "/assets/clubs/atletico.svg",
    initials: "CAM",
  },
  {
    id: "america",
    name: "América Mineiro",
    color: "#00bd70",
    crest: "/assets/clubs/america.png",
    initials: "AME",
  },
] as const;
export type ClubId = (typeof CLUBS)[number]["id"];
export const clubById = (id: ClubId) => CLUBS.find((club) => club.id === id)!;
export const DAY = 86_400_000;
export const SEASON_LENGTH = 14 * DAY;
export type Player = {
  id: string;
  name: string;
  joinedAt: number;
  clubs: Record<string, ClubId>;
  lastActionDay: string | null;
};
export type Cell = {
  id: string;
  c: number;
  r: number;
  mun: string | null;
  lat: number;
  lon: number;
};
export type Territory = Cell & { club: ClubId; playerId: string; claimedAt: number };
export type Capture = Territory & { season: number };
export type RankingRow = { club: ClubId; count: number; position: number };
export type SeasonSummary = {
  number: number;
  endedAt: number;
  ranking: RankingRow[];
  total: number;
};
export type World = {
  version: 1;
  gridVersion: "mg-legacy-v1";
  epoch: number;
  season: number;
  players: Record<string, Player>;
  territories: Record<string, Territory>;
  captures: Capture[];
  history: SeasonSummary[];
};
export function createWorld(now: number): World {
  return {
    version: 1,
    gridVersion: "mg-legacy-v1",
    epoch: now,
    season: 1,
    players: {},
    territories: {},
    captures: [],
    history: [],
  };
}
export function dayInBrasilia(now: number) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (name: string) => parts.find((p) => p.type === name)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export const nextFreeAction = (now: number) =>
  Date.parse(`${dayInBrasilia(now)}T00:00:00-03:00`) + DAY;
export const seasonEnds = (world: World) => world.epoch + world.season * SEASON_LENGTH;
export function ranking(
  territories: Record<string, Territory>,
  municipality?: string,
): RankingRow[] {
  const totals = new Map<ClubId, number>(CLUBS.map((c) => [c.id, 0]));
  for (const t of Object.values(territories))
    if (!municipality || t.mun === municipality) totals.set(t.club, totals.get(t.club)! + 1);
  const sorted = CLUBS.map((c) => ({ club: c.id, count: totals.get(c.id)! })).sort(
    (a, b) => b.count - a.count || a.club.localeCompare(b.club),
  );
  return sorted.map((row) => ({
    ...row,
    position: 1 + sorted.filter((r) => r.count > row.count).length,
  }));
}
export function rollSeason(world: World, now: number): World {
  const number = Math.max(1, Math.floor((now - world.epoch) / SEASON_LENGTH) + 1);
  if (number <= world.season) return world;
  const summary: SeasonSummary = {
    number: world.season,
    endedAt: seasonEnds(world),
    ranking: ranking(world.territories),
    total: Object.keys(world.territories).length,
  };
  return { ...world, season: number, territories: {}, history: [...world.history, summary] };
}
export function canAct(player: Player | null, now: number) {
  return !!player && player.lastActionDay !== dayInBrasilia(now);
}
export function loginPlayer(world: World, name: string, now: number): { world: World; id: string } {
  const clean = name.trim().replace(/\s+/g, " ").slice(0, 48);
  if (!clean) throw new Error("Informe um nome para entrar.");
  const id = `demo:${clean.toLocaleLowerCase("pt-BR")}`;
  if (world.players[id]) return { world, id };
  const player: Player = { id, name: clean, joinedAt: now, clubs: {}, lastActionDay: null };
  return { world: { ...world, players: { ...world.players, [id]: player } }, id };
}
export function chooseClub(world: World, playerId: string, club: ClubId): World {
  const player = world.players[playerId];
  if (!player) throw new Error("Entre para escolher seu clube.");
  if (player.clubs[world.season])
    throw new Error("Seu clube já está definido para esta temporada.");
  return {
    ...world,
    players: {
      ...world.players,
      [playerId]: { ...player, clubs: { ...player.clubs, [world.season]: club } },
    },
  };
}
export function captureCell(world: World, playerId: string, cell: Cell, now: number): World {
  const player = world.players[playerId];
  if (!player) throw new Error("Entre para conquistar um território.");
  const club = player.clubs[world.season];
  if (!club) throw new Error("Escolha seu clube antes de conquistar.");
  if (!canAct(player, now))
    throw new Error("Você já usou sua ação de hoje. Uma nova ação chega à meia-noite de Brasília.");
  if (world.territories[cell.id]?.club === club)
    throw new Error("Este território já pertence à sua torcida.");
  if (
    !Number.isInteger(cell.c) ||
    !Number.isInteger(cell.r) ||
    cell.c < 0 ||
    cell.r < 0 ||
    cell.id !== `${cell.c}-${cell.r}` ||
    !Number.isFinite(cell.lat) ||
    !Number.isFinite(cell.lon)
  )
    throw new Error("Território inválido.");
  const territory: Territory = { ...cell, club, playerId, claimedAt: now };
  return {
    ...world,
    territories: { ...world.territories, [cell.id]: territory },
    players: { ...world.players, [playerId]: { ...player, lastActionDay: dayInBrasilia(now) } },
    captures: [...world.captures, { ...territory, season: world.season }],
  };
}
export function countdown(milliseconds: number) {
  let s = Math.max(0, Math.floor(milliseconds / 1000));
  const d = Math.floor(s / 86400);
  s %= 86400;
  const h = Math.floor(s / 3600);
  s %= 3600;
  const m = Math.floor(s / 60);
  return `${d ? `${d}d ` : ""}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** Index ownership once when territories change, keeping hover independent of total territory count. */
export function municipalRankings(
  territories: Record<string, Territory>,
): Map<string, RankingRow[]> {
  const grouped = new Map<string, Record<string, Territory>>();
  for (const territory of Object.values(territories)) {
    if (!territory.mun) continue;
    const cells = grouped.get(territory.mun) ?? {};
    cells[territory.id] = territory;
    grouped.set(territory.mun, cells);
  }
  return new Map([...grouped].map(([name, cells]) => [name, ranking(cells)]));
}
