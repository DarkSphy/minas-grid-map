import { useCallback, useEffect, useMemo, useState } from "react";
import { localRepository } from "./repository";
import { dailyMissions } from "./missions";
import type { MissionId } from "./mission-content";
import {
  capturesToday,
  dayInBrasilia,
  DAILY_CAPTURE_LIMIT,
  actionBalance,
  canAct,
  seasonEnds,
  type Cell,
  type ClubId,
  type World,
} from "./model";
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
  const day = dayInBrasilia(now);
  const usedToday = useMemo(
    () => (world && id ? capturesToday(world, id, Date.parse(`${day}T12:00:00-03:00`)) : 0),
    [world, id, day],
  );
  const missions = useMemo(
    () => (world ? dailyMissions(world, player, Date.parse(`${day}T12:00:00-03:00`)) : null),
    [world, player, day],
  );
  return {
    usedToday,
    dailyRemaining: Math.max(0, DAILY_CAPTURE_LIMIT - usedToday),
    limitReached: usedToday >= DAILY_CAPTURE_LIMIT,
    missions,
    claimMission: (missionId: MissionId, expectedDay: string) =>
      run(() => localRepository.claimMission(id ?? "", expectedDay, missionId)),
    answerQuiz: (expectedDay: string, questionId: string, answer: number) =>
      run(() => localRepository.answerQuiz(id ?? "", expectedDay, questionId, answer)),
    world,
    player,
    club,
    now,
    error,
    pending,
    ready: !!world,
    available: canAct(player, now, usedToday),
    balance: actionBalance(player, now),
    demoPack: (packId: string, orderId: string) =>
      run(() => localRepository.demoPack(id ?? "", packId, orderId)),
    clearError: () => setError(""),
    refresh,
    async login(name: string, avatar?: string | null) {
      return run(async () => {
        const result = await localRepository.login(name, avatar);
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
    setAvatar: (avatar: string | null) => run(() => localRepository.avatar(id ?? "", avatar)),
    markRead: (ids: string[]) => run(() => localRepository.markRead(id ?? "", ids)),
    choose: (clubId: ClubId) => run(() => localRepository.choose(id ?? "", clubId)),
    capture: (cell: Cell) => run(() => localRepository.capture(id ?? "", cell)),
  };
}
export type Game = ReturnType<typeof useGame>;
