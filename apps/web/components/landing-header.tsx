"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ModeToggle } from "@/components/mode-toggle";
import { LinkPendingBridge } from "@/components/link-pending-bridge";
import { cn } from "@/lib/utils";

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-20 border-b transition-colors duration-300 ease-out",
        scrolled
          ? "border-border/70 bg-background/75 backdrop-blur-sm"
          : "border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <span
          className={cn(
            "font-heading text-sm font-semibold tracking-[0.02em] transition-colors duration-300 ease-out",
            scrolled ? "text-foreground" : "text-white",
          )}
        >
          NIFFLER
        </span>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/welcome"
            className={cn(
              "inline-flex h-9 items-center whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]",
              scrolled
                ? "border-border text-foreground/90 hover:bg-accent hover:text-accent-foreground"
                : "border-white/30 text-white hover:border-white hover:bg-white/10",
            )}
          >
            <LinkPendingBridge />
            Dashboard
          </Link>
          <ModeToggle
            className={cn(
              "cursor-pointer rounded-full",
              !scrolled &&
                "border-white/30 text-white hover:bg-white/10 hover:text-white",
            )}
          />
        </div>
      </div>
    </header>
  );
}
