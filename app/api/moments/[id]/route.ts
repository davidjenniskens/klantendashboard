import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = supabaseAdmin();
  const { data, error } = await supabase.from("feedback_moments").select("*").eq("id", id).single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ moment: data });
}

const PATCHABLE = [
  "title",
  "original_images",
  "motivation_original",
  "feedback_text",
  "new_images",
  "motivation_new",
  "reflection_text",
  "body_text",
] as const;

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const patch: Record<string, unknown> = {};
  for (const key of PATCHABLE) {
    if (key in body) patch[key] = body[key];
  }
  patch.updated_at = new Date().toISOString();

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("feedback_moments")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase
    .from("clients")
    .update({ last_updated: new Date().toISOString() })
    .eq("id", data.client_id);

  return NextResponse.json({ moment: data });
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = supabaseAdmin();
  const { error } = await supabase.from("feedback_moments").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
