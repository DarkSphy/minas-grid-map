import { describe, expect, it } from "vitest";
import { answerDailyQuiz, claimDailyMission, dailyMissions } from "./missions";
import { missionCities, quizForDay } from "./mission-content";
import {
  actionBalance,
  canAct,
  captureCell,
  capturesToday,
  chooseClub,
  createWorld,
  DAILY_CAPTURE_LIMIT,
  DAY,
  dayInBrasilia,
  loginPlayer,
  nextFreeAction,
  redeemDemoPack,
  rollSeason,
  type Cell,
} from "./model";
const now = Date.parse("2026-10-16T12:00:00-03:00");
const day = dayInBrasilia(now);
function setup() {
  const result = loginPlayer(createWorld(now), "Ana", now);
  return { world: chooseClub(result.world, result.id, "cruzeiro"), id: result.id };
}
const cell = (n: number, mun: string | null = missionCities(day)[0]!): Cell => ({
  id: `${n}-1`,
  c: n,
  r: 1,
  mun,
  lat: -19,
  lon: -43,
});
describe("daily missions and global action cap", () => {
  it("starts from legacy profiles without granting rewards automatically", () => {
    const { world, id } = setup();
    expect(world.players[id]!.missions).toBeUndefined();
    expect(
      dailyMissions(world, world.players[id]!, now).missions.every(
        (m) => !m.complete && !m.claimed,
      ),
    ).toBe(true);
    expect(() => claimDailyMission(world, id, day, "quiz", now)).toThrow("Conclua");
  });
  it("requires a club, today's question and the correct answer without spending actions", () => {
    const { world, id } = setup();
    const q = quizForDay(day);
    expect(() => answerDailyQuiz(world, id, day, q.id, (q.answer + 1) % 3, now)).toThrow("Tente");
    expect(() => answerDailyQuiz(world, id, day, "old", q.answer, now)).toThrow("pergunta");
    const w = answerDailyQuiz(world, id, day, q.id, q.answer, now);
    expect(actionBalance(w.players[id]!, now)).toBe(1);
    expect(dailyMissions(w, w.players[id]!, now).quizSolved).toBe(true);
    expect(answerDailyQuiz(w, id, day, q.id, q.answer, now)).toBe(w);
    const guest = loginPlayer(createWorld(now), "Bia", now);
    expect(() => claimDailyMission(guest.world, guest.id, day, "quiz", now)).toThrow("clube");
  });
  it("claims the quiz exactly once and preserves avatar, purchases and notification state", () => {
    const { world, id } = setup();
    world.players[id]!.readNotifications = ["x"];
    const q = quizForDay(day);
    const answered = answerDailyQuiz(world, id, day, q.id, q.answer, now);
    const w = claimDailyMission(answered, id, day, "quiz", now);
    expect(actionBalance(w.players[id]!, now)).toBe(2);
    expect(w.players[id]!.readNotifications).toEqual(["x"]);
    expect(claimDailyMission(w, id, day, "quiz", now)).toBe(w);
  });
  it("a neutral capture in a target city completes both territorial missions, one reward each", () => {
    const { world, id } = setup();
    let w = captureCell(world, id, cell(1), now);
    expect(actionBalance(w.players[id]!, now)).toBe(0);
    w = claimDailyMission(w, id, day, "first-capture", now);
    w = claimDailyMission(w, id, day, "support-city", now);
    expect(actionBalance(w.players[id]!, now)).toBe(2);
    expect(() => claimDailyMission(w, id, day, "unknown" as never, now)).toThrow("inválida");
  });
  it("does not complete support-city for non-target or boundary cells", () => {
    const { world, id } = setup();
    for (const mun of [null, "Outra cidade"]) {
      const w = captureCell(world, id, cell(1, mun), now);
      expect(
        dailyMissions(w, w.players[id]!, now).missions.find((m) => m.id === "support-city")!
          .complete,
      ).toBe(false);
    }
  });
  it("gives a fully free route to four captures with three rewards and no purchases", () => {
    const { world, id } = setup();
    const q = quizForDay(day);
    let w = answerDailyQuiz(world, id, day, q.id, q.answer, now);
    w = claimDailyMission(w, id, day, "quiz", now);
    w = captureCell(w, id, cell(1), now);
    w = claimDailyMission(w, id, day, "first-capture", now);
    w = claimDailyMission(w, id, day, "support-city", now);
    for (let i = 2; i <= 4; i++) w = captureCell(w, id, cell(i), now);
    expect(capturesToday(w, id, now)).toBe(4);
    expect(actionBalance(w.players[id]!, now)).toBe(0);
    expect(() => captureCell(w, id, cell(5), now)).toThrow();
  });
  it("blocks the ninth capture without debiting paid balance and renews at Brasília midnight", () => {
    const { world, id } = setup();
    let w = redeemDemoPack(world, id, "territory", "payment");
    for (let i = 1; i <= DAILY_CAPTURE_LIMIT; i++) w = captureCell(w, id, cell(i), now);
    expect(w.players[id]!.extraActions).toBe(13);
    expect(capturesToday(w, id, now)).toBe(8);
    expect(canAct(w.players[id]!, now, 8)).toBe(false);
    expect(() => captureCell(w, id, cell(9), now)).toThrow("oito");
    expect(w.players[id]!.extraActions).toBe(13);
    const next = nextFreeAction(now);
    w = captureCell(w, id, cell(9), next);
    expect(capturesToday(w, id, next)).toBe(1);
    expect(w.players[id]!.extraActions).toBe(13);
  });
  it("expires incomplete rewards at midnight and retains previously claimed extras", () => {
    const { world, id } = setup();
    const q = quizForDay(day);
    let w = answerDailyQuiz(world, id, day, q.id, q.answer, now);
    const tomorrow = nextFreeAction(now);
    expect(() => claimDailyMission(w, id, day, "quiz", tomorrow)).toThrow("renovadas");
    w = claimDailyMission(w, id, day, "quiz", now);
    const status = dailyMissions(w, w.players[id]!, tomorrow);
    expect(status.missions.every((m) => !m.complete && !m.claimed)).toBe(true);
    expect(actionBalance(w.players[id]!, tomorrow)).toBe(2);
    expect(
      dailyMissions(w, w.players[id]!, tomorrow - 1).missions.find((m) => m.id === "quiz")!.claimed,
    ).toBe(true);
  });
  it("does not reset the daily cap when a season ends within the same day", () => {
    const { world, id } = setup();
    let w = redeemDemoPack(world, id, "territory", "payment");
    w = { ...w, epoch: now - 14 * DAY + 1000 };
    for (let i = 1; i <= 8; i++) w = captureCell(w, id, cell(i), now);
    w = rollSeason(w, now + 2000);
    w = chooseClub(w, id, "america");
    expect(capturesToday(w, id, now + 2000)).toBe(8);
    expect(() => captureCell(w, id, cell(10), now + 2000)).toThrow("oito");
  });
  it("counts rival takeovers for missions even after losing ownership", () => {
    const { world, id } = setup();
    let w = captureCell(world, id, cell(1), now);
    const rival = loginPlayer(w, "Bia", now);
    w = chooseClub(rival.world, rival.id, "america");
    w = captureCell(w, rival.id, cell(1), now);
    expect(
      dailyMissions(w, w.players[rival.id]!, now).missions.filter((m) => m.complete),
    ).toHaveLength(2);
    expect(dailyMissions(w, w.players[id]!, now).missions.filter((m) => m.complete)).toHaveLength(
      2,
    );
  });
});
