"use client";

import { useEffect } from "react";
import { useLinkStatus } from "next/link";
import { useSetNavigationPending } from "@/components/layout-transition";

export function LinkPendingBridge() {
  const { pending } = useLinkStatus();
  const setPending = useSetNavigationPending();

  useEffect(() => {
    setPending(pending);
    return () => setPending(false);
  }, [pending, setPending]);

  return null;
}
