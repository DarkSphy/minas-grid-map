import { useMemo, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Bell, Pause, Play, X } from "lucide-react";
import { activityItems, notificationsFor } from "./activity";
import { ClubCrest } from "./ClubCrest";
import { clubById, dayInBrasilia } from "./model";
import type { Game } from "./use-game";
export function ActivityFeed({ game }: { game: Game }) {
  const events = useMemo(
    () =>
      game.world
        ? activityItems(game.world)
            .filter((event) => event.capture.season === game.world!.season)
            .slice(-20)
            .reverse()
        : [],
    [game.world],
  );
  const territoryCount = Object.keys(game.world?.territories ?? {}).length;
  return (
    <div className="activity-feed">
      <span className="eyebrow">MINAS GERAIS</span>
      <h2>Agora no estado</h2>
      <p className="activity-caption">Atualizações deste navegador</p>
      <div className="activity-list" aria-live="polite" aria-relevant="additions text">
        {!game.ready ? (
          <p>Carregando atualizações…</p>
        ) : !events.length ? (
          <div className="activity-empty">
            <strong>O primeiro território está à espera.</strong>
            <p>As conquistas de Minas aparecem aqui assim que acontecem.</p>
          </div>
        ) : (
          events.map(({ id, capture, previousClub }) => (
            <article className="activity-event" key={id}>
              <ClubCrest club={capture.club} />
              <div>
                <strong>{clubById(capture.club).name}</strong>
                <p>
                  {previousClub ? (
                    <>Tomou um território do {clubById(previousClub).name}</>
                  ) : (
                    "Conquistou um território"
                  )}{" "}
                  em <b>{capture.mun ?? "Minas Gerais"}</b>.
                </p>
                <span>
                  {game.world?.players[capture.playerId]?.name ?? "Torcedor"} ·{" "}
                  <time dateTime={new Date(capture.claimedAt).toISOString()}>
                    {new Date(capture.claimedAt).toLocaleTimeString("pt-BR", {
                      timeZone: "America/Sao_Paulo",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </span>
              </div>
            </article>
          ))
        )}
      </div>
      <div className="activity-season">
        Temporada {game.world?.season ?? 1}
        <span>
          {territoryCount.toLocaleString("pt-BR")}{" "}
          {territoryCount === 1 ? "território controlado" : "territórios controlados"}
        </span>
      </div>
    </div>
  );
}
export function NotificationBell({ game, openLogin }: { game: Game; openLogin: () => void }) {
  const day = dayInBrasilia(game.now);
  const notifications = useMemo(
    () =>
      game.world && game.player
        ? notificationsFor(game.world, game.player, Date.parse(`${day}T12:00:00-03:00`))
        : [],
    [game.world, game.player, day],
  );
  const read = new Set(game.player?.readNotifications ?? []);
  const unread = notifications.filter((n) => !read.has(n.id)).length;
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          className="notification-button"
          aria-label={
            unread
              ? `Notificações, ${unread} ${unread === 1 ? "não lida" : "não lidas"}`
              : "Notificações"
          }
        >
          <Bell size={21} />
          {unread > 0 && <span className="notification-count">{unread > 9 ? "9+" : unread}</span>}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="notification-popover"
          sideOffset={12}
          collisionPadding={12}
          align="end"
        >
          <div className="notification-heading">
            <h2>Notificações</h2>
            <Popover.Close aria-label="Fechar notificações">
              <X size={18} />
            </Popover.Close>
          </div>
          {!game.player ? (
            <>
              <p>Entre para acompanhar suas conquistas e receber avisos.</p>
              <Popover.Close asChild>
                <button className="war-secondary" onClick={openLogin}>
                  Entrar no jogo
                </button>
              </Popover.Close>
            </>
          ) : (
            <>
              <div className="notification-actions">
                <span>
                  {unread ? `${unread} ${unread === 1 ? "não lida" : "não lidas"}` : "Tudo em dia"}
                </span>
                <button
                  disabled={!unread || game.pending}
                  onClick={() => void game.markRead(notifications.map((n) => n.id))}
                >
                  Marcar todas como lidas
                </button>
              </div>
              <div className="notification-list">
                {notifications.map((n) => (
                  <article
                    key={n.id}
                    className={read.has(n.id) ? "notification-item" : "notification-item unread"}
                  >
                    {n.club && <ClubCrest club={n.club} />}
                    <div>
                      <strong>{n.title}</strong>
                      <p>{n.message}</p>
                      <time dateTime={new Date(n.at).toISOString()}>
                        {new Date(n.at).toLocaleString("pt-BR", {
                          timeZone: "America/Sao_Paulo",
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
          <small className="notification-footnote">
            Avisos locais do jogo · sem notificações do dispositivo
          </small>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
const demoStates = [
  {
    state: "Minas Gerais",
    uf: "MG",
    teams: [
      { name: "Cruzeiro", crest: "/assets/clubs/cruzeiro.png", share: 52 },
      { name: "Atlético-MG", crest: "/assets/clubs/atletico.svg", share: 38 },
    ],
  },
  {
    state: "São Paulo",
    uf: "SP",
    teams: [
      { name: "Palmeiras", crest: "/assets/ticker/palmeiras.png", share: 51 },
      { name: "Corinthians", crest: "/assets/ticker/corinthians.png", share: 37 },
    ],
  },
  {
    state: "Rio de Janeiro",
    uf: "RJ",
    teams: [
      { name: "Flamengo", crest: "/assets/ticker/flamengo.png", share: 46 },
      { name: "Fluminense", crest: "/assets/ticker/fluminense.png", share: 41 },
    ],
  },
  {
    state: "Rio Grande do Sul",
    uf: "RS",
    teams: [
      { name: "Grêmio", crest: "/assets/ticker/gremio.png", share: 54 },
      { name: "Internacional", crest: "/assets/ticker/internacional.png", share: 34 },
    ],
  },
];
export function StateTicker() {
  const [paused, setPaused] = useState(false);
  return (
    <section
      className={`state-ticker${paused ? " paused" : ""}`}
      aria-label="Letreiro demonstrativo de estados"
    >
      <div className="ticker-label">
        <b>PRÉVIA</b>
        <span>dados ilustrativos</span>
      </div>
      <div className="ticker-viewport">
        <div className="ticker-track">
          {[0, 1].map((copy) => (
            <div className="ticker-group" key={copy} aria-hidden={copy === 1 ? true : undefined}>
              {demoStates.map((state) => (
                <div className="ticker-state" key={state.uf}>
                  <strong title={state.state}>{state.uf}</strong>
                  {state.teams.map((team) => (
                    <span className="ticker-team" key={team.name}>
                      <img src={team.crest} alt={`Escudo do ${team.name}`} width={25} height={28} />
                      <span>{team.name}</span>
                      <b>{team.share}%</b>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <button
        className="ticker-pause"
        aria-label={paused ? "Retomar letreiro" : "Pausar letreiro"}
        aria-pressed={paused}
        onClick={() => setPaused(!paused)}
      >
        {paused ? <Play size={14} /> : <Pause size={14} />}
      </button>
    </section>
  );
}
