import { z } from "zod";
import {
  createWorld,
  rollSeason,
  loginPlayer,
  chooseClub,
  captureCell,
  updateAvatar,
  markNotificationsRead,
  validAvatar,
  type Cell,
  type ClubId,
  type World,
} from "./model";
const club = z.enum(["cruzeiro", "atletico", "america"]);
const row = z.object({
  club,
  count: z.number().int().nonnegative(),
  position: z.number().int().positive(),
});
const territory = z.object({
  id: z.string(),
  c: z.number().int().nonnegative(),
  r: z.number().int().nonnegative(),
  mun: z.string().nullable(),
  lat: z.number(),
  lon: z.number(),
  club,
  playerId: z.string(),
  claimedAt: z.number(),
});
const schema = z.object({
  version: z.literal(1),
  gridVersion: z.literal("mg-legacy-v1"),
  epoch: z.number(),
  season: z.number().int().positive(),
  players: z.record(
    z.object({
      id: z.string(),
      name: z.string(),
      joinedAt: z.number(),
      clubs: z.record(club),
      lastActionDay: z.string().nullable(),
      avatar: z.string().refine(validAvatar).nullable().optional(),
      readNotifications: z.array(z.string()).optional(),
    }),
  ),
  territories: z.record(territory),
  captures: z.array(
    territory.extend({
      season: z.number().int().positive(),
      previousPlayerId: z.string().optional(),
      previousClub: club.optional(),
    }),
  ),
  history: z.array(
    z.object({ number: z.number(), endedAt: z.number(), ranking: z.array(row), total: z.number() }),
  ),
});
const KEY = "soccer-war:demo:v1";
const SESSION = "soccer-war:demo:player";
export interface GameRepository {
  load(): Promise<World>;
  login(name: string, avatar?: string | null): Promise<{ world: World; id: string }>;
  choose(playerId: string, club: ClubId): Promise<World>;
  capture(playerId: string, cell: Cell): Promise<World>;
  avatar(playerId: string, avatar: string | null): Promise<World>;
  markRead(playerId: string, ids: string[]): Promise<World>;
  session(): string | null;
  setSession(id: string | null): void;
  subscribe(listener: () => void): () => void;
}
let cachedRaw: string | null = null;
let cachedWorld: World | null = null;
let queue: Promise<void> = Promise.resolve();
function persist(world: World) {
  try {
    const raw = JSON.stringify(world);
    localStorage.setItem(KEY, raw);
    cachedRaw = raw;
    cachedWorld = world;
  } catch {
    throw new Error(
      "Não foi possível salvar neste navegador. Verifique o espaço ou as permissões de armazenamento.",
    );
  }
}
async function loadWorld(): Promise<World> {
  let raw: string | null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    throw new Error("O armazenamento local está bloqueado neste navegador.");
  }
  let world: World;
  try {
    world =
      raw && raw === cachedRaw && cachedWorld
        ? cachedWorld
        : raw
          ? schema.parse(JSON.parse(raw))
          : createWorld(Date.now());
  } catch {
    throw new Error(
      "Os dados locais não puderam ser lidos. Eles foram preservados; tente recarregar ou usar outro navegador.",
    );
  }
  const updated = rollSeason(world, Date.now());
  if (!raw || updated !== world) persist(updated);
  else {
    cachedRaw = raw;
    cachedWorld = world;
  }
  return updated;
}
async function mutate(change: (world: World, now: number) => World): Promise<World> {
  const execute = async () => {
    const updated = change(await loadWorld(), Date.now());
    persist(updated);
    window.dispatchEvent(new Event("soccer-war:update"));
    return updated;
  };
  if (navigator.locks) return navigator.locks.request(KEY, execute);
  const result = queue.then(execute, execute);
  queue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}
// Browser-only adapter. Production methods must call authenticated, atomic server RPCs.
export const localRepository: GameRepository = {
  load: loadWorld,
  async login(name, avatar) {
    let id = "";
    const world = await mutate((w, now) => {
      const result = loginPlayer(w, name, now);
      id = result.id;
      return avatar ? updateAvatar(result.world, result.id, avatar) : result.world;
    });
    return { world, id };
  },
  choose: (playerId, club) => mutate((w) => chooseClub(w, playerId, club)),
  capture: (playerId, cell) => mutate((w, now) => captureCell(w, playerId, cell, now)),
  avatar: (playerId, avatar) => mutate((w) => updateAvatar(w, playerId, avatar)),
  markRead: (playerId, ids) => mutate((w) => markNotificationsRead(w, playerId, ids)),
  session: () => sessionStorage.getItem(SESSION),
  setSession: (id) => {
    if (id) sessionStorage.setItem(SESSION, id);
    else sessionStorage.removeItem(SESSION);
  },
  subscribe(listener) {
    const onStorage = (event: StorageEvent) => {
      if (event.key === KEY || event.key === null) listener();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("soccer-war:update", listener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("soccer-war:update", listener);
    };
  },
};
