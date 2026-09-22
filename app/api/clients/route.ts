import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("last_updated", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ clients: data });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const name: string = (body.name || "Nieuwe klant").trim() || "Nieuwe klant";
  const tags: string[] = Array.isArray(body.tags) ? body.tags : [];
  const description: string | null = body.description ?? null;
  const website_url: string | null = body.website_url ?? null;

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("clients")
    .insert({ name, tags, description, website_url })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ client: data });
}
