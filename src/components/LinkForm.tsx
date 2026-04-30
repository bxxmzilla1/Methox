"use client";

import { createLink, updateLink, type LinkRow } from "@/app/actions/links";
import { deletePreset, listPresets, savePreset, type PresetRow } from "@/app/actions/presets";
import { ImageFocusPan } from "@/components/ImageFocusPan";
import { LandingLivePreview } from "@/components/LandingLivePreview";
import { publicScreenshotUrl } from "@/lib/storage";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ImageFocus, LandingCard } from "@/lib/landing-data";
import { DEFAULT_IMAGE_FOCUS, DEFAULT_LOCKED_HINT_TEXT, normalizeFeaturedFirst } from "@/lib/landing-data";
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
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const dragFromIdxRef = useRef<number | null>(null);

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
  const [bioLanding, setBioLanding] = useState(() => link?.landing_bio ?? "");
  const [heroObjectUrl, setHeroObjectUrl] = useState<string | null>(null);
  const [cardFiles, setCardFiles] = useState<Record<number, File>>({});
  const [cardClearImage, setCardClearImage] = useState<Record<number, boolean>>({});
  const [cardPreviewBlobs, setCardPreviewBlobs] = useState<Record<number, string>>({});
  const [heroFocus, setHeroFocus] = useState<ImageFocus>(() =>
    isEdit && link?.landing_hero_focus ? link.landing_hero_focus : { ...DEFAULT_IMAGE_FOCUS }
  );
  /** Same as heroFocus, updated synchronously on pan so Save always sends the latest framing. */
  const heroFocusLiveRef = useRef<ImageFocus>(
    isEdit && link?.landing_hero_focus ? { ...link.landing_hero_focus } : { ...DEFAULT_IMAGE_FOCUS }
  );
  const heroFileInputRef = useRef<HTMLInputElement>(null);

  const setHeroFocusFromPan = useCallback((next: ImageFocus) => {
    heroFocusLiveRef.current = next;
    setHeroFocus(next);
  }, []);

  // Preset state
  const [presetSaveOpen, setPresetSaveOpen] = useState(false);
  const [presetSaveName, setPresetSaveName] = useState("");
  const [presetSavePending, setPresetSavePending] = useState(false);
  const [presetSaveError, setPresetSaveError] = useState<string | null>(null);
  const [presetLoadOpen, setPresetLoadOpen] = useState(false);
  const [presets, setPresets] = useState<PresetRow[] | null>(null);
  const [presetsLoading, setPresetsLoading] = useState(false);
  const [presetsError, setPresetsError] = useState<string | null>(null);
  const [presetApplied, setPresetApplied] = useState<string | null>(null);
  /** Landing hero storage path (from saved link or applied preset); submitted when no new file is chosen. */
  const [landingHeroStoragePath, setLandingHeroStoragePath] = useState<string | null>(() =>
    isEdit && link ? (link.hero_image_path ?? null) : null
  );

  const loadPresetList = useCallback(async () => {
    setPresetsLoading(true);
    setPresetsError(null);
    const res = await listPresets();
    setPresetsLoading(false);
    if ("error" in res) {
      setPresetsError(res.error);
    } else {
      setPresets(res.data);
    }
  }, []);

  function openLoadPresets() {
    setPresetLoadOpen(true);
    if (presets === null) void loadPresetList();
  }

  function applyPreset(preset: PresetRow) {
    setDisplayName(preset.display_name);
    setHandle(preset.handle);
    setBioLanding(preset.landing_bio);
    const hf = { ...preset.landing_hero_focus };
    heroFocusLiveRef.current = hf;
    setHeroFocus(hf);
    setLandingCards(normalizeFeaturedFirst(preset.landing_cards));
    setFile(null);
    if (heroFileInputRef.current) heroFileInputRef.current.value = "";
    setLandingHeroStoragePath(preset.hero_image_path?.trim() ? preset.hero_image_path.trim() : null);
    setCardFiles({});
    setCardClearImage({});
    setCardPreviewBlobs({});
    setPresetApplied(preset.name);
    setPresetLoadOpen(false);
  }

  async function handleSavePreset() {
    if (!presetSaveName.trim()) {
      setPresetSaveError("Enter a name for this preset.");
      return;
    }
    setPresetSavePending(true);
    setPresetSaveError(null);
    const fd = new FormData();
    fd.set("preset_name", presetSaveName.trim());
    fd.set("display_name", displayName);
    fd.set("handle", handle);
    fd.set("landing_bio", bioLanding);
    fd.set("landing_cards_json", JSON.stringify(landingCardsNormalized));
    fd.set("landing_hero_focus_json", JSON.stringify(heroFocusLiveRef.current));
    const heroForPreset = file ?? heroFileInputRef.current?.files?.[0] ?? null;
    if (heroForPreset && heroForPreset.size > 0) {
      fd.append("preset_hero_image", heroForPreset, heroForPreset.name);
    }
    if (isEdit && link) {
      fd.set("preset_source_link_id", link.id);
    }
    Object.entries(cardFiles).forEach(([k, f]) => {
      fd.append(`preset_card_image_${k}`, f, f.name);
    });
    const res = await savePreset(fd);
    setPresetSavePending(false);
    if ("error" in res) {
      setPresetSaveError(res.error);
    } else {
      setPresets((prev) => (prev ? [res.data, ...prev] : [res.data]));
      setPresetSaveOpen(false);
      setPresetSaveName("");
    }
  }

  async function handleDeletePreset(id: string) {
    const res = await deletePreset(id);
    if ("error" in res) {
      setPresetsError(res.error);
    } else {
      setPresets((prev) => (prev ? prev.filter((p) => p.id !== id) : prev));
    }
  }

  const defaults = useMemo(
    () => ({
      destination_url: link?.destination_url ?? "",
    }),
    [link]
  );

  useEffect(() => {
    if (!isEdit || !link) return;
    setLandingHeroStoragePath(link.hero_image_path ?? null);
    const hf = link.landing_hero_focus ?? { ...DEFAULT_IMAGE_FOCUS };
    heroFocusLiveRef.current = { ...hf };
    setHeroFocus({ ...hf });
  }, [isEdit, link?.id]);

  const previewSlug =
    isEdit && link ? link.slug : slugDraft.trim().toLowerCase() || "preview";

  const previewHeroUrl =
    heroObjectUrl ??
    (landingHeroStoragePath ? publicScreenshotUrl(landingHeroStoragePath) : null);

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
    if (pageMode === "redirect") {
      setFile(null);
      if (heroFileInputRef.current) heroFileInputRef.current.value = "";
    }
  }, [pageMode]);

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
    fd.set("landing_hero_focus_json", JSON.stringify(heroFocusLiveRef.current));
    fd.set("landing_cards_json", JSON.stringify(landingCardsNormalized));
    fd.set("hero_image_storage_path", landingHeroStoragePath ?? "");
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
        hide_platform_icon: false,
        locked_glow: false,
        locked_hint: false,
        image_path: null,
        image_url: null,
        image_focus: { ...DEFAULT_IMAGE_FOCUS },
      },
    ]);
  }

  function updateCard(i: number, patch: Partial<LandingCard>) {
    setLandingCards((c) => c.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  }

  function moveCard(from: number, to: number) {
    if (from === to) return;
    setLandingCards((prev) => {
      if (from < 0 || to < 0 || from >= prev.length || to >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
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
        <input type="hidden" name="hero_image_storage_path" value={landingHeroStoragePath ?? ""} />
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
        <>
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
          <input type="hidden" name="bio" value={isEdit && link ? link.bio : ""} />
        </>
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
              name="landing_bio"
              rows={5}
              value={bioLanding}
              onChange={(e) => setBioLanding(e.target.value)}
              placeholder="Lines, emojis, and short links welcome."
              className={`${inputClass} resize-y`}
            />
            <p className="text-xs leading-relaxed text-zinc-500">
              On your <strong className="font-medium text-zinc-600">live</strong> page, you can personalize text with{" "}
              <code className="rounded bg-zinc-100 px-1 py-0.5 text-[11px] text-zinc-800">(country)</code> and{" "}
              <code className="rounded bg-zinc-100 px-1 py-0.5 text-[11px] text-zinc-800">(city)</code> — each visitor
              sees their own location (from IP). Example:{" "}
              <span className="text-zinc-600">Hi from (city), (country)!</span> Requires IPinfo on the host; the editor
              preview shows the placeholders as typed.
            </p>
          </label>

          <div className="flex flex-col gap-2 rounded-2xl border border-zinc-200/90 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-zinc-800">Link cards</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={openLoadPresets}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
                >
                  Load preset
                </button>
                <button
                  type="button"
                  onClick={() => { setPresetSaveOpen(true); setPresetSaveError(null); }}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                >
                  Save as preset
                </button>
                <button
                  type="button"
                  onClick={addCard}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
                >
                  Add card
                </button>
              </div>
            </div>
            {presetApplied && (
              <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5">
                Preset &ldquo;{presetApplied}&rdquo; applied — review and save when ready.
              </p>
            )}
            <p className="text-xs text-zinc-500">
              The first card is shown full-width at the top; add more cards below. Optionally upload a background image
              per card.
            </p>
            {landingCards.length === 0 && (
              <p className="text-xs text-zinc-400">Add at least one card with label and URL.</p>
            )}
            <ul className="flex flex-col gap-3">
              {landingCards.map((row, i) => (
                <li
                  key={i}
                  draggable
                  onDragStart={(e) => {
                    dragFromIdxRef.current = i;
                    setDragOverIdx(i);
                    try {
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", String(i));
                    } catch {
                      // ignore
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverIdx(i);
                    try {
                      e.dataTransfer.dropEffect = "move";
                    } catch {
                      // ignore
                    }
                  }}
                  onDragLeave={() => {
                    setDragOverIdx((cur) => (cur === i ? null : cur));
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const from =
                      dragFromIdxRef.current ??
                      (() => {
                        try {
                          return Number(e.dataTransfer.getData("text/plain"));
                        } catch {
                          return NaN;
                        }
                      })();
                    if (Number.isFinite(from)) moveCard(from, i);
                    dragFromIdxRef.current = null;
                    setDragOverIdx(null);
                  }}
                  onDragEnd={() => {
                    dragFromIdxRef.current = null;
                    setDragOverIdx(null);
                  }}
                  className={`flex flex-col gap-2 rounded-xl border bg-zinc-50/80 p-3 transition ${
                    dragOverIdx === i ? "border-emerald-300 ring-2 ring-emerald-500/15" : "border-zinc-100"
                  }`}
                  title="Drag to reorder"
                >
                  {cardClearImage[i] ? (
                    <input type="hidden" name={`card_clear_image_${i}`} value="1" />
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs font-semibold text-zinc-500">
                      Drag
                    </div>
                    <label className="flex min-w-[8rem] flex-1 flex-col gap-1 text-xs font-medium text-zinc-600">
                      Platform / icon
                      <select
                        value={row.platform}
                        onChange={(e) =>
                          updateCard(i, {
                            platform: e.target.value,
                            hide_platform_icon: e.target.value === "none",
                          })
                        }
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
                  <div className="flex flex-col gap-3 text-xs text-zinc-700">
                    <div className="flex flex-wrap items-center gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={Boolean(row.locked)}
                          onChange={(e) =>
                            updateCard(i, {
                              locked: e.target.checked,
                              ...(e.target.checked
                                ? {}
                                : {
                                    locked_glow: false,
                                    locked_hint: false,
                                    locked_hint_text: undefined,
                                  }),
                            })
                          }
                        />
                        Locked icon
                      </label>
                      {i > 0 ? (
                        <button
                          type="button"
                          onClick={() => moveCard(i, i - 1)}
                          className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50"
                        >
                          ↑ Move up
                        </button>
                      ) : null}
                      {i < landingCards.length - 1 ? (
                        <button
                          type="button"
                          onClick={() => moveCard(i, i + 1)}
                          className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50"
                        >
                          ↓ Move down
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => removeCard(i)}
                        className="ml-auto font-medium text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                    {row.locked ? (
                      <div className="ml-6 flex flex-col gap-2 border-l-2 border-emerald-200/80 pl-3">
                        <label className="flex cursor-pointer items-start gap-2">
                          <input
                            type="checkbox"
                            className="mt-0.5"
                            checked={Boolean(row.locked_glow)}
                            onChange={(e) => updateCard(i, { locked_glow: e.target.checked })}
                          />
                          <span>
                            <span className="font-medium text-zinc-800">Glow and pulse lock icon</span>
                            <span className="mt-0.5 block text-[11px] text-zinc-500">
                              Soft ring on the button plus a scale pulse on the lock (live page only).
                            </span>
                          </span>
                        </label>
                        <label className="flex cursor-pointer items-start gap-2">
                          <input
                            type="checkbox"
                            className="mt-0.5"
                            checked={Boolean(row.locked_hint)}
                            onChange={(e) =>
                              updateCard(i, {
                                locked_hint: e.target.checked,
                                locked_hint_text: e.target.checked
                                  ? row.locked_hint_text?.trim()
                                    ? row.locked_hint_text
                                    : DEFAULT_LOCKED_HINT_TEXT
                                  : undefined,
                              })
                            }
                          />
                          <span>
                            <span className="font-medium text-zinc-800">Show unlock hint</span>
                            <span className="mt-0.5 block text-[11px] text-zinc-500">
                              Extra line under the card title (customize below).
                            </span>
                          </span>
                        </label>
                        {row.locked_hint ? (
                          <label className="flex flex-col gap-1 pl-6">
                            <span className="text-[11px] font-medium text-zinc-600">Unlock hint text</span>
                            <input
                              type="text"
                              value={row.locked_hint_text ?? ""}
                              onChange={(e) =>
                                updateCard(i, {
                                  locked_hint_text: e.target.value.slice(0, 200),
                                })
                              }
                              placeholder={DEFAULT_LOCKED_HINT_TEXT}
                              className={inputClass + " text-sm"}
                            />
                          </label>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {pageMode === "landing" && (
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
          {isEdit && link?.hero_image_path && !file && (
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
            onChange={setHeroFocusFromPan}
          />
        </div>
      )}

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

      {/* Save as preset modal */}
      {presetSaveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setPresetSaveOpen(false)}>
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-1 text-base font-semibold text-zinc-900">Save as preset</h2>
            <p className="mb-4 text-sm text-zinc-500">
              Saves your current display name, handle, bio, hero and card photos, layout, and framing as a reusable
              preset (images are copied into preset storage — not tied to this link&apos;s slug).
            </p>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-zinc-700">Preset name</span>
              <input
                autoFocus
                type="text"
                value={presetSaveName}
                onChange={(e) => setPresetSaveName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void handleSavePreset(); }}
                placeholder="e.g. Main profile, Summer campaign…"
                className="rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2.5 text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
              />
            </label>
            {presetSaveError && (
              <p className="mt-2 text-sm text-red-600">{presetSaveError}</p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setPresetSaveOpen(false); setPresetSaveName(""); }}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={presetSavePending}
                onClick={() => void handleSavePreset()}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-500 disabled:opacity-50"
              >
                {presetSavePending ? "Saving…" : "Save preset"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load preset panel */}
      {presetLoadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setPresetLoadOpen(false)}>
          <div
            className="flex w-full max-w-md flex-col gap-4 rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-zinc-900">Load preset</h2>
              <button
                type="button"
                onClick={() => setPresetLoadOpen(false)}
                className="text-zinc-400 hover:text-zinc-600"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-zinc-500">
              Applying a preset fills in the display name, handle, bio, hero and card images, card layout, and hero
              framing. Your slug is unchanged until you save this link.
            </p>

            {presetsLoading && (
              <p className="text-sm text-zinc-500">Loading presets…</p>
            )}
            {presetsError && (
              <p className="text-sm text-red-600">{presetsError}</p>
            )}
            {!presetsLoading && presets !== null && presets.length === 0 && (
              <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-400">
                No presets yet. Fill out your landing page and click <strong>Save as preset</strong>.
              </p>
            )}
            {!presetsLoading && presets !== null && presets.length > 0 && (
              <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto">
                {presets.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50/60 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900">{p.name}</p>
                      <p className="truncate text-xs text-zinc-500">
                        {p.display_name || p.handle
                          ? [p.display_name, p.handle ? `@${p.handle}` : ""].filter(Boolean).join(" · ")
                          : "No display info"}
                        {p.landing_cards.length > 0 ? ` · ${p.landing_cards.length} card${p.landing_cards.length === 1 ? "" : "s"}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => applyPreset(p)}
                      className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-emerald-500"
                    >
                      Apply
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeletePreset(p.id)}
                      className="shrink-0 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                      aria-label="Delete preset"
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
