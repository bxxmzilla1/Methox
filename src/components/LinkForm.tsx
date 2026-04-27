"use client";

import { createLink, updateLink, type LinkRow } from "@/app/actions/links";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props =
  | { mode: "create" }
  | { mode: "edit"; link: LinkRow };

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
          <span className="text-sm font-medium text-zinc-300">Path</span>
          <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-zinc-100">
            <span className="shrink-0 text-zinc-500">/</span>
            <input
              name="slug"
              required
              placeholder="example"
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-zinc-600"
              autoComplete="off"
            />
          </div>
          <span className="text-xs text-zinc-500">Public URL will be /your-path (e.g. /example)</span>
        </label>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-zinc-300">Username</span>
        <input
          name="username"
          type="text"
          defaultValue={link?.username ?? ""}
          placeholder="Display name"
          autoComplete="username"
          className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-zinc-100 outline-none placeholder:text-zinc-600"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-zinc-300">Bio</span>
        <textarea
          name="bio"
          rows={5}
          defaultValue={link?.bio ?? ""}
          placeholder="Saved for when your public page goes live…"
          className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-zinc-100 outline-none placeholder:text-zinc-600"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-zinc-300">Destination URL (optional)</span>
        <input
          name="destination_url"
          type="url"
          defaultValue={link?.destination_url ?? ""}
          placeholder="https://…"
          className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-zinc-100 outline-none placeholder:text-zinc-600"
        />
        <span className="text-xs text-zinc-500">Optional; kept for when your public page goes live.</span>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-zinc-300">Screenshot</span>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm text-zinc-400 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-600 file:px-3 file:py-1.5 file:text-sm file:text-white"
        />
        {isEdit && link?.screenshot_path && !file && (
          <span className="text-xs text-zinc-500">Current image kept unless you choose a new file.</span>
        )}
      </label>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-emerald-600 px-4 py-2.5 font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
      >
        {pending ? "Saving…" : isEdit ? "Save changes" : "Create link"}
      </button>
    </form>
  );
}
