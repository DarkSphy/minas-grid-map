import {
  clubById,
  dayInBrasilia,
  SEASON_LENGTH,
  type Capture,
  type ClubId,
  type Player,
  type World,
} from "./model";
export type Activity = {
  id: string;
  capture: Capture;
  previousClub: ClubId | undefined;
  previousPlayerId: string | undefined;
};
export function activityItems(world: World): Activity[] {
  const previous = new Map<string, Capture>();
  return world.captures.map((capture, index) => {
    const key = `${capture.season}:${capture.id}`,
      prior = previous.get(key);
    previous.set(key, capture);
    return {
      id: `capture:${index}`,
      capture,
      previousClub: capture.previousClub ?? prior?.club,
      previousPlayerId: capture.previousPlayerId ?? prior?.playerId,
    };
  });
}
export type UserNotification = {
  id: string;
  title: string;
  message: string;
  at: number;
  club?: ClubId | undefined;
};
export function notificationsFor(world: World, player: Player, now: number): UserNotification[] {
  const notifications: UserNotification[] = [
    {
      id: `welcome:${player.id}`,
      title: "Bem-vindo ao Soccer War Brasil",
      message: "Escolha sua torcida e comece sua história em Minas Gerais.",
      at: player.joinedAt,
    },
  ];
  const start = world.epoch + (world.season - 1) * SEASON_LENGTH;
  if (world.season > 1)
    notifications.push({
      id: `season:${world.season}`,
      title: `Temporada ${world.season} iniciada`,
      message: "O mapa foi renovado. Escolha o clube que vai representar nesta temporada.",
      at: start,
    });
  if (player.lastActionDay && player.lastActionDay !== dayInBrasilia(now))
    notifications.push({
      id: `daily:${dayInBrasilia(now)}`,
      title: "Sua ação gratuita está disponível",
      message: "Você já pode conquistar mais um território hoje.",
      at: Date.parse(`${dayInBrasilia(now)}T00:00:00-03:00`),
    });
  for (const event of activityItems(world)) {
    const { capture } = event;
    if (capture.playerId === player.id)
      notifications.push({
        id: event.id,
        title: "Território conquistado",
        message: `${capture.mun ?? "Minas Gerais"} · MG ${capture.id} agora representa o ${clubById(capture.club).name}.`,
        at: capture.claimedAt,
        club: capture.club,
      });
    else if (event.previousPlayerId === player.id)
      notifications.push({
        id: event.id,
        title: "Seu território foi tomado",
        message: `${capture.mun ?? "Minas Gerais"} · MG ${capture.id} passou para o ${clubById(capture.club).name}.`,
        at: capture.claimedAt,
        club: capture.club,
      });
  }
  return notifications.sort((a, b) => b.at - a.at || b.id.localeCompare(a.id)).slice(0, 30);
}
