import { useState } from "react";
import { Camera, UserRound } from "lucide-react";
import { prepareAvatar } from "./avatar";
export function AvatarInput({
  value,
  onChange,
  disabled = false,
  onBusyChange,
}: {
  value: string | null;
  onChange: (value: string | null) => void | Promise<unknown>;
  disabled?: boolean;
  onBusyChange?: ((busy: boolean) => void) | undefined;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="avatar-input">
      <div className="avatar-preview">
        {value ? <img src={value} alt="Prévia da sua foto" /> : <UserRound size={28} />}
      </div>
      <div>
        <label className="photo-button">
          <Camera size={16} />
          {busy ? "Preparando foto…" : "Escolher foto"}
          <input
            aria-label="Escolher foto de perfil"
            disabled={disabled || busy}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setBusy(true);
              onBusyChange?.(true);
              setError("");
              try {
                await onChange(await prepareAvatar(file));
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : "Não foi possível abrir esta imagem.",
                );
              } finally {
                setBusy(false);
                onBusyChange?.(false);
              }
            }}
          />
        </label>
        <small>Opcional · PNG, JPG ou WebP · até 5 MB</small>
        {value && (
          <button
            className="text-button remove-photo"
            type="button"
            disabled={disabled || busy}
            onClick={() => void onChange(null)}
          >
            Remover foto
          </button>
        )}
      </div>
      {error && (
        <p className="game-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
