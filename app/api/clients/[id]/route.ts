import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = supabaseAdmin();
  const { data, error } = await supabase.from("clients").select("*").eq("id", id).single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ client: data });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string") patch.name = body.name;
  if (typeof body.description === "string" || body.description === null) patch.description = body.description;
  if (typeof body.website_url === "string" || body.website_url === null) patch.website_url = body.website_url;
  if (Array.isArray(body.tags)) patch.tags = body.tags;

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("clients")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ client: data });
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = supabaseAdmin();
  const { error } = await supabase.from("clients").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
