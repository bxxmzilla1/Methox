import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { APP_NAME } from "@/lib/constants";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  const params = await searchParams;

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-6 py-16">
      <Link href="/" className="mb-8 text-sm text-emerald-400 hover:text-emerald-300">
        ← {APP_NAME}
      </Link>
      <h1 className="text-2xl font-semibold text-white">Create account</h1>
      <p className="mt-2 text-sm text-zinc-400">Start building tracked bio links in a minute.</p>

      {params.error && (
        <p className="mt-4 rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          Could not sign up. Try a different email or stronger password.
        </p>
      )}

      <form
        className="mt-8 flex flex-col gap-4"
        action={async (formData) => {
          "use server";
          const email = String(formData.get("email") ?? "");
          const password = String(formData.get("password") ?? "");
          const supabase = await createClient();
          const h = await headers();
          const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
          const proto =
            h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
          const base = process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`;

          const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${base.replace(/\/$/, "")}/auth/callback?next=/dashboard`,
            },
          });
          if (error) redirect("/signup?error=1");
          redirect("/dashboard");
        }}
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-zinc-300">Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:border-emerald-600"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-zinc-300">Password</span>
          <input
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:border-emerald-600"
          />
        </label>
        <button
          type="submit"
          className="mt-2 rounded-lg bg-emerald-600 py-2.5 font-medium text-white transition hover:bg-emerald-500"
        >
          Sign up
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-zinc-500">
        Already have an account?{" "}
        <Link href="/login" className="text-emerald-400 hover:text-emerald-300">
          Log in
        </Link>
      </p>
    </div>
  );
}
