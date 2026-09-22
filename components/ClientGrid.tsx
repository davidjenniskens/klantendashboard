import ClientCard, { type RecentMoment } from "./ClientCard";
import type { Client } from "@/lib/types";

export default function ClientGrid({
  clients,
  recentMomentsByClient,
}: {
  clients: Client[];
  recentMomentsByClient: Record<string, RecentMoment[]>;
}) {
  if (!clients.length) {
    return (
      <p className="font-mono text-sm text-ink-faint mt-8">
        Nog geen klanten. Sleep een screenshot in het vak hierboven om te beginnen.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
      {clients.map((client) => (
        <ClientCard
          key={client.id}
          client={client}
          recentMoments={recentMomentsByClient[client.id] ?? []}
        />
      ))}
    </div>
  );
}
