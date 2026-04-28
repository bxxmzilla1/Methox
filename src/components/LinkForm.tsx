"use client";

import { createLink, updateLink, type LinkRow } from "@/app/actions/links";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { LandingCard, SocialLink } from "@/lib/landing-data";
import { PLATFORM_OPTIONS } from "@/lib/platforms";

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

  const [pageMode, setPageMode] = useState<"landing" | "redirect">(
    () => link?.public_page_mode ?? "landing"
  );
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(() => link?.social_links ?? []);
  const [landingCards, setLandingCards] = useState<LandingCard[]>(() => link?.landing_cards ?? []);

  const defaults = useMemo(
    () => ({
      display_name: link?.display_name ?? "",
      handle: link?.handle ?? "",
      follower_summary: link?.follower_summary ?? "",
      destination_url: link?.destination_url ?? "",
    }),
    [link]
  );

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

  function addSocial() {
    setSocialLinks((s) => [...s, { platform: "instagram", url: "" }]);
  }

  function updateSocial(i: number, patch: Partial<SocialLink>) {
    setSocialLinks((s) => s.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  }

  function removeSocial(i: number) {
    setSocialLinks((s) => s.filter((_, j) => j !== i));
  }

  function addCard() {
    setLandingCards((c) => [
      ...c,
      { label: "", url: "", platform: "instagram", featured: false, locked: false, image_url: "" },
    ]);
  }

  function updateCard(i: number, patch: Partial<LandingCard>) {
    setLandingCards((c) => c.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  }

  function removeCard(i: number) {
    setLandingCards((c) => c.filter((_, j) => j !== i));
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="flex max-w-lg flex-col gap-5">
      <input type="hidden" name="public_page_mode" value={pageMode} />
      <input type="hidden" name="social_links_json" value={JSON.stringify(socialLinks)} />
      <input type="hidden" name="landing_cards_json" value={JSON.stringify(landingCards)} />

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

      <fieldset className="flex flex-col gap-2 rounded-2xl border border-zinc-200/90 bg-zinc-50/40 p-4">
        <legend className="px-1 text-sm font-medium text-zinc-800">Visitor experience</legend>
        <p className="text-xs text-zinc-500">
          Choose a full landing page or send visitors straight to one URL (clicks are still recorded).
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm has-[:checked]:border-emerald-500 has-[:checked]:ring-2 has-[:checked]:ring-emerald-500/20">
            <input
              type="radio"
              name="page_mode_ui"
              checked={pageMode === "landing"}
              onChange={() => setPageMode("landing")}
              className="text-emerald-600"
            />
            Landing page
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm has-[:checked]:border-emerald-500 has-[:checked]:ring-2 has-[:checked]:ring-emerald-500/20">
            <input
              type="radio"
              name="page_mode_ui"
              checked={pageMode === "redirect"}
              onChange={() => setPageMode("redirect")}
              className="text-emerald-600"
            />
            Redirect to URL
          </label>
        </div>
      </fieldset>

      {pageMode === "redirect" && (
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-800">Destination URL</span>
          <input
            name="destination_url"
            type="text"
            inputMode="url"
            autoComplete="url"
            required={pageMode === "redirect"}
            defaultValue={defaults.destination_url}
            placeholder="https://example.com or your-store.com"
            className={inputClass}
          />
          <span className="text-xs text-zinc-500">Must include a valid http(s) address.</span>
        </label>
      )}

      {pageMode === "landing" && (
        <>
          {isEdit && <input type="hidden" name="destination_url" value="" />}

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-800">Display name</span>
            <input
              name="display_name"
              defaultValue={defaults.display_name}
              placeholder="Shown as the main title"
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-800">Handle</span>
            <input
              name="handle"
              defaultValue={defaults.handle}
              placeholder="yourhandle (shown as @yourhandle)"
              className={inputClass}
            />
          </label>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800">
            <input type="checkbox" name="verified" defaultChecked={link?.verified ?? false} className="rounded border-zinc-300 text-emerald-600" />
            Show verified badge
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-800">Follower summary (optional)</span>
            <input
              name="follower_summary"
              defaultValue={defaults.follower_summary}
              placeholder="e.g. 35.3M Total Followers"
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-800">Bio</span>
            <textarea
              name="bio"
              rows={5}
              defaultValue={link?.bio ?? ""}
              placeholder="Lines, emojis, and short links welcome."
              className={`${inputClass} resize-y`}
            />
          </label>

          <div className="flex flex-col gap-2 rounded-2xl border border-zinc-200/90 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-zinc-800">Social icons</span>
              <button
                type="button"
                onClick={addSocial}
                className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
              >
                Add
              </button>
            </div>
            <p className="text-xs text-zinc-500">Round buttons under your name on the public page.</p>
            {socialLinks.length === 0 && (
              <p className="text-xs text-zinc-400">None yet — add Instagram, TikTok, etc.</p>
            )}
            <ul className="flex flex-col gap-2">
              {socialLinks.map((row, i) => (
                <li key={i} className="flex flex-wrap items-end gap-2 rounded-xl border border-zinc-100 bg-zinc-50/80 p-2">
                  <label className="flex min-w-[8rem] flex-1 flex-col gap-1 text-xs font-medium text-zinc-600">
                    Platform
                    <select
                      value={row.platform}
                      onChange={(e) => updateSocial(i, { platform: e.target.value })}
                      className={inputClass + " py-2 text-sm"}
                    >
                      {PLATFORM_OPTIONS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex min-w-[12rem] flex-[2] flex-col gap-1 text-xs font-medium text-zinc-600">
                    URL
                    <input
                      value={row.url}
                      onChange={(e) => updateSocial(i, { url: e.target.value })}
                      placeholder="https://"
                      className={inputClass}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => removeSocial(i)}
                    className="rounded-lg px-2 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-2 rounded-2xl border border-zinc-200/90 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-zinc-800">Link cards</span>
              <button
                type="button"
                onClick={addCard}
                className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
              >
                Add card
              </button>
            </div>
            <p className="text-xs text-zinc-500">
              Large buttons on the grid. Mark one as <strong>featured</strong> for a full-width top card. Optional image URL
              for full-bleed art.
            </p>
            {landingCards.length === 0 && (
              <p className="text-xs text-zinc-400">Add at least one card with label and URL.</p>
            )}
            <ul className="flex flex-col gap-3">
              {landingCards.map((row, i) => (
                <li key={i} className="flex flex-col gap-2 rounded-xl border border-zinc-100 bg-zinc-50/80 p-3">
                  <div className="flex flex-wrap gap-2">
                    <label className="flex min-w-[8rem] flex-1 flex-col gap-1 text-xs font-medium text-zinc-600">
                      Platform / icon
                      <select
                        value={row.platform}
                        onChange={(e) => updateCard(i, { platform: e.target.value })}
                        className={inputClass + " py-2 text-sm"}
                      >
                        {PLATFORM_OPTIONS.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex min-w-[10rem] flex-[2] flex-col gap-1 text-xs font-medium text-zinc-600">
                      Label
                      <input
                        value={row.label}
                        onChange={(e) => updateCard(i, { label: e.target.value })}
                        placeholder="OnlyFans"
                        className={inputClass}
                      />
                    </label>
                  </div>
                  <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
                    URL
                    <input
                      value={row.url}
                      onChange={(e) => updateCard(i, { url: e.target.value })}
                      placeholder="https://"
                      className={inputClass}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
                    Image URL (optional)
                    <input
                      value={row.image_url ?? ""}
                      onChange={(e) => updateCard(i, { image_url: e.target.value || null })}
                      placeholder="https://… for card background"
                      className={inputClass}
                    />
                  </label>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-700">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={Boolean(row.featured)}
                        onChange={(e) => updateCard(i, { featured: e.target.checked })}
                      />
                      Featured (full-width top)
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={Boolean(row.locked)}
                        onChange={(e) => updateCard(i, { locked: e.target.checked })}
                      />
                      Locked icon
                    </label>
                    <button
                      type="button"
                      onClick={() => removeCard(i)}
                      className="ml-auto font-medium text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {pageMode === "redirect" && (
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-800">Bio (optional)</span>
          <textarea
            name="bio"
            rows={4}
            defaultValue={link?.bio ?? ""}
            placeholder="Not shown in redirect mode — stored for later if you switch to landing."
            className={`${inputClass} resize-y`}
          />
        </label>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-zinc-800">Hero screenshot</span>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm text-zinc-600 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-emerald-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white file:shadow-sm hover:file:bg-emerald-500"
        />
        {isEdit && link?.screenshot_path && !file && (
          <span className="text-xs text-zinc-500">Current image kept unless you choose a new file.</span>
        )}
        <span className="text-xs text-zinc-500">
          Used as the large header image on landing pages; optional but recommended.
        </span>
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
