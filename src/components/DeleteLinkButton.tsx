"use client";

import { deleteLink } from "@/app/actions/links";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteLinkButton({ linkId }: { linkId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      className="rounded-lg border border-red-900/60 px-2.5 py-1 text-xs text-red-300 transition hover:bg-red-950/50 disabled:opacity-50"
      onClick={() => {
        if (!confirm("Delete this link and all click history?")) return;
        setPending(true);
        void (async () => {
          const r = await deleteLink(linkId);
          setPending(false);
          if (r.error) alert(r.error);
          else router.refresh();
        })();
      }}
    >
      Delete
    </button>
  );
}
