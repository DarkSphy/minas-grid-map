import { dayInBrasilia, type World, type Player } from "./model";
import { missionCities, quizForDay, MISSION_IDS, type MissionId } from "./mission-content";
export function dailyMissions(world: World, player: Player | null, now: number) {
  const day = dayInBrasilia(now);
  const start = Date.parse(`${day}T00:00:00-03:00`);
  const captures = world.captures.filter(
    (c) => c.playerId === player?.id && c.claimedAt >= start && c.claimedAt < start + 86_400_000,
  );
  const progress = player?.missions?.day === day ? player.missions : null;
  const cities = missionCities(day);
  return {
    day,
    cities,
    quiz: quizForDay(day),
    quizSolved: !!progress?.quizSolved,
    missions: MISSION_IDS.map((id) => ({
      id,
      reward: 1,
      complete:
        id === "quiz"
          ? !!progress?.quizSolved
          : id === "first-capture"
            ? captures.length > 0
            : captures.some((c) => c.mun !== null && cities.includes(c.mun)),
      claimed: progress?.claimed.includes(id) ?? false,
    })),
  };
}
function participant(world: World, playerId: string, expectedDay: string, now: number) {
  const player = world.players[playerId];
  if (!player || !player.clubs[world.season])
    throw new Error("Entre e escolha seu clube para participar das missões.");
  if (expectedDay !== dayInBrasilia(now))
    throw new Error("As missões foram renovadas. Confira os objetivos de hoje.");
  return player;
}
export function answerDailyQuiz(
  world: World,
  playerId: string,
  day: string,
  questionId: string,
  answer: number,
  now: number,
): World {
  const player = participant(world, playerId, day, now);
  const quiz = quizForDay(day);
  if (questionId !== quiz.id)
    throw new Error("Esta pergunta não é a de hoje. Confira a nova missão.");
  if (!Number.isInteger(answer) || answer !== quiz.answer)
    throw new Error("Ainda não foi dessa vez. Tente outra alternativa; você não perde ações.");
  const progress =
    player.missions?.day === day ? player.missions : { day, quizSolved: false, claimed: [] };
  if (progress.quizSolved) return world;
  return {
    ...world,
    players: {
      ...world.players,
      [playerId]: { ...player, missions: { ...progress, quizSolved: true } },
    },
  };
}
export function claimDailyMission(
  world: World,
  playerId: string,
  day: string,
  missionId: MissionId,
  now: number,
): World {
  const player = participant(world, playerId, day, now);
  const mission = dailyMissions(world, player, now).missions.find((m) => m.id === missionId);
  if (!mission) throw new Error("Missão inválida.");
  if (mission.claimed) return world;
  if (!mission.complete) throw new Error("Conclua o objetivo antes de resgatar a recompensa.");
  const progress =
    player.missions?.day === day ? player.missions : { day, quizSolved: false, claimed: [] };
  return {
    ...world,
    players: {
      ...world.players,
      [playerId]: {
        ...player,
        extraActions: (player.extraActions ?? 0) + 1,
        missions: { ...progress, claimed: [...progress.claimed, missionId] },
      },
    },
  };
}
