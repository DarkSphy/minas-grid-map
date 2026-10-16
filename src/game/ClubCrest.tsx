import { clubById, type ClubId, type RankingRow } from "./model";
export function ClubCrest({ club, className = "" }: { club: ClubId; className?: string }) {
  const team = clubById(club);
  return (
    <img
      src={team.crest}
      alt={`Escudo do ${team.name}`}
      className={`club-crest ${className}`}
      width={44}
      height={44}
      draggable={false}
    />
  );
}
export function MunicipalControl({
  city,
  rows,
}: {
  city: string | undefined;
  rows: RankingRow[] | undefined;
}) {
  if (!city)
    return (
      <div className="municipal-control">
        <p>Município não identificado nesta divisa.</p>
      </div>
    );
  const total = rows?.reduce((sum, row) => sum + row.count, 0) ?? 0;
  const leaders = rows?.filter((row) => row.position === 1 && row.count > 0) ?? [];
  return (
    <div className="municipal-control" aria-label={`Domínio de ${city}`}>
      <span className="municipal-label">
        {leaders.length > 1
          ? "Liderança municipal empatada"
          : leaders.length
            ? "Torcida líder no município"
            : "Município sem conquistas"}
      </span>
      {leaders.map((leader) => (
        <div className="municipal-leader" key={leader.club}>
          <ClubCrest club={leader.club} />
          <div>
            <strong>{clubById(leader.club).name}</strong>
            <small>
              {leader.count.toLocaleString("pt-BR")}{" "}
              {leader.count === 1 ? "território" : "territórios"} ·{" "}
              {((leader.count / total) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
              % dos conquistados
            </small>
          </div>
        </div>
      ))}
      {!total && <p>Nenhuma torcida controla territórios nesta cidade.</p>}
    </div>
  );
}
