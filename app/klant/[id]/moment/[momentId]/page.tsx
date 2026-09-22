import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import OntwerpdossierEmbed from "@/components/OntwerpdossierEmbed";
import UpdateEmbed from "@/components/UpdateEmbed";
import type { Client, FeedbackMoment } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MomentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; momentId: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { id, momentId } = await params;
  const { view } = await searchParams;
  const supabase = supabaseAdmin();

  const { data: client } = await supabase.from("clients").select("*").eq("id", id).single();

  const { data: moment } = await supabase
    .from("feedback_moments")
    .select("*")
    .eq("id", momentId)
    .single();

  if (!client || !moment) notFound();

  const typedMoment = moment as FeedbackMoment;

  if (typedMoment.type === "update") {
    return (
      <UpdateEmbed
        moment={typedMoment}
        clientId={id}
        clientName={(client as Client).name}
        initialView={view === "preview" ? "preview" : "edit"}
      />
    );
  }

  return (
    <OntwerpdossierEmbed
      moment={typedMoment}
      clientId={id}
      clientName={(client as Client).name}
      initialView={view === "preview" ? "preview" : "edit"}
    />
  );
}
