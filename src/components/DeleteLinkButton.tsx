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
      className="rounded-xl border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50"
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
