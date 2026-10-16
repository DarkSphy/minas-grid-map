import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, ArrowUpRight, LogOut, Shield, Trophy } from "lucide-react";
import {
  dayInBrasilia,
  DAILY_CAPTURE_LIMIT,
  CLUBS,
  clubById,
  countdown,
  nextFreeAction,
  ranking,
  seasonEnds,
  type RankingRow,
} from "./model";
import { AvatarInput } from "./AvatarInput";
import { ClubCrest } from "./ClubCrest";
import type { Game } from "./use-game";

export function RankingTable({ rows }: { rows: RankingRow[] }) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  return (
    <div className="ranking-table">
      {rows.map((row) => {
        const club = clubById(row.club);
        return (
          <div className="ranking-row" key={row.club}>
            <span className="rank-position">{row.position}</span>
            <ClubCrest club={club.id} />
            <div>
              <strong>{club.name}</strong>
              <div className="rank-track">
                <span
                  style={{
                    width: `${total ? (row.count / total) * 100 : 0}%`,
                    background: club.color,
                  }}
                />
              </div>
            </div>
            <span className="rank-total">
              <b>{row.count.toLocaleString("pt-BR")}</b>
              <small>territórios</small>
            </span>
          </div>
        );
      })}
    </div>
  );
}
export function GamePanel({
  tab,
  game,
  city,
  cities,
  setCity,
  openLogin,
  openClubs,
  openMap,
}: {
  tab: "ranking" | "season" | "profile";
  game: Game;
  city: string;
  cities: string[];
  setCity: (city: string) => void;
  openLogin: () => void;
  openClubs: () => void;
  openMap: () => void;
}) {
  const { world, player, club, now } = game;
  if (!world)
    return (
      <section className="war-panel">
        <h2>Carregando o jogo…</h2>
        {game.error && <p role="alert">{game.error}</p>}
        <button className="war-secondary" onClick={() => void game.refresh()}>
          Tentar novamente
        </button>
      </section>
    );
  const rows = ranking(world.territories, tab === "ranking" ? city || undefined : undefined);
  const leaders = rows.filter((r) => r.count > 0 && r.position === 1);
  const captures = world.captures.filter((c) => c.playerId === player?.id);
  const seasonCaptures = captures.filter((c) => c.season === world.season);
  const owned = Object.values(world.territories).filter((t) => t.playerId === player?.id);
  return (
    <section className="war-panel game-panel" aria-labelledby="panel-title">
      <span className="eyebrow">DEMONSTRAÇÃO LOCAL · TEMPORADA {world.season}</span>
      {tab === "ranking" && (
        <>
          <h2 id="panel-title">RANKING</h2>
          <p>Territórios controlados agora, calculados pelas conquistas deste navegador.</p>
          <label className="game-field">
            Região
            <select value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="">Todo o estado de Minas Gerais</option>
              {cities.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
          <h3 className="section-title">{city ? `${city} · MG` : "Minas Gerais"}</h3>
          <RankingTable rows={rows} />
          {!rows.some((r) => r.count) && (
            <p className="empty-message">
              Nenhum território conquistado {city ? "nesta cidade" : "nesta temporada"}. O primeiro
              pode ser seu.
            </p>
          )}
        </>
      )}
      {tab === "season" && (
        <>
          <h2 id="panel-title">MINAS EM DISPUTA</h2>
          <p>Temporada {world.season} · 14 dias</p>
          <div className="season-countdown">
            <span>ENCERRA EM</span>
            <strong>{countdown(seasonEnds(world) - now)}</strong>
            <small>
              {new Date(seasonEnds(world)).toLocaleString("pt-BR", {
                timeZone: "America/Sao_Paulo",
              })}{" "}
              · Brasília
            </small>
          </div>
          <div className="game-stats">
            <div>
              <b>{Object.keys(world.territories).length}</b>
              <span>territórios controlados</span>
            </div>
            <div>
              <b>{leaders.length === 1 ? <ClubCrest club={leaders[0]!.club} /> : "—"}</b>
              <span>
                {leaders.length > 1
                  ? "liderança empatada"
                  : leaders.length
                    ? "clube líder"
                    : "sem líder por enquanto"}
              </span>
            </div>
          </div>
          <RankingTable rows={rows} />
          <p className="help-text">
            Ao encerrar, o resultado é arquivado e o mapa da próxima temporada começa neutro. Você
            escolhe seu clube novamente.
          </p>
          <h3 className="section-title">Histórico de temporadas</h3>
          {!world.history.length ? (
            <p className="empty-message">A primeira temporada ainda está em andamento.</p>
          ) : (
            [...world.history].reverse().map((season) => {
              const winners = season.ranking.filter((r) => r.position === 1 && r.count > 0);
              return (
                <div className="history-row" key={season.number}>
                  <Trophy size={18} />
                  <div>
                    <strong>Temporada {season.number}</strong>
                    <span>
                      {winners.length
                        ? winners.map((r) => clubById(r.club).name).join(" / ")
                        : "Sem campeão: nenhum território conquistado"}{" "}
                      · {season.total} territórios
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </>
      )}
      {tab === "profile" && (
        <>
          <h2 id="panel-title">SEU PERFIL</h2>
          {!player ? (
            <>
              <p>
                Entre com um nome e qualquer senha de teste para escolher seu clube e conquistar
                territórios.
              </p>
              <button className="war-primary" disabled={!game.ready} onClick={openLogin}>
                ENTRAR OU CRIAR PERFIL <ArrowUpRight size={18} />
              </button>
            </>
          ) : (
            <>
              <div className="player-card">
                <span
                  className="player-avatar"
                  style={{ background: club ? clubById(club).color : "#294239" }}
                >
                  {player.avatar ? (
                    <img
                      className="profile-photo"
                      src={player.avatar}
                      alt={`Foto de ${player.name}`}
                    />
                  ) : club ? (
                    <ClubCrest club={club} />
                  ) : (
                    player.name[0]?.toUpperCase()
                  )}
                </span>
                <div>
                  <h3>{player.name}</h3>
                  <span>{club ? clubById(club).name : "Escolha seu clube nesta temporada"}</span>
                </div>
              </div>
              <AvatarInput
                value={player.avatar ?? null}
                disabled={game.pending}
                onChange={game.setAvatar}
              />
              {!club && (
                <button className="war-primary" onClick={openClubs}>
                  ESCOLHER MEU CLUBE <Shield size={18} />
                </button>
              )}
              <div className="game-stats">
                <div>
                  <b>{captures.length}</b>
                  <span>conquistas realizadas</span>
                </div>
                <div>
                  <b>{seasonCaptures.length}</b>
                  <span>conquistas na temporada</span>
                </div>
                <div>
                  <b>{owned.length}</b>
                  <span>territórios ainda sob seu controle</span>
                </div>
                <div>
                  <b>{game.balance}</b>
                  <span>ação gratuita disponível</span>
                </div>
              </div>
              <div className="panel-note">
                <strong>
                  {game.usedToday}/{DAILY_CAPTURE_LIMIT} conquistas hoje
                </strong>
                <span>
                  {game.limitReached
                    ? "Limite atingido. Seu saldo extra fica guardado."
                    : `${game.dailyRemaining} conquistas restantes no limite diário, incluindo ações compradas.`}
                </span>
              </div>
              <div className="panel-note">
                {player.lastActionDay !== dayInBrasilia(now)
                  ? "Sua ação gratuita de hoje está disponível."
                  : `Próxima ação em ${countdown(nextFreeAction(now) - now)}`}
                <span>Uma ação por dia, renovada à meia-noite de Brasília.</span>
              </div>
              {club && (
                <p className="help-text">
                  Você representa o {clubById(club).name} até o fim desta temporada.
                </p>
              )}
              <h3 className="section-title">Suas últimas conquistas</h3>
              {!captures.length ? (
                <p className="empty-message">Sua história começa no primeiro quadrado.</p>
              ) : (
                captures
                  .slice(-5)
                  .reverse()
                  .map((capture, i) => (
                    <div className="history-row" key={`${capture.claimedAt}-${i}`}>
                      <ClubCrest club={capture.club} className="history-crest" />
                      <div>
                        <strong>{capture.mun ?? "Divisa municipal"}</strong>
                        <span>
                          MG · {capture.id} ·{" "}
                          {new Date(capture.claimedAt).toLocaleDateString("pt-BR", {
                            timeZone: "America/Sao_Paulo",
                          })}
                        </span>
                      </div>
                    </div>
                  ))
              )}
              <button className="war-secondary" onClick={game.logout}>
                <LogOut size={16} /> Sair deste perfil
              </button>
            </>
          )}
        </>
      )}
      <button className="war-secondary back-to-map" onClick={openMap}>
        Voltar ao mapa <ArrowUpRight size={16} />
      </button>
    </section>
  );
}
export function PlayerDialog({
  open,
  onOpenChange,
  game,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  game: Game;
}) {
  const [register, setRegister] = useState(false);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const selecting = !!game.player && !game.club;
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="game-dialog-overlay" />
        <Dialog.Content className="game-dialog">
          <Dialog.Close className="dialog-close" aria-label="Fechar">
            <X size={20} />
          </Dialog.Close>
          <span className="eyebrow">SOCCER WAR BRASIL · DEMONSTRAÇÃO</span>
          <Dialog.Title>
            {selecting ? "QUAL É A SUA TORCIDA?" : register ? "CRIE SEU PERFIL" : "ENTRE NO JOGO"}
          </Dialog.Title>
          <Dialog.Description>
            {selecting
              ? "Escolha o clube que você vai representar até o fim da temporada. A escolha fica bloqueada até o próximo campeonato."
              : "Use qualquer nome e uma senha de teste. Esta entrada é simulada; nenhuma senha é salva ou enviada."}
          </Dialog.Description>
          {selecting ? (
            <div className="club-picker">
              {CLUBS.map((club) => (
                <button
                  disabled={game.pending}
                  key={club.id}
                  onClick={async () => {
                    if (await game.choose(club.id)) onOpenChange(false);
                  }}
                >
                  <ClubCrest club={club.id} />
                  <strong>{club.name}</strong>
                  <ArrowUpRight size={18} />
                </button>
              ))}
            </div>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!password) return;
                if (await game.login(name, avatar)) {
                  setPassword("");
                  setAvatar(null);
                  if (
                    game.world?.players[
                      `demo:${name.trim().replace(/\s+/g, " ").slice(0, 48).toLocaleLowerCase("pt-BR")}`
                    ]?.clubs[game.world.season]
                  )
                    onOpenChange(false);
                }
              }}
            >
              <AvatarInput
                value={avatar}
                onChange={setAvatar}
                onBusyChange={setPhotoBusy}
                disabled={game.pending}
              />
              <label className="game-field">
                Nome ou apelido
                <input
                  autoFocus
                  autoComplete="off"
                  maxLength={48}
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Como sua torcida vai conhecer você?"
                />
              </label>
              <label className="game-field">
                Senha de teste
                <input
                  type="password"
                  autoComplete="off"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Qualquer valor — não use sua senha real"
                />
              </label>
              <button className="war-primary" disabled={game.pending || !game.ready || photoBusy}>
                {game.pending ? "ENTRANDO…" : register ? "CRIAR PERFIL DE TESTE" : "ENTRAR"}
                <ArrowUpRight size={18} />
              </button>
              <button className="text-button" type="button" onClick={() => setRegister(!register)}>
                {register ? "Já tenho um perfil de teste" : "Criar um perfil de teste"}
              </button>
            </form>
          )}
          {game.error && (
            <p className="game-error" role="alert">
              {game.error}
            </p>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
