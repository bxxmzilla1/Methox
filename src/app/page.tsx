import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-zinc-200/80 bg-white/75 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-lg font-semibold tracking-tight text-transparent">
            {APP_NAME}
          </span>
          <nav className="flex items-center gap-3 text-sm">
            <Link
              href="/login"
              className="rounded-lg px-3 py-1.5 font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-emerald-600 px-3 py-1.5 font-medium text-white shadow-sm shadow-emerald-600/25 transition hover:bg-emerald-500"
            >
              Sign up
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-20">
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-72 w-[min(100%,42rem)] -translate-x-1/2 rounded-full bg-gradient-to-br from-emerald-200/40 via-teal-100/30 to-transparent blur-3xl"
          aria-hidden
        />
        <div className="relative">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600/90">
            Link pages
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl sm:leading-[1.1]">
            Custom paths, bio, screenshots, and analytics by country.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-600">
            Create a public page at{" "}
            <code className="rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-[0.9em] font-medium text-emerald-700 shadow-sm">
              /your-name
            </code>
            . Every visit is logged so you can see clicks, uniques, and where visitors are from.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="rounded-xl bg-emerald-600 px-6 py-3 font-medium text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500"
            >
              Get started
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-zinc-200 bg-white px-6 py-3 font-medium text-zinc-800 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50"
            >
              I have an account
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-200/80 px-6 py-8 text-center text-xs text-zinc-500">
        {APP_NAME} — installable PWA · Supabase · Vercel
      </footer>
    </div>
  );
}
