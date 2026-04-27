import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <span className="text-lg font-semibold tracking-tight text-emerald-400">{APP_NAME}</span>
          <nav className="flex gap-3 text-sm">
            <Link href="/login" className="text-zinc-400 transition hover:text-white">
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-emerald-600 px-3 py-1.5 font-medium text-white transition hover:bg-emerald-500"
            >
              Sign up
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-1 flex-col justify-center px-6 py-20">
        <p className="text-sm font-medium uppercase tracking-widest text-emerald-500/90">Link pages</p>
        <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Custom paths, bio, screenshots, and analytics by country.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-400">
          Create a public page at <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-200">/your-name</code>.
          Every visit is logged with a stable visitor id so you can see total clicks and uniques, plus ISO country
          codes from the edge network.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/signup"
            className="rounded-lg bg-emerald-600 px-5 py-2.5 font-medium text-white transition hover:bg-emerald-500"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-zinc-700 px-5 py-2.5 font-medium text-zinc-200 transition hover:bg-zinc-900"
          >
            I have an account
          </Link>
        </div>
      </main>

      <footer className="border-t border-zinc-800 px-6 py-6 text-center text-xs text-zinc-500">
        {APP_NAME} — installable PWA · Supabase · Vercel
      </footer>
    </div>
  );
}
