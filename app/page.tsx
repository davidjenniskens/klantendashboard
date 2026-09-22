import { supabaseAdmin } from "@/lib/supabaseAdmin";
import ClientGrid from "@/components/ClientGrid";
import BigDropzone from "@/components/BigDropzone";
import type { Client, FeedbackMoment } from "@/lib/types";
import type { RecentMoment } from "@/components/ClientCard";

export const dynamic = "force-dynamic";

async function getData() {
  const supabase = supabaseAdmin();
  const { data: clients, error } = await supabase
    .from("clients")
    .select("*")
    .order("last_updated", { ascending: false });

  const recentMomentsByClient: Record<string, RecentMoment[]> = {};

  for (const client of (clients as Client[]) ?? []) {
    const { data: moments } = await supabase
      .from("feedback_moments")
      .select("id, title, date")
      .eq("client_id", client.id)
      .order("date", { ascending: false })
      .limit(3);

    recentMomentsByClient[client.id] = (
      (moments as Pick<FeedbackMoment, "id" | "title" | "date">[]) ?? []
    ).map((m) => ({ id: m.id, title: m.title, date: m.date }));
  }

  return {
    clients: (clients as Client[]) ?? [],
    recentMomentsByClient,
    error: error?.message ?? null,
  };
}

export default async function DashboardPage() {
  const { clients, recentMomentsByClient, error } = await getData();

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="font-display text-4xl mb-6">
        Hey <span className="italic">David</span>
      </h1>
      {error && (
        <p className="border border-accent text-accent text-sm px-4 py-3 mb-6">
          Kon geen verbinding maken met de database: {error}
        </p>
      )}
      <BigDropzone variant="dashboard" />
      <ClientGrid clients={clients} recentMomentsByClient={recentMomentsByClient} />
    </main>
  );
}
