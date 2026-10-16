import { useState } from "react";
import { Target, Check, ArrowUpRight, MapPin, Trophy, BookOpen, Flag } from "lucide-react";
import { DAILY_CAPTURE_LIMIT, countdown, nextFreeAction } from "./model";
import type { MissionId } from "./mission-content";
import type { Game } from "./use-game";
const labels = {
  "first-capture": {
    title: "Vista a camisa",
    description: "Faça sua primeira conquista do dia em qualquer município.",
    icon: Flag,
  },
  quiz: {
    title: "Conheça o campo",
    description: "Responda à pergunta do dia. Pode tentar novamente sem perder ações.",
    icon: BookOpen,
  },
  "support-city": {
    title: "Missão da torcida",
    description: "Conquiste um quadrado neutro ou rival em uma das cidades de hoje.",
    icon: Target,
  },
};
export function MissionsPanel({
  game,
  openLogin,
  openMap,
}: {
  game: Game;
  openLogin: () => void;
  openMap: (city?: string) => void;
}) {
  const [message, setMessage] = useState("");
  const missions = game.missions;
  const eligible = !!game.player && !!game.club;
  const claimed = missions?.missions.filter((m) => m.claimed).length ?? 0;
  async function claim(id: MissionId) {
    if (missions && (await game.claimMission(id, missions.day)))
      setMessage("Recompensa resgatada: +1 ação no seu saldo!");
  }
  return (
    <section className="war-panel game-panel missions-panel" aria-labelledby="missions-title">
      <span className="eyebrow">CENTRAL DE MISSÕES · DEMONSTRAÇÃO LOCAL</span>
      <h2 id="missions-title">SUA TORCIDA CONTA COM VOCÊ.</h2>
      <p>Uma ação gratuita e até três por missões a cada dia. Escolha onde ajudar seu clube.</p>
      <div className="mission-summary">
        <div>
          <span>CONQUISTAS HOJE</span>
          <strong>
            {game.usedToday}
            <small> / {DAILY_CAPTURE_LIMIT}</small>
          </strong>
          <p>
            {game.limitReached
              ? "Limite de hoje atingido. Seu saldo extra continua guardado."
              : `${game.dailyRemaining} conquistas restantes no limite de hoje.`}
          </p>
        </div>
        <div>
          <span>SALDO DE AÇÕES</span>
          <strong>{game.balance}</strong>
          <p>Gratuita disponível + extras acumuladas.</p>
        </div>
      </div>
      <div className="mission-refresh">
        <span>
          <Trophy size={16} /> {claimed}/3 recompensas resgatadas
        </span>
        <span>Renova em {countdown(nextFreeAction(game.now) - game.now)} · Brasília</span>
      </div>
      <progress
        className="mission-progress"
        value={claimed}
        max={3}
        aria-label="Recompensas diárias resgatadas"
      />
      {!eligible && (
        <div className="panel-note">
          <strong>
            {game.player
              ? "Escolha sua torcida para participar."
              : "Entre para começar suas missões."}
          </strong>
          <button className="war-primary" disabled={!game.ready} onClick={openLogin}>
            {game.player ? "ESCOLHER CLUBE" : "ENTRAR NO JOGO"}
            <ArrowUpRight size={16} />
          </button>
        </div>
      )}
      <div className="mission-cards">
        {missions?.missions.map((mission) => {
          const content = labels[mission.id];
          const Icon = content.icon;
          return (
            <article
              className={`mission-card ${mission.claimed ? "is-claimed" : mission.complete ? "is-complete" : ""}`}
              key={`${missions.day}:${game.player?.id}:${mission.id}`}
            >
              <div className="mission-card-heading">
                <span className="mission-icon">
                  <Icon size={21} />
                </span>
                <div>
                  <h3>{content.title}</h3>
                  <span className="mission-status">
                    {mission.claimed
                      ? "Recompensa resgatada"
                      : mission.complete
                        ? "Concluída · pronta para resgatar"
                        : "Em andamento"}
                  </span>
                </div>
                <span className="mission-reward">+1 ação</span>
              </div>
              <p>{content.description}</p>
              {mission.id === "quiz" && <Quiz game={game} disabled={!eligible || game.pending} />}
              {mission.id === "support-city" && (
                <>
                  <div className="mission-city-list">
                    {missions.cities.map((city) => (
                      <button key={city} className="mission-city" onClick={() => openMap(city)}>
                        <MapPin size={14} />
                        {city}
                        <ArrowUpRight size={14} />
                      </button>
                    ))}
                  </div>
                  <p className="help-text">
                    Escolha qualquer uma. As opções alternam diariamente e valem para todas as
                    torcidas.
                  </p>
                </>
              )}
              <div className="mission-card-footer">
                <span>
                  {mission.complete ? (
                    <>
                      <Check size={14} /> Objetivo concluído
                    </>
                  ) : (
                    "Progresso 0/1"
                  )}
                </span>
                {mission.complete ? (
                  <button
                    className={mission.claimed ? "war-secondary" : "war-primary"}
                    disabled={mission.claimed || game.pending || !eligible}
                    onClick={() => void claim(mission.id)}
                  >
                    {mission.claimed ? "RESGATADO" : "RESGATAR +1 AÇÃO"}
                  </button>
                ) : mission.id !== "quiz" ? (
                  <button
                    className="war-secondary"
                    onClick={() =>
                      openMap(mission.id === "support-city" ? missions.cities[0] : undefined)
                    }
                  >
                    IR AO MAPA <ArrowUpRight size={14} />
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
      {message && (
        <p className="panel-note" role="status">
          {message}
        </p>
      )}
      <p className="help-text">
        Cada missão vale uma recompensa por dia. Resgate antes da virada; recompensas não resgatadas
        expiram. Uma conquista pode completar os dois objetivos territoriais. Missões não exigem
        compras. Ações resgatadas ficam no saldo extra, usado depois da gratuita. O limite de oito
        conquistas inclui todas as origens; renova à meia-noite de Brasília.
      </p>
      <button className="war-secondary back-to-map" onClick={() => openMap()}>
        Voltar ao mapa <ArrowUpRight size={16} />
      </button>
    </section>
  );
}
function Quiz({ game, disabled }: { game: Game; disabled: boolean }) {
  const daily = game.missions;
  const [answer, setAnswer] = useState<number | null>(null);
  if (!daily) return null;
  return (
    <div className="daily-quiz" key={daily.day}>
      <fieldset disabled={disabled || daily.quizSolved}>
        <legend>{daily.quiz.question}</legend>
        {daily.quiz.options.map((option, index) => (
          <label key={option}>
            <input
              type="radio"
              name={`quiz-${daily.day}`}
              checked={daily.quizSolved ? daily.quiz.answer === index : answer === index}
              onChange={() => {
                setAnswer(index);
                game.clearError();
              }}
              value={index}
            />
            <span>{option}</span>
          </label>
        ))}
      </fieldset>
      {daily.quizSolved ? (
        <p className="quiz-explanation">
          <Check size={16} />
          {daily.quiz.explanation}
        </p>
      ) : (
        <button
          className="war-secondary"
          disabled={disabled || answer === null}
          onClick={() => {
            if (answer !== null) void game.answerQuiz(daily.day, daily.quiz.id, answer);
          }}
        >
          CONFIRMAR RESPOSTA
        </button>
      )}
    </div>
  );
}
