"use client";

import { createLink, updateLink, type LinkRow } from "@/app/actions/links";
import { ImageFocusPan } from "@/components/ImageFocusPan";
import { LandingLivePreview } from "@/components/LandingLivePreview";
import { publicScreenshotUrl } from "@/lib/storage";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ImageFocus, LandingCard } from "@/lib/landing-data";
import { DEFAULT_IMAGE_FOCUS, normalizeFeaturedFirst } from "@/lib/landing-data";
import { PLATFORM_OPTIONS } from "@/lib/platforms";

function reindexFiles(prev: Record<number, File>, removed: number): Record<number, File> {
  const next: Record<number, File> = {};
  Object.entries(prev).forEach(([k, v]) => {
    const idx = Number(k);
    if (idx === removed) return;
    next[idx > removed ? idx - 1 : idx] = v;
  });
  return next;
}

function reindexClear(prev: Record<number, boolean>, removed: number): Record<number, boolean> {
  const next: Record<number, boolean> = {};
  Object.entries(prev).forEach(([k, v]) => {
    const idx = Number(k);
    if (idx === removed || !v) return;
    next[idx > removed ? idx - 1 : idx] = true;
  });
  return next;
}

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
  const [landingCards, setLandingCards] = useState<LandingCard[]>(() =>
    normalizeFeaturedFirst(link?.landing_cards ?? [])
  );

  const [slugDraft, setSlugDraft] = useState("");
  const [displayName, setDisplayName] = useState(() => link?.display_name ?? "");
  const [handle, setHandle] = useState(() => link?.handle ?? "");
  const [bioLanding, setBioLanding] = useState(() => link?.bio ?? "");
  const [heroObjectUrl, setHeroObjectUrl] = useState<string | null>(null);
  const [cardFiles, setCardFiles] = useState<Record<number, File>>({});
  const [cardClearImage, setCardClearImage] = useState<Record<number, boolean>>({});
  const [cardPreviewBlobs, setCardPreviewBlobs] = useState<Record<number, string>>({});
  const [heroFocus, setHeroFocus] = useState<ImageFocus>(() =>
    isEdit && link?.landing_hero_focus ? link.landing_hero_focus : { ...DEFAULT_IMAGE_FOCUS }
  );
  const heroFileInputRef = useRef<HTMLInputElement>(null);

  const defaults = useMemo(
    () => ({
      destination_url: link?.destination_url ?? "",
    }),
    [link]
  );

  const previewSlug =
    isEdit && link ? link.slug : slugDraft.trim().toLowerCase() || "preview";

  const savedHeroUrl = useMemo(() => {
    const p = link?.hero_image_path ?? link?.screenshot_path;
    return p ? publicScreenshotUrl(p) : null;
  }, [link?.hero_image_path, link?.screenshot_path]);

  const previewHeroUrl = heroObjectUrl ?? savedHeroUrl;

  useEffect(() => {
    if (!file) {
      setHeroObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setHeroObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const urls: Record<number, string> = {};
    Object.entries(cardFiles).forEach(([k, f]) => {
      urls[Number(k)] = URL.createObjectURL(f);
    });
    setCardPreviewBlobs(urls);
    return () => {
      Object.values(urls).forEach((u) => URL.revokeObjectURL(u));
    };
  }, [cardFiles]);

  const landingCardsNormalized = useMemo(() => normalizeFeaturedFirst(landingCards), [landingCards]);

  const previewCards = useMemo(
    () =>
      landingCardsNormalized.map((c, i) => ({
        ...c,
        previewBgUrl: cardPreviewBlobs[i] ?? undefined,
      })),
    [landingCardsNormalized, cardPreviewBlobs]
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const heroFromInput = heroFileInputRef.current?.files?.[0];
    const heroFile = file ?? heroFromInput ?? null;

    try {
      if (props.mode === "create") {
        if (heroFile && heroFile.size > 0) fd.append("screenshot", heroFile, heroFile.name);
        Object.entries(cardFiles).forEach(([k, f]) => {
          fd.append(`card_image_${k}`, f, f.name);
        });
        const res = await createLink(fd);
        if (res.error) {
          setError(res.error);
          return;
        }
        router.push("/dashboard");
        router.refresh();
        return;
      }

      if (!link) return;

      if (heroFile && heroFile.size > 0) fd.append("screenshot", heroFile, heroFile.name);
      Object.entries(cardFiles).forEach(([k, f]) => {
        fd.append(`card_image_${k}`, f, f.name);
      });
      const res = await updateLink(link.id, link.slug, fd);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(
        /413|body.*limit|Payload Too Large/i.test(msg)
          ? "Image is too large for one request. Try a smaller file (under ~15MB) or compress the photo."
          : `Could not save: ${msg || "Network error"}. Try again.`
      );
    } finally {
      setPending(false);
    }
  }

  function addCard() {
    setLandingCards((c) => [
      ...c,
      {
        label: "",
        url: "",
        platform: "instagram",
        featured: false,
        locked: false,
        image_path: null,
        image_url: null,
        image_focus: { ...DEFAULT_IMAGE_FOCUS },
      },
    ]);
  }

  function updateCard(i: number, patch: Partial<LandingCard>) {
    setLandingCards((c) => c.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  }

  function removeCard(i: number) {
    setLandingCards((c) => c.filter((_, j) => j !== i));
    setCardFiles((p) => reindexFiles(p, i));
    setCardClearImage((p) => reindexClear(p, i));
  }

  return (
    <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(280px,400px)] lg:items-start lg:gap-12">
      <form onSubmit={(e) => void onSubmit(e)} className="flex min-w-0 max-w-lg flex-col gap-5">
        <input type="hidden" name="public_page_mode" value={pageMode} />
        <input type="hidden" name="social_links_json" value="[]" />
        <input type="hidden" name="follower_summary" value="" />
        <input type="hidden" name="landing_hero_focus_json" value={JSON.stringify(heroFocus)} />
        <input type="hidden" name="landing_cards_json" value={JSON.stringify(landingCardsNormalized)} />

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
                value={slugDraft}
                onChange={(e) => setSlugDraft(e.target.value)}
                placeholder="your-handle"
                className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-zinc-400"
                autoComplete="off"
              />
            </div>
            <span className="text-xs text-zinc-500">
              Your public page will be at{" "}
              <code className="rounded bg-zinc-100 px-1 py-0.5 text-zinc-700">
                /{slugDraft.trim() || "your-handle"}
              </code>
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
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Shown as the main title"
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-800">Handle</span>
            <input
              name="handle"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="yourhandle (shown as @yourhandle)"
              className={inputClass}
            />
          </label>

          <input type="hidden" name="verified" value="on" />

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-800">Bio</span>
            <textarea
              name="bio"
              rows={5}
              value={bioLanding}
              onChange={(e) => setBioLanding(e.target.value)}
              placeholder="Lines, emojis, and short links welcome."
              className={`${inputClass} resize-y`}
            />
          </label>

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
              The first card is shown full-width at the top; add more cards below. Optionally upload a background image
              per card.
            </p>
            {landingCards.length === 0 && (
              <p className="text-xs text-zinc-400">Add at least one card with label and URL.</p>
            )}
            <ul className="flex flex-col gap-3">
              {landingCards.map((row, i) => (
                <li key={i} className="flex flex-col gap-2 rounded-xl border border-zinc-100 bg-zinc-50/80 p-3">
                  {cardClearImage[i] ? (
                    <input type="hidden" name={`card_clear_image_${i}`} value="1" />
                  ) : null}
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
                  <div className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
                    <span>Card image (optional)</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="text-sm text-zinc-600 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-zinc-200 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-zinc-800 hover:file:bg-zinc-300"
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        if (f) {
                          setCardFiles((p) => ({ ...p, [i]: f }));
                          setCardClearImage((p) => {
                            const n = { ...p };
                            delete n[i];
                            return n;
                          });
                          updateCard(i, { image_path: null, image_url: null, image_focus: { ...DEFAULT_IMAGE_FOCUS } });
                        }
                      }}
                    />
                    {(row.image_path || row.image_url || cardFiles[i]) && (
                      <button
                        type="button"
                        onClick={() => {
                          setCardFiles((p) => {
                            const n = { ...p };
                            delete n[i];
                            return n;
                          });
                          setCardClearImage((p) => ({ ...p, [i]: true }));
                          updateCard(i, {
                            image_path: null,
                            image_url: null,
                            image_focus: { ...DEFAULT_IMAGE_FOCUS },
                          });
                        }}
                        className="w-fit text-xs font-medium text-red-600 hover:underline"
                      >
                        Remove image
                      </button>
                    )}
                    {row.image_path && !cardFiles[i] && !cardClearImage[i] && (
                      <span className="text-[11px] text-zinc-500">Using saved upload. Choose a file to replace.</span>
                    )}
                  </div>
                  <ImageFocusPan
                    label="Card image framing"
                    aspectClassName="aspect-[5/1] max-h-24 sm:max-h-28"
                    imageUrl={
                      cardClearImage[i]
                        ? null
                        : cardPreviewBlobs[i] ??
                          (row.image_path ? publicScreenshotUrl(row.image_path) : null) ??
                          row.image_url ??
                          null
                    }
                    value={row.image_focus ?? DEFAULT_IMAGE_FOCUS}
                    onChange={(next) => updateCard(i, { image_focus: next })}
                  />
                  <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-700">
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

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-zinc-800">Hero image</span>
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={heroFileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            aria-label="Choose hero image"
            onClick={() => heroFileInputRef.current?.click()}
            className="cursor-pointer rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-500"
          >
            Choose file
          </button>
          {file && (
            <span className="max-w-[min(100%,18rem)] truncate text-xs text-zinc-600" title={file.name}>
              {file.name}
            </span>
          )}
        </div>
        {isEdit && (link?.hero_image_path ?? link?.screenshot_path) && !file && (
          <span className="text-xs text-zinc-500">Current image kept unless you choose a new file.</span>
        )}
        <span className="text-xs text-zinc-500">
          Shown on your public landing only — not in the dashboard screenshot panel.
        </span>
        <ImageFocusPan
          label="Hero framing (mobile)"
          aspectClassName="aspect-[16/10] max-h-44"
          imageUrl={previewHeroUrl}
          value={heroFocus}
          onChange={setHeroFocus}
        />
      </div>

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

      {pageMode === "landing" ? (
        <LandingLivePreview
          slug={previewSlug}
          displayName={displayName}
          handle={handle}
          bio={bioLanding}
          heroUrl={previewHeroUrl}
          heroFocus={heroFocus}
          cards={previewCards}
        />
      ) : (
        <aside className="flex flex-col gap-3 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 p-6 text-sm text-zinc-600 lg:sticky lg:top-6">
          <p className="font-medium text-zinc-800">Live preview</p>
          <p>
            Switch <strong>Visitor experience</strong> to <strong>Landing page</strong> to see your public layout update
            here as you edit.
          </p>
        </aside>
      )}
    </div>
  );
}
