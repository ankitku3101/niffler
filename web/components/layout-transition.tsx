"use client";

import { AnimatePresence, motion } from "motion/react";
import { usePathname, useSelectedLayoutSegment } from "next/navigation";
import { LayoutRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useContext, useEffect, useRef } from "react";

function usePreviousValue<T>(value: T): T | undefined {
  const prevValue = useRef<T | undefined>(undefined);
  useEffect(() => {
    prevValue.current = value;
    return () => {
      prevValue.current = undefined;
    };
  });
  return prevValue.current;
}

/**
 * Next.js's router context updates the instant a navigation starts — before
 * the exit animation below gets a chance to play. Without this, the leaving
 * page's own route-sensitive hooks would already see the NEW route mid-exit,
 * which can unmount its children abruptly instead of letting them animate
 * out. Freezing the context to its previous value for the duration of one
 * exit keeps the leaving page's content stable while it fades. This reaches
 * into a Next.js internal (not a public API) — a known, widely-used
 * community workaround for a gap the App Router itself doesn't fill; if a
 * future Next.js version relocates it, this is the one place that breaks.
 */
function FrozenRouter({ children }: { children: React.ReactNode }) {
  const context = useContext(LayoutRouterContext);
  const prevContext = usePreviousValue(context);
  const segment = useSelectedLayoutSegment();
  const prevSegment = usePreviousValue(segment);
  const changed =
    segment !== prevSegment &&
    segment !== undefined &&
    prevSegment !== undefined;
  const frozen = changed && prevContext ? prevContext : context;

  return (
    <LayoutRouterContext.Provider value={frozen}>
      {children}
    </LayoutRouterContext.Provider>
  );
}

const DISTANCE = 24;

/**
 * A directional crossfade: the entering page settles in from slightly left
 * of centre while the leaving page fades out drifting slightly right — one
 * consistent rightward motion rather than a hard slide. Keyed on pathname
 * (not useSelectedLayoutSegment — this site is two flat routes, and a null
 * segment for "/" would make an unreliable AnimatePresence key).
 */
export function LayoutTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, x: -DISTANCE }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: DISTANCE }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <FrozenRouter>{children}</FrozenRouter>
      </motion.div>
    </AnimatePresence>
  );
}
