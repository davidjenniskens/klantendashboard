import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const BUCKET = "feedback-images";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const file = form.get("file");
  const momentId = form.get("moment_id");

  if (!(file instanceof File) || typeof momentId !== "string") {
    return NextResponse.json({ error: "file en moment_id zijn verplicht" }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const ext = file.name.split(".").pop() || "png";
  const path = `${momentId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
