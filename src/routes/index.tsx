import { createFileRoute } from "@tanstack/react-router";
import { MgGrid } from "@/components/MgGrid";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Malha de Minas Gerais — 500 m × 500 m" },
      { name: "description", content: "Mapa interativo de Minas Gerais com grade de quadrados de 500 m." },
      { property: "og:title", content: "Malha de Minas Gerais — 500 m × 500 m" },
      { property: "og:description", content: "Mapa interativo de Minas Gerais com grade de quadrados de 500 m." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="flex h-screen flex-col gap-4 p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Minas Gerais · malha de pixels</h1>
        <p className="text-sm text-muted-foreground">Cada quadrado representa ~500 × 500 m do território real.</p>
      </header>
      <div className="min-h-0 flex-1">
        <MgGrid />
      </div>
    </main>
  );
}
