import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get("client_id");
  if (!clientId) {
    return NextResponse.json({ error: "client_id is verplicht" }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("feedback_moments")
    .select("*")
    .eq("client_id", clientId)
    .order("date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ moments: data });
}

const OPTIONAL_INSERT_FIELDS = [
  "original_images",
  "motivation_original",
  "feedback_text",
  "new_images",
  "motivation_new",
  "reflection_text",
  "body_text",
] as const;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const client_id: string | undefined = body.client_id;
  if (!client_id) {
    return NextResponse.json({ error: "client_id is verplicht" }, { status: 400 });
  }
  const type: string = body.type === "update" ? "update" : "feedback";
  const defaultTitle = type === "update" ? "Nieuwe update" : "Nieuw feedbackmoment";
  const title: string = (body.title || defaultTitle).trim() || defaultTitle;

  const insertPayload: Record<string, unknown> = { client_id, title, type };
  for (const key of OPTIONAL_INSERT_FIELDS) {
    if (key in body) insertPayload[key] = body[key];
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("feedback_moments")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("clients").update({ last_updated: new Date().toISOString() }).eq("id", client_id);

  return NextResponse.json({ moment: data });
}
