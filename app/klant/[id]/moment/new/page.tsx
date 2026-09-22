import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import OntwerpdossierEmbed from "@/components/OntwerpdossierEmbed";
import UpdateEmbed from "@/components/UpdateEmbed";
import type { Client, MomentType } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NewMomentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { id } = await params;
  const { type } = await searchParams;
  const momentType: MomentType = type === "update" ? "update" : "feedback";

  const supabase = supabaseAdmin();
  const { data: client } = await supabase.from("clients").select("*").eq("id", id).single();

  if (!client) notFound();

  const clientName = (client as Client).name;

  if (momentType === "update") {
    return <UpdateEmbed moment={null} clientId={id} clientName={clientName} />;
  }

  return <OntwerpdossierEmbed moment={null} clientId={id} clientName={clientName} />;
}
