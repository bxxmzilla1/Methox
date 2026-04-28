"use client";

import { createLink, updateLink, type LinkRow } from "@/app/actions/links";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props =
  | { mode: "create" }
  | { mode: "edit"; link: LinkRow };

const inputClass =
  "rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2.5 text-zinc-900 outline-none ring-emerald-500/0 transition placeholder:text-zinc-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20";

export function LinkForm(props: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const isEdit = props.mode === "edit";
  const link = isEdit ? props.link : null;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const form = e.currentTarget;
    const fd = new FormData(form);

    try {
      if (props.mode === "create") {
        const res = await createLink(fd);
        if (res.error) {
          setError(res.error);
          setPending(false);
          return;
        }
        const newId = res.data?.id;
        const slug = res.data?.slug;
        if (file && newId && slug) {
          const supabase = createClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) {
            setError("Session expired.");
            setPending(false);
            return;
          }
          const ext = file.name.split(".").pop() || "png";
          const path = `${user.id}/${newId}.${ext}`;
          const { error: upErr } = await supabase.storage.from("screenshots").upload(path, file, {
            upsert: true,
            contentType: file.type || undefined,
          });
          if (upErr) {
            setError(upErr.message);
            setPending(false);
            return;
          }
          const upd = await updateLink(newId, slug, fd, path);
          if (upd.error) {
            setError(upd.error);
            setPending(false);
            return;
          }
        }
        router.push("/dashboard");
        router.refresh();
        return;
      }

      if (!link) return;

      let screenshotPath: string | null | undefined = undefined;
      if (file) {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setError("Session expired.");
          setPending(false);
          return;
        }
        const ext = file.name.split(".").pop() || "png";
        const path = `${user.id}/${link.id}.${ext}`;
        if (link.screenshot_path && link.screenshot_path !== path) {
          await supabase.storage.from("screenshots").remove([link.screenshot_path]);
        }
        const { error: upErr } = await supabase.storage.from("screenshots").upload(path, file, {
          upsert: true,
          contentType: file.type || undefined,
        });
        if (upErr) {
          setError(upErr.message);
          setPending(false);
          return;
        }
        screenshotPath = path;
      }

      const res = await updateLink(link.id, link.slug, fd, screenshotPath);
      if (res.error) {
        setError(res.error);
        setPending(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="flex max-w-lg flex-col gap-5">
      {props.mode === "create" && (
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-800">Username</span>
          <div
            className={`flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2.5 ring-emerald-500/0 transition focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/20`}
          >
            <span className="shrink-0 text-zinc-400">/</span>
            <input
              name="slug"
              required
              placeholder="your-handle"
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-zinc-400"
              autoComplete="off"
            />
          </div>
          <span className="text-xs text-zinc-500">
            Your public page will be at <code className="rounded bg-zinc-100 px-1 py-0.5 text-zinc-700">/your-handle</code>
          </span>
        </label>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-zinc-800">Bio</span>
        <textarea
          name="bio"
          rows={5}
          defaultValue={link?.bio ?? ""}
          placeholder="Saved for when your public page goes live…"
          className={`${inputClass} resize-y`}
        />
      </label>

      {isEdit && (
        <input type="hidden" name="destination_url" defaultValue={link?.destination_url ?? ""} />
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-zinc-800">Screenshot</span>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm text-zinc-600 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-emerald-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white file:shadow-sm hover:file:bg-emerald-500"
        />
        {isEdit && link?.screenshot_path && !file && (
          <span className="text-xs text-zinc-500">Current image kept unless you choose a new file.</span>
        )}
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-zinc-800">Target Model</span>
        <input
          name="username"
          type="text"
          defaultValue={link?.username ?? ""}
          placeholder="Optional"
          autoComplete="off"
          className={inputClass}
        />
        <span className="text-xs text-zinc-500">Optional — shown on your dashboard only.</span>
      </label>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-emerald-600 px-4 py-3 font-medium text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:opacity-50"
      >
        {pending ? "Saving…" : isEdit ? "Save changes" : "Create link"}
      </button>
    </form>
  );
}
