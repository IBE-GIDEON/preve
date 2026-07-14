import { getSupabasePublicEnv } from "../../../lib/supabase/env";
import UpdatePasswordClient from "./UpdatePasswordClient";

export const dynamic = "force-dynamic";

export default function UpdatePasswordPage() {
  return <UpdatePasswordClient supabaseEnv={getSupabasePublicEnv()} />;
}
