"use client";

import { AnimatePresence, motion } from "motion/react";
import { usePathname, useSelectedLayoutSegment } from "next/navigation";
import { LayoutRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { CloudShader } from "@/components/ui/cloud-shader";

const NavigationPendingContext = createContext<(pending: boolean) => void>(
  () => {},
);
export function useSetNavigationPending() {
  return useContext(NavigationPendingContext);
}

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

export function LayoutTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isPending, setIsPending] = useState(false);

  return (
    <NavigationPendingContext.Provider value={setIsPending}>
      <CloudShader
        className="fixed inset-0 -z-10"
        cloudColor="#eef3f5"
        skyTopColor="#0a1f2e"
        skyBottomColor="#1f7fae"
        speed={0.6}
      />
      <div
        aria-hidden
        className="fixed inset-0 -z-10 bg-gradient-to-t from-background via-background/45 to-transparent"
      />
      {isPending && <div aria-hidden className="fixed inset-0 z-30" />}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: isPending ? 0 : 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          <FrozenRouter>{children}</FrozenRouter>
        </motion.div>
      </AnimatePresence>
    </NavigationPendingContext.Provider>
  );
}
