import { redirect } from "next/navigation";

// Search now lives at the dashboard home; keep old links working.
export default async function SearchRedirect({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  redirect(q ? `/dashboard?q=${encodeURIComponent(q)}` : "/dashboard");
}
