import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Map, BarChart3, Trophy, UserRound, ArrowUpRight } from "lucide-react";
import { MgGrid } from "@/components/MgGrid";

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
        <span className="header-tagline">Minas Gerais</span>
      </header>
      <div className="war-layout">
        <aside className="war-intro">
          <h1>
            MINAS
            <br />É O NOSSO
            <br />
            <em>TERRITÓRIO.</em>
          </h1>
          <p>
            A rivalidade sai das arquibancadas e chega ao mapa. Encontre sua cidade. Conheça o campo
            da próxima disputa.
          </p>
          <div className="intro-rule" />
          <div className="intro-number">
            <strong>853</strong>
            <span>
              municípios.
              <br />
              Uma paixão em comum.
            </span>
          </div>
          <div className="club-colors" aria-label="Cruzeiro, Atlético Mineiro e América Mineiro">
            <i />
            <i />
            <i />
          </div>
          <span className="intro-caption">TRÊS TORCIDAS. UM ESTADO INTEIRO.</span>
        </aside>
        <section
          className="war-main"
          aria-label="Mapa territorial de Minas Gerais"
          hidden={tab !== "map"}
        >
          <div className="map-heading">
            <div>
              <span className="eyebrow">MAPA TERRITORIAL</span>
              <h2>
                MINAS GERAIS<span>MG</span>
              </h2>
            </div>
          </div>
          <div className="map-stage">
            <MgGrid />
          </div>
          <div className="map-footer">
            <span>
              <i /> Território neutro
            </span>
            <span>Malha atual ≈ 500 × 500 m</span>
          </div>
        </section>
        {tab !== "map" && (
          <section className="war-panel" aria-labelledby="panel-title">
            <span className="eyebrow">EM DESENVOLVIMENTO</span>
            {tab === "ranking" && (
              <>
                <h2 id="panel-title">RANKING</h2>
                <p>
                  O ranking estadual e os rankings por cidade serão calculados a partir das
                  conquistas reais. A disputa ainda não começou.
                </p>
                <div className="club-preview">
                  <span>
                    <i className="blue" />
                    Cruzeiro
                  </span>
                  <span>
                    <i className="black" />
                    Atlético Mineiro
                  </span>
                  <span>
                    <i className="green" />
                    América Mineiro
                  </span>
                </div>
              </>
            )}
            {tab === "season" && (
              <>
                <h2 id="panel-title">TEMPORADAS</h2>
                <p>
                  Temporadas de 14 dias. Um estado para disputar. A primeira temporada ainda não tem
                  data de início.
                </p>
                <div className="panel-note">
                  Primeira temporada<span>Data de início a definir.</span>
                </div>
              </>
            )}
            {tab === "profile" && (
              <>
                <h2 id="panel-title">SEU PERFIL</h2>
                <p>
                  Em breve você poderá entrar, escolher seu clube e acompanhar sua participação.
                  Nesta primeira etapa, explore o mapa sem cadastro.
                </p>
                <div className="panel-note">
                  Seu perfil estará disponível após o cadastro.
                  <span>Login e escolha do clube chegam na próxima fase.</span>
                </div>
              </>
            )}
            <button className="war-primary" onClick={() => setTab("map")}>
              EXPLORAR MINAS GERAIS <ArrowUpRight size={19} />
            </button>
          </section>
        )}
        <aside className="war-sidebar">
          <div className="side-card">
            <span className="eyebrow">COMO EXPLORAR</span>
            <h3>
              A sua cidade
              <br />
              está no jogo.
            </h3>
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
    </main>
  );
}
