import { describe, expect, it } from "vitest";
import {
  actionBalance,
  captureCell,
  chooseClub,
  createWorld,
  DAY,
  loginPlayer,
  municipalPodiums,
  redeemDemoPack,
  rollSeason,
} from "./model";
const now = Date.parse("2026-10-16T12:00:00-03:00");
function setup() {
  const a = loginPlayer(createWorld(now), "Ana", now);
  return { world: chooseClub(a.world, a.id, "cruzeiro"), id: a.id };
}
const cell = { id: "1-1", c: 1, r: 1, mun: "Vespasiano", lat: -19.7, lon: -43.9 };
describe("action shop and municipal supporters", () => {
  it("credits the catalogue once per order and rejects invalid packs", () => {
    const { world, id } = setup();
    const next = redeemDemoPack(world, id, "starter", "order-1");
    expect(actionBalance(next.players[id]!, now)).toBe(6);
    expect(redeemDemoPack(next, id, "starter", "order-1")).toBe(next);
    expect(() => redeemDemoPack(next, id, "bad", "order-2")).toThrow();
  });
  it("spends the daily action first, then extras; refreshes daily without losing extras", () => {
    const { world, id } = setup();
    let w = redeemDemoPack(world, id, "starter", "x");
    w = captureCell(w, id, cell, now);
    expect(w.players[id]!.extraActions).toBe(5);
    w = captureCell(w, id, { ...cell, id: "2-1", c: 2 }, now);
    expect(w.players[id]!.extraActions).toBe(4);
    expect(actionBalance(w.players[id]!, now + DAY)).toBe(5);
    expect(actionBalance(rollSeason(w, now + 15 * DAY).players[id]!, now + 15 * DAY)).toBe(5);
  });
  it("does not spend extras on an invalid or already allied cell", () => {
    const { world, id } = setup();
    const w = captureCell(redeemDemoPack(world, id, "starter", "x"), id, cell, now);
    expect(() => captureCell(w, id, cell, now)).toThrow();
    expect(w.players[id]!.extraActions).toBe(5);
  });
  it("assigns tied podiums on current ownership and recalculates after a takeover", () => {
    const { world, id } = setup();
    let w = captureCell(world, id, cell, now);
    const b = loginPlayer(w, "Bia", now);
    w = chooseClub(b.world, b.id, "america");
    w = captureCell(w, b.id, { ...cell, id: "2-1", c: 2 }, now);
    expect(municipalPodiums(w).map((p) => p.position)).toEqual([1, 1]);
    w = redeemDemoPack(w, b.id, "starter", "b");
    w = captureCell(w, b.id, cell, now);
    expect(municipalPodiums(w)).toEqual([
      { city: "Vespasiano", playerId: b.id, count: 2, position: 1 },
    ]);
  });
});
