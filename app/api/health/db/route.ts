import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";

// Daily keep-alive (see vercel.json crons): one tiny read counts as activity,
// so the Supabase free project never auto-pauses during a quiet week.
export async function GET() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("public_profiles").select("id").limit(1);
    return NextResponse.json({ ok: !error });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
