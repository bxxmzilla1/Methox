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
      <Link
        href="/dashboard"
        className="text-sm font-medium text-emerald-600 transition hover:text-emerald-700"
      >
        ← Dashboard
      </Link>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600/90">
        {APP_NAME}
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">New link</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Set your username URL, bio, screenshot, and optional target model.
      </p>

      <div className="mt-8 rounded-2xl border border-zinc-200/90 bg-white p-8 shadow-lg shadow-zinc-200/30">
        <LinkForm mode="create" />
      </div>
    </div>
  );
}
