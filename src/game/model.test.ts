import { describe, expect, it } from "vitest";
import {
  canAct,
  captureCell,
  chooseClub,
  createWorld,
  dayInBrasilia,
  loginPlayer,
  nextFreeAction,
  ranking,
  rollSeason,
  seasonEnds,
  SEASON_LENGTH,
  type Cell,
} from "./model";
const now = Date.parse("2026-10-16T15:00:00Z");
const cell: Cell = {
  id: "1498-1212",
  c: 1498,
  r: 1212,
  mun: "Vespasiano",
  lat: -19.73,
  lon: -43.95,
};
function setup(name = "Maria", club: "cruzeiro" | "atletico" = "cruzeiro") {
  const login = loginPlayer(createWorld(now), name, now);
  return { id: login.id, world: chooseClub(login.world, login.id, club) };
}
describe("local game rules", () => {
  it("renews at midnight in Brasilia, rather than UTC midnight", () => {
    expect(dayInBrasilia(Date.parse("2026-10-16T02:59:59Z"))).toBe("2026-10-15");
    expect(dayInBrasilia(Date.parse("2026-10-16T03:00:00Z"))).toBe("2026-10-16");
    expect(nextFreeAction(now)).toBe(Date.parse("2026-10-17T03:00:00Z"));
  });
  it("reuses a demo profile without resetting its club or action", () => {
    const { world, id } = setup();
    const conquered = captureCell(world, id, cell, now);
    const again = loginPlayer(conquered, "  MARIA  ", now);
    expect(again.id).toBe(id);
    expect(again.world.players[id]?.lastActionDay).toBe("2026-10-16");
    expect(() => chooseClub(again.world, id, "america")).toThrow("já está definido");
  });
  it("claims any neutral cell and consumes exactly one daily action", () => {
    const { world, id } = setup();
    const updated = captureCell(world, id, cell, now);
    expect(updated.territories[cell.id]?.club).toBe("cruzeiro");
    expect(updated.captures).toHaveLength(1);
    expect(canAct(updated.players[id]!, now)).toBe(false);
    expect(() => captureCell(updated, id, { ...cell, id: "1-1", c: 1, r: 1 }, now + 1000)).toThrow(
      "já usou",
    );
    expect(world.territories).toEqual({});
  });
  it("allows a distant second cell on the following local day", () => {
    const { world, id } = setup();
    const first = captureCell(world, id, cell, now);
    const second = captureCell(first, id, { ...cell, id: "1-1", c: 1, r: 1 }, nextFreeAction(now));
    expect(Object.keys(second.territories)).toHaveLength(2);
  });
  it("transfers rival territory without inflating total ownership", () => {
    const { world, id } = setup();
    const first = captureCell(world, id, cell, now);
    const rival = loginPlayer(first, "João", now);
    const chosen = chooseClub(rival.world, rival.id, "atletico");
    const changed = captureCell(chosen, rival.id, cell, now);
    expect(Object.keys(changed.territories)).toHaveLength(1);
    expect(changed.captures).toHaveLength(2);
    expect(ranking(changed.territories).find((r) => r.club === "cruzeiro")?.count).toBe(0);
    expect(ranking(changed.territories, "Vespasiano")[0]?.club).toBe("atletico");
    expect(ranking(changed.territories, "Belo Horizonte").every((r) => r.count === 0)).toBe(true);
  });
  it("does not consume a new action by repainting the same club", () => {
    const { world, id } = setup();
    const first = captureCell(world, id, cell, now);
    expect(() => captureCell(first, id, cell, nextFreeAction(now))).toThrow("já pertence");
    expect(canAct(first.players[id]!, nextFreeAction(now))).toBe(true);
  });
  it("requires login and a seasonal club before conquest", () => {
    expect(() => captureCell(createWorld(now), "missing", cell, now)).toThrow("Entre");
    const p = loginPlayer(createWorld(now), "Pedro", now);
    expect(() => captureCell(p.world, p.id, cell, now)).toThrow("Escolha");
  });
  it("archives the final ownership, clears the map, and allows a new club", () => {
    const { world, id } = setup();
    const first = captureCell(world, id, cell, now);
    const next = rollSeason(first, seasonEnds(first));
    expect(next.season).toBe(2);
    expect(next.territories).toEqual({});
    expect(next.history[0]?.total).toBe(1);
    expect(next.history[0]?.ranking[0]?.club).toBe("cruzeiro");
    expect(next.captures).toHaveLength(1);
    expect(chooseClub(next, id, "america").players[id]?.clubs[2]).toBe("america");
    expect(rollSeason(next, now + SEASON_LENGTH + 1).history).toHaveLength(1);
  });
  it("keeps equal scores tied, with no fabricated champion", () => {
    const rows = ranking({});
    expect(rows.map((r) => r.position)).toEqual([1, 1, 1]);
    expect(rows.every((r) => r.count === 0)).toBe(true);
  });
  it("rejects inconsistent cell identifiers", () => {
    const { world, id } = setup();
    expect(() => captureCell(world, id, { ...cell, id: "bad" }, now)).toThrow("inválido");
  });
});
