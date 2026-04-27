import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LinkForm } from "@/components/LinkForm";
import { APP_NAME } from "@/lib/constants";

export default async function NewLinkPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto min-h-full max-w-2xl px-6 py-10">
      <Link href="/dashboard" className="text-sm text-emerald-400 hover:text-emerald-300">
        ← Dashboard
      </Link>
      <p className="mt-6 text-xs font-medium uppercase tracking-widest text-emerald-500/90">{APP_NAME}</p>
      <h1 className="mt-2 text-2xl font-semibold text-white">New link</h1>
      <p className="mt-2 text-sm text-zinc-400">Choose a path, bio, optional screenshot, and destination URL.</p>

      <div className="mt-8">
        <LinkForm mode="create" />
      </div>
    </div>
  );
}
