"use client";

import { recordClick } from "@/app/actions/track-click";
import { useEffect, useRef } from "react";

export function VisitorTracker({ linkId }: { linkId: string }) {
  const recorded = useRef(false);

  useEffect(() => {
    if (recorded.current) return;
    recorded.current = true;
    void recordClick(linkId);
  }, [linkId]);

  return null;
}
