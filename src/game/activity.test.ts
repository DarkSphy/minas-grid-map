import { describe, expect, it } from "vitest";
import { activityItems, notificationsFor } from "./activity";
import {
  captureCell,
  chooseClub,
  createWorld,
  loginPlayer,
  markNotificationsRead,
  nextFreeAction,
  rollSeason,
  seasonEnds,
  updateAvatar,
  validAvatar,
  type Cell,
} from "./model";
const now = Date.parse("2026-10-16T15:00:00Z");
const cell: Cell = { id: "1498-1212", c: 1498, r: 1212, mun: "Vespasiano", lat: -19.7, lon: -43.9 };
function setup() {
  const account = loginPlayer(createWorld(now), "Ana", now);
  return { id: account.id, world: chooseClub(account.world, account.id, "cruzeiro") };
}
describe("profile photos and activity notifications", () => {
  it("adds and removes an optional photo without resetting existing participation", () => {
    const { world, id } = setup();
    const conquered = captureCell(world, id, cell, now);
    const saved = updateAvatar(conquered, id, "data:image/webp;base64,YWJj");
    expect(saved.players[id]?.avatar).toBe("data:image/webp;base64,YWJj");
    expect(saved.players[id]?.clubs).toEqual(conquered.players[id]?.clubs);
    expect(saved.players[id]?.lastActionDay).toBe(conquered.players[id]?.lastActionDay);
    expect(updateAvatar(saved, id, null).players[id]?.avatar).toBeNull();
    expect(world.players[id]?.avatar).toBeUndefined();
  });
  it("rejects external URLs, SVG and oversized data instead of persisting them", () => {
    const { world, id } = setup();
    expect(validAvatar("https://example.com/photo.png")).toBe(false);
    expect(validAvatar("data:image/svg+xml;base64,YWJj")).toBe(false);
    expect(() => updateAvatar(world, id, "data:image/png;base64," + "a".repeat(180000))).toThrow(
      "Foto inválida",
    );
  });
  it("notifies the original owner when a rival takes the cell", () => {
    const { world, id } = setup();
    const first = captureCell(world, id, cell, now);
    const rival = loginPlayer(first, "Beto", now);
    const picked = chooseClub(rival.world, rival.id, "atletico");
    const taken = captureCell(picked, rival.id, cell, now + 1000);
    const activity = activityItems(taken);
    expect(activity[1]?.previousPlayerId).toBe(id);
    expect(activity[1]?.previousClub).toBe("cruzeiro");
    expect(
      notificationsFor(taken, taken.players[id]!, now + 1000).some(
        (n) => n.title === "Seu território foi tomado",
      ),
    ).toBe(true);
    expect(
      notificationsFor(taken, taken.players[rival.id]!, now + 1000).filter(
        (n) => n.title === "Território conquistado",
      ),
    ).toHaveLength(1);
  });
  it("derives old takeover history even when previous-owner fields were not stored", () => {
    const { world, id } = setup();
    const first = captureCell(world, id, cell, now);
    const rival = loginPlayer(first, "Beto", now);
    const taken = captureCell(
      chooseClub(rival.world, rival.id, "atletico"),
      rival.id,
      cell,
      now + 1000,
    );
    delete taken.captures[1]!.previousClub;
    delete taken.captures[1]!.previousPlayerId;
    expect(activityItems(taken)[1]?.previousPlayerId).toBe(id);
    expect(activityItems(taken)[0]?.id).toBe(activityItems(first)[0]?.id);
  });
  it("stores read state per player and keeps duplicate identifiers out", () => {
    const { world, id } = setup();
    const items = notificationsFor(world, world.players[id]!, now);
    const read = markNotificationsRead(world, id, [items[0]!.id, items[0]!.id]);
    expect(read.players[id]?.readNotifications).toEqual([items[0]!.id]);
    expect(world.players[id]?.readNotifications).toBeUndefined();
    expect(read.territories).toBe(world.territories);
  });
  it("derives action availability and new-season messages from actual game state", () => {
    const { world, id } = setup();
    const used = captureCell(world, id, cell, now);
    expect(
      notificationsFor(used, used.players[id]!, now).some((n) => n.id.startsWith("daily:")),
    ).toBe(false);
    expect(
      notificationsFor(used, used.players[id]!, nextFreeAction(now)).some((n) =>
        n.id.startsWith("daily:"),
      ),
    ).toBe(true);
    const next = rollSeason(used, seasonEnds(used));
    expect(
      notificationsFor(next, next.players[id]!, seasonEnds(used)).some(
        (n) => n.title === "Temporada 2 iniciada",
      ),
    ).toBe(true);
  });
});
