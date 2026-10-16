import { createFileRoute } from "@tanstack/react-router";
import * as Dialog from "@radix-ui/react-dialog";
import { Activity, X } from "lucide-react";
import { ActivityFeed, NotificationBell, StateTicker } from "@/game/LivePanels";
import { useEffect, useState } from "react";
import { Map, BarChart3, Trophy, UserRound, ArrowUpRight } from "lucide-react";
import { MgGrid } from "@/components/MgGrid";
import { ClubCrest } from "@/game/ClubCrest";
import { useGame } from "@/game/use-game";
import { GamePanel, PlayerDialog, RankingTable } from "@/game/GamePanels";
import { CLUBS, clubById, ranking, type Cell } from "@/game/model";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Soccer War Brasil — Sua cidade. Seu time. Seu território." },
      {
        name: "description",
        content: "Explore Minas Gerais no Soccer War Brasil. Sua cidade. Seu time. Seu território.",
      },
      { property: "og:title", content: "Soccer War Brasil" },
      { property: "og:description", content: "Sua cidade. Seu time. Seu território." },
    ],
  }),
  component: Index,
});
const tabs = [
  { id: "map", label: "Mapa", icon: Map },
  { id: "ranking", label: "Ranking", icon: BarChart3 },
  { id: "season", label: "Temporada", icon: Trophy },
  { id: "profile", label: "Perfil", icon: UserRound },
] as const;
function Index() {
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("map");
  const game = useGame();
  const [dialog, setDialog] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [city, setCity] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [toast, setToast] = useState("");
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);
  const enter = () => {
    game.clearError();
    setDialog(true);
  };
  const capture = async (cell: Cell) => {
    if (!game.player || !game.club) {
      enter();
      return;
    }
    if (await game.capture(cell)) setToast("Território conquistado!");
  };
  return (
    <main className="war-app">
      <header className="war-header">
        <a href="/" className="war-brand" aria-label="Soccer War Brasil — início">
          <img
            className="brand-original"
            src="/assets/soccer-war-logo.png"
            alt="Soccer War Brasil — Conquiste sua cidade, um quadrado por vez."
            width={2172}
            height={724}
          />
        </a>
        <div className="header-account">
          <span className="demo-caption">Demonstração local · dados deste navegador</span>
          <NotificationBell game={game} openLogin={enter} />
          <button
            className="account-button"
            disabled={!game.ready}
            onClick={() => (game.player ? setTab("profile") : enter())}
          >
            {game.player?.avatar ? (
              <img
                className="header-avatar"
                src={game.player.avatar}
                alt={`Foto de ${game.player.name}`}
              />
            ) : (
              <UserRound size={16} />
            )}
            {game.player?.name ?? "Entrar"}
          </button>
        </div>
      </header>
      <StateTicker />
      <div className="war-layout">
        <aside className="war-intro">
          <ActivityFeed game={game} />
        </aside>
        {tab === "map" && (
          <button className="activity-mobile-button" onClick={() => setActivityOpen(true)}>
            <Activity size={15} /> Atividade em Minas{" "}
            <span>
              {game.world?.captures.filter((c) => c.season === game.world!.season).length ?? 0}
            </span>
          </button>
        )}
        <section
          className="war-main"
          aria-label="Mapa territorial de Minas Gerais"
          hidden={tab !== "map"}
        >
          <div className="map-heading">
            <div>
              <span className="eyebrow">MAPA TERRITORIAL · DEMO LOCAL</span>
              <h2>
                MINAS GERAIS<span>MG</span>
              </h2>
            </div>
            <button
              className="map-player-action"
              disabled={!game.ready}
              onClick={() => (!game.player || !game.club ? enter() : setTab("profile"))}
            >
              {game.club && <ClubCrest club={game.club} />}
              {game.club
                ? clubById(game.club).initials +
                  " · " +
                  (game.available ? "1 ação hoje" : "0 ações hoje")
                : "Escolher meu clube"}
            </button>
          </div>
          <div className="map-stage">
            <MgGrid
              territories={game.world?.territories}
              playerClub={game.club}
              available={game.available}
              pending={game.pending}
              ready={game.ready}
              onCapture={capture}
              onMunicipalityChange={setCity}
              onMunicipalities={setCities}
              onMunicipalRanking={() => setTab("ranking")}
            />
          </div>
          <div className="map-footer">
            <span>
              <i /> Território neutro
            </span>
            {CLUBS.map((club) => (
              <span key={club.id}>
                <ClubCrest club={club.id} />
                {club.name}
              </span>
            ))}
            <span className="legend-scale">Células ≈ 500 m</span>
          </div>
        </section>
        {tab !== "map" && (
          <GamePanel
            tab={tab}
            game={game}
            city={city}
            cities={cities}
            setCity={setCity}
            openLogin={enter}
            openClubs={enter}
            openMap={() => setTab("map")}
          />
        )}
        <aside className="war-sidebar">
          <div className="side-card">
            <span className="eyebrow">{city || "MINAS GERAIS"}</span>
            <h3>{city ? "Disputa na cidade." : "O domínio do estado."}</h3>
            {game.world && (
              <RankingTable rows={ranking(game.world.territories, city || undefined)} />
            )}
            <button className="text-button" onClick={() => setTab("ranking")}>
              Ver ranking completo
            </button>
            <p>Busque um dos 853 municípios de Minas e aproxime para explorar cada quadrado.</p>
            <div className="side-steps">
              <span>
                <b>01</b> Encontre sua cidade
              </span>
              <span>
                <b>02</b> Aproxime o mapa
              </span>
              <span>
                <b>03</b> Toque em um território
              </span>
            </div>
          </div>
        </aside>
      </div>
      <nav className="war-nav" aria-label="Navegação principal">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            aria-current={tab === id ? "page" : undefined}
            onClick={() => setTab(id)}
          >
            <Icon size={21} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <Dialog.Root open={activityOpen} onOpenChange={setActivityOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="game-dialog-overlay" />
          <Dialog.Content className="game-dialog activity-dialog">
            <Dialog.Title className="sr-only">Atividade em Minas Gerais</Dialog.Title>
            <Dialog.Description className="sr-only">
              Conquistas recentes desta temporada neste navegador.
            </Dialog.Description>
            <Dialog.Close className="dialog-close" aria-label="Fechar atividade">
              <X size={20} />
            </Dialog.Close>
            <ActivityFeed game={game} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <PlayerDialog open={dialog} onOpenChange={setDialog} game={game} />
      {toast && (
        <div className="game-toast" role="status">
          {toast}
        </div>
      )}
      {game.error && !dialog && (
        <div className="global-error" role="alert">
          {game.error}
          <button onClick={game.clearError}>Fechar</button>
        </div>
      )}
    </main>
  );
}
