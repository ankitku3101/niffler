import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { CloudShader } from "@/components/ui/cloud-shader";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { ModeToggle } from "@/components/mode-toggle";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/75 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <span className="font-heading text-sm font-semibold tracking-[0.02em]">
            NIFFLER
          </span>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex h-9 items-center whitespace-nowrap rounded-sm border border-border px-4 text-sm font-medium text-foreground/90 transition-colors duration-200 ease-out hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            >
              Dashboard
            </Link>
            <ModeToggle className="cursor-pointer"/>
          </div>
        </div>
      </header>

      {/* Hero — Marquee: the fold is one statement, no CTA in fold. */}
      <section className="relative flex min-h-[clamp(60vh,75dvh,88dvh)] items-end overflow-hidden">
        <CloudShader
          className="absolute inset-0"
          cloudColor="#eef3f5"
          skyTopColor="#0a1f2e"
          skyBottomColor="#1f7fae"
          speed={0.6}
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-background via-background/45 to-transparent"
        />
        <div className="relative mx-auto w-full max-w-6xl px-6 pt-16 pb-24">
          <h1 className="max-w-2xl animate-[hero-in_0.6s_cubic-bezier(0.16,1,0.3,1)_both] font-heading text-[clamp(2.75rem,5vw+1rem,5.25rem)] leading-[1.05] font-medium tracking-[-0.03em] text-foreground motion-reduce:animate-none">
            Revenue doesn&rsquo;t vanish. It hides.
          </h1>
        </div>
      </section>

      <hr className="border-border" />

      {/* Below fold — the explanation and the one CTA. Same max-w-6xl frame
          as the header/hero so this block's left edge lines up with the
          headline above it; the measure cap lives on the <p> itself. */}
      <section className="mx-auto w-full max-w-6xl flex-1 px-6 py-20">
        <p className="max-w-[65ch] text-lg leading-[1.6] text-muted-foreground">
          NIFFLER is an autonomous AI agent that investigates failed
          payments (from its own synthetic dataset, and live Razorpay Test Mode),
          diagnoses why each one was lost, and proposes a recovery action: a
          payment link, a capture, an escalation, or a stop. Every action
          passes through a deterministic policy engine before it touches
          money; the model recommends, but it never decides alone.
        </p>
        <p className="mt-6 font-mono text-xs tracking-[0.08em] text-muted-foreground uppercase">
          Detect → Investigate → Diagnose → Decide → Policy check → Act →
          Observe
        </p>
        <HoverBorderGradient
          as="a"
          href="/dashboard"
          containerClassName="group mt-10 rounded-full"
          className="flex items-center gap-2 bg-white text-sm font-medium text-black dark:bg-black dark:text-white"
        >
          See NIFFLER in action
          <ArrowRightIcon className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
        </HoverBorderGradient>
      </section>

      <footer className="border-t border-border/70">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span className="font-heading font-medium text-foreground/80">
            NIFFLER
          </span>
          <p className="max-w-xl">
            Built using Razorpay Test Mode APIs. <br/> 
            Independent project inspired by Razorpay&rsquo;s AI Revenue
            Recovery Buildathon track.
          </p>
        </div>
      </footer>
    </div>
  );
}
