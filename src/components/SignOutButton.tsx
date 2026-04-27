"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => void signOut()}
      className="rounded-lg border border-zinc-600 px-3 py-1.5 text-sm text-zinc-200 transition hover:bg-zinc-800"
    >
      Sign out
    </button>
  );
}
