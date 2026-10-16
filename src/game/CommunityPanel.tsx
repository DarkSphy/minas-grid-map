import { useState } from "react";
import { ShoppingBag, Trophy, UserRound, X, ArrowUpRight } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  DAILY_CAPTURE_LIMIT,
  ACTION_PACKS,
  CLUBS,
  clubById,
  countdown,
  nextFreeAction,
  municipalPodiums,
  type ClubId,
} from "./model";
import { ClubCrest } from "./ClubCrest";
import type { Game } from "./use-game";
const money = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export function CommunityPanel({
  tab,
  game,
  openLogin,
  openMap,
}: {
  tab: "shop" | "supporters";
  game: Game;
  openLogin: () => void;
  openMap: () => void;
}) {
  const [club, setClub] = useState<ClubId>(game.club ?? "cruzeiro");
  const [checkout, setCheckout] = useState<(typeof ACTION_PACKS)[number] | null>(null);
  const [orderId, setOrderId] = useState("");
  const [success, setSuccess] = useState("");
  const podiums = game.world ? municipalPodiums(game.world) : [];
  const members = Object.values(game.world?.players ?? {})
    .filter((p) => p.clubs[game.world?.season ?? 1] === club)
    .map((player) => ({
      player,
      awards: podiums.filter((p) => p.playerId === player.id),
      owned: Object.values(game.world?.territories ?? {}).filter((t) => t.playerId === player.id)
        .length,
    }))
    .sort((a, b) => b.owned - a.owned || a.player.name.localeCompare(b.player.name, "pt-BR"));
  return (
    <section className="war-panel game-panel community-panel">
      <span className="eyebrow">SOCCER WAR BRASIL · {tab === "shop" ? "LOJA" : "TORCIDA"}</span>
      <h2>{tab === "shop" ? "MAIS CORES EM CAMPO." : "QUEM FAZ A TORCIDA."}</h2>
      {tab === "shop" ? (
        <>
          <p>
            Escolha seu próximo avanço. Cada pixel equivale a uma ação para conquistar um quadrado
            neutro ou rival.
          </p>
          <div className="shop-balance">
            <ShoppingBag size={24} />
            <div>
              <strong>{game.balance} ações disponíveis</strong>
              <span>
                {game.usedToday}/{DAILY_CAPTURE_LIMIT} conquistas hoje · {game.dailyRemaining}{" "}
                restantes no limite diário.
              </span>
            </div>
          </div>
          <p className="demo-commerce">
            Loja demonstrativa · Pix ainda não conectado. Nenhuma cobrança é feita.
          </p>
          <p className="shop-limit-note">
            <strong>
              Limite de {DAILY_CAPTURE_LIMIT} conquistas por dia, incluindo ações compradas.
            </strong>{" "}
            O saldo excedente fica guardado. Comprar um pacote não aumenta o limite de hoje.
          </p>
          <div className="pack-grid">
            {ACTION_PACKS.map((pack, i) => (
              <article className={`action-pack pack-${i}`} key={pack.id}>
                <span className="eyebrow">{pack.name}</span>
                <div className="pack-pixels" aria-hidden="true">
                  {Array.from({ length: i + 3 }, (_, n) => (
                    <i key={n} />
                  ))}
                </div>
                <h3>
                  {pack.actions}
                  <small>pixels / ações</small>
                </h3>
                <strong className="pack-price">{money(pack.cents)}</strong>
                <span className="pack-unit">R$ 0,98 por ação · Pix</span>
                <button
                  className="war-primary"
                  disabled={game.pending || !game.ready}
                  onClick={() => {
                    if (!game.player) return openLogin();
                    setSuccess("");
                    setOrderId(crypto.randomUUID());
                    setCheckout(pack);
                  }}
                >
                  VER PACOTE <ArrowUpRight size={16} />
                </button>
              </article>
            ))}
          </div>
          <p className="help-text">
            Mesmo preço por ação em todos os pacotes. O saldo extra permanece entre temporadas; a
            ação diária é usada primeiro.
          </p>
          {success && (
            <p className="panel-note" role="status">
              {success}
            </p>
          )}
          <Dialog.Root
            open={!!checkout}
            onOpenChange={(open) => {
              if (!open && !game.pending) setCheckout(null);
            }}
          >
            <Dialog.Portal>
              <Dialog.Overlay className="game-dialog-overlay" />
              <Dialog.Content className="game-dialog">
                <Dialog.Close
                  className="dialog-close"
                  aria-label="Fechar pacote"
                  disabled={game.pending}
                >
                  <X size={20} />
                </Dialog.Close>
                <span className="eyebrow">PIX · PRÉVIA DE COMPRA</span>
                <Dialog.Title>{checkout?.name}</Dialog.Title>
                <Dialog.Description>
                  {checkout?.actions} ações por {checkout ? money(checkout.cents) : ""}. Esta é uma
                  simulação local, sem pagamento real.
                </Dialog.Description>
                <p className="shop-limit-note">
                  Limite de {DAILY_CAPTURE_LIMIT} conquistas por dia. Você já fez {game.usedToday}{" "}
                  hoje; pode usar até {game.dailyRemaining} ações hoje. O restante do pacote fica no
                  saldo para os próximos dias.
                </p>
                <div className="pix-preview">
                  <ShoppingBag size={34} />
                  <strong>Pix disponível na próxima integração</strong>
                  <p>
                    Após conectar o pagamento, o QR Code e o código copia e cola aparecerão aqui. As
                    ações serão liberadas após confirmação pelo servidor.
                  </p>
                </div>
                <button
                  className="war-primary"
                  disabled={game.pending}
                  onClick={async () => {
                    if (checkout && (await game.demoPack(checkout.id, orderId))) {
                      setSuccess(
                        `${checkout.actions} ações de teste adicionadas. Nenhum pagamento foi realizado.`,
                      );
                      setCheckout(null);
                    }
                  }}
                >
                  SIMULAR COMPRA — SEM COBRANÇA
                </button>
                {game.error && <p role="alert">{game.error}</p>}
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </>
      ) : (
        <>
          <p>
            Os nomes que representam cada clube nesta temporada. Troféus acompanham o controle atual
            de territórios em cada município.
          </p>
          <div className="supporter-clubs">
            {CLUBS.map((c) => (
              <button key={c.id} aria-pressed={club === c.id} onClick={() => setClub(c.id)}>
                <ClubCrest club={c.id} />
                {c.name}
              </button>
            ))}
          </div>
          <div className="podium-guide">
            <span className="award gold">
              <Trophy size={17} /> Ouro · 1º
            </span>
            <span className="award silver">
              <Trophy size={17} /> Prata · 2º
            </span>
            <span className="award bronze">
              <Trophy size={17} /> Bronze · 3º
            </span>
          </div>
          <p className="help-text">
            Contam os quadrados ainda controlados, entre todos os jogadores do município. Empates
            recebem a mesma posição, sem desempate por dinheiro ou antiguidade. Troféus são
            recalculados após cada conquista e zeram na nova temporada.
          </p>
          <h3 className="section-title">
            {clubById(club).name} · {members.length} torcedores
          </h3>
          <div className="supporter-list">
            {members.map(({ player, awards, owned }) => (
              <article
                className={`supporter-card ${awards.length ? "has-award" : ""}`}
                key={player.id}
              >
                <span className="supporter-avatar">
                  {player.avatar ? (
                    <img src={player.avatar} alt={`Foto de ${player.name}`} />
                  ) : (
                    <UserRound />
                  )}
                </span>
                <div>
                  <strong>
                    {player.name}
                    {player.id === game.player?.id && <small> · você</small>}
                  </strong>
                  <p>{owned} territórios sob controle</p>
                  <div className="supporter-awards">
                    {awards.map((a) => (
                      <span
                        className={`award ${["", "gold", "silver", "bronze"][a.position]}`}
                        key={a.city}
                      >
                        <Trophy size={14} />
                        {a.city} · {a.position}º · {a.count}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
          {!members.length && (
            <p className="empty-message">
              Esta torcida ainda não tem perfis neste navegador. Entre e vista a camisa.
            </p>
          )}
          <p className="help-text">
            Na demonstração, aparecem os cadastros deste navegador. A conexão com Supabase reunirá
            os torcedores de todos os dispositivos.
          </p>
        </>
      )}
      <button className="war-secondary back-to-map" onClick={openMap}>
        Voltar ao mapa <ArrowUpRight size={16} />
      </button>
    </section>
  );
}
