import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import BigDropzone from "@/components/BigDropzone";
import MomentList from "@/components/MomentList";
import type { Client, FeedbackMoment } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = supabaseAdmin();

  const { data: client } = await supabase.from("clients").select("*").eq("id", id).single();

  if (!client) notFound();

  const { data: moments } = await supabase
    .from("feedback_moments")
    .select("*")
    .eq("client_id", id)
    .order("date", { ascending: false });

  const typedClient = client as Client;

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <Link href="/" className="font-mono text-xs font-bold">
        Terug
      </Link>

      <div className="flex items-start justify-between gap-4 mt-3">
        <h1 className="font-display text-5xl">{typedClient.name}</h1>
        {typedClient.website_url && (
          <a
            href={typedClient.website_url}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-sm border border-line px-4 py-2 whitespace-nowrap"
          >
            Naar website ↗
          </a>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        {typedClient.tags.map((tag) => (
          <span key={tag} className="bg-ink text-paper text-xs font-mono px-2 py-1">
            {tag}
          </span>
        ))}
      </div>

      {typedClient.description && (
        <p className="font-mono text-sm text-ink-faint mt-2">{typedClient.description}</p>
      )}

      <div className="mt-6">
        <BigDropzone variant="client" clientId={typedClient.id} />
      </div>

      <div className="mt-8">
        <MomentList clientId={typedClient.id} moments={(moments as FeedbackMoment[]) ?? []} />
      </div>
    </main>
  );
}
