import { useCallback, useEffect, useState } from "react";
import { localRepository } from "./repository";
import { canAct, seasonEnds, type Cell, type ClubId, type World } from "./model";
export function useGame() {
  const [world, setWorld] = useState<World | null>(null);
  const [id, setId] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const refresh = useCallback(async () => {
    try {
      setWorld(await localRepository.load());
      setId(localRepository.session());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível ler os dados locais.");
    }
  }, []);
  useEffect(() => {
    void refresh();
    setNow(Date.now());
    const unsubscribe = localRepository.subscribe(() => void refresh());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    const seasonTimer = setInterval(() => void refresh(), 30000);
    const onFocus = () => {
      setNow(Date.now());
      void refresh();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      unsubscribe();
      clearInterval(timer);
      clearInterval(seasonTimer);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);
  useEffect(() => {
    if (world && now >= seasonEnds(world)) void refresh();
  }, [world, now, refresh]);
  const run = async (operation: () => Promise<World>) => {
    setPending(true);
    setError("");
    try {
      const next = await operation();
      setWorld(next);
      setNow(Date.now());
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar a ação.");
      return false;
    } finally {
      setPending(false);
    }
  };
  const player = world && id ? (world.players[id] ?? null) : null;
  const club = player && world ? (player.clubs[world.season] ?? null) : null;
  return {
    world,
    player,
    club,
    now,
    error,
    pending,
    ready: !!world,
    available: canAct(player, now),
    clearError: () => setError(""),
    refresh,
    async login(name: string) {
      return run(async () => {
        const result = await localRepository.login(name);
        try {
          localRepository.setSession(result.id);
        } catch {
          throw new Error("Não foi possível manter sua sessão neste navegador.");
        }
        setId(result.id);
        return result.world;
      });
    },
    logout() {
      try {
        localRepository.setSession(null);
      } catch {
        setError("Não foi possível encerrar a sessão local.");
        return;
      }
      setId(null);
      setError("");
    },
    choose: (clubId: ClubId) => run(() => localRepository.choose(id ?? "", clubId)),
    capture: (cell: Cell) => run(() => localRepository.capture(id ?? "", cell)),
  };
}
export type Game = ReturnType<typeof useGame>;
