import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";

// Daily keep-alive (see vercel.json crons): one tiny read counts as activity,
// so the Supabase free project never auto-pauses during a quiet week.
export async function GET() {
  try {
    const supabase = await createClient();
    // Reads `profiles` rather than the old public_profiles view — that view only
    // exists in the retired creator-era migration, so it 404s on a fresh project.
    const { error } = await supabase.from("profiles").select("id").limit(1);
    return NextResponse.json({ ok: !error });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
