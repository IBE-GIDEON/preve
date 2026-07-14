import { getSupabasePublicEnv } from "../../../lib/supabase/env";
import ResetRequestClient from "./ResetRequestClient";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return <ResetRequestClient supabaseEnv={getSupabasePublicEnv()} />;
}
