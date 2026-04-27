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
      <Link
        href="/"
        className="mb-8 text-sm font-medium text-emerald-600 transition hover:text-emerald-700"
      >
        ← {APP_NAME}
      </Link>
      <div className="rounded-2xl border border-zinc-200/90 bg-white p-8 shadow-xl shadow-zinc-200/40">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Create account</h1>
        <p className="mt-2 text-sm text-zinc-600">Start building tracked bio links in a minute.</p>

        {params.error && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
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
            <span className="text-sm font-medium text-zinc-700">Email</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2.5 text-zinc-900 outline-none ring-emerald-500/0 transition placeholder:text-zinc-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700">Password</span>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className="rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2.5 text-zinc-900 outline-none ring-emerald-500/0 transition placeholder:text-zinc-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
            />
          </label>
          <button
            type="submit"
            className="mt-2 rounded-xl bg-emerald-600 py-2.5 font-medium text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-500"
          >
            Sign up
          </button>
        </form>
      </div>

      <p className="mt-8 text-center text-sm text-zinc-600">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-emerald-600 hover:text-emerald-700">
          Log in
        </Link>
      </p>
    </div>
  );
}
