import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { LandingHeader } from "@/components/landing-header";
import { LinkPendingBridge } from "@/components/link-pending-bridge";
import { NifflerMark } from "@/components/niffler-mark";
import { FaGithub } from "react-icons/fa";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col text-foreground">
      <LandingHeader />

      <section className="relative flex min-h-[clamp(75vh,92dvh,100dvh)] items-end overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-background via-background/45 to-transparent"
        />
        <div className="relative mx-auto w-full max-w-6xl px-6 pt-16 pb-24">
          <h1 className="max-w-2xl animate-[hero-in_0.6s_cubic-bezier(0.16,1,0.3,1)_both] font-heading text-[clamp(2.75rem,5vw+1rem,5.25rem)] leading-[1.05] font-medium tracking-[-0.03em] text-foreground motion-reduce:animate-none">
            Revenue doesn&rsquo;t vanish. It hides.
          </h1>
          {/* Theme token, not a fixed white — the shader behind this is a bright sky in light mode. */}
          <p className="mt-6 max-w-[46ch] animate-[hero-in_0.6s_cubic-bezier(0.16,1,0.3,1)_0.12s_both] text-lg leading-[1.5] text-foreground/75 motion-reduce:animate-none">
            An AI agent that wins back failed payments, with a fixed set of
            rules standing between it and your money.
          </p>
        </div>
      </section>

      <section className="flex-1 bg-background">
        <div className="mx-auto w-full max-w-6xl px-6 py-20">
          <p className="max-w-[65ch] text-lg leading-[1.6] text-muted-foreground">
            When a customer tries to pay and it fails, that money is not always
            gone. NIFFLER looks at each failed payment, works out why it failed,
            and picks one thing to do about it: send a payment link, take money
            that was already approved, ask a person, or stop.
          </p>
          <p className="mt-5 max-w-[65ch] text-lg leading-[1.6] text-muted-foreground">
            It never gets to act on its own. Every choice is checked against a
            fixed set of rules first, and the rules can say no.
          </p>
          <p className="mt-6 font-mono text-xs tracking-[0.08em] text-muted-foreground uppercase">
            Detect → Investigate → Diagnose → Decide → Policy check → Act →
            Observe
          </p>
          <Link href="/dashboard/welcome" className="group mt-10 inline-block">
            <LinkPendingBridge />
            <HoverBorderGradient
              as="div"
              containerClassName="rounded-full"
              className="flex items-center gap-2 bg-white text-sm font-medium text-black dark:bg-black dark:text-white"
            >
              See NIFFLER in action
              <ArrowRightIcon className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
            </HoverBorderGradient>
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/70 bg-background">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="font-heading font-medium text-foreground/80">
            <span className="flex items-center gap-2">
              <NifflerMark size={22} className="size-5.5" />
              NIFFLER
            </span>
            <p className="mt-1 flex gap-1">
              <FaGithub className="size-4" /> 
              <Link href={'https://github.com/ankitku3101/niffler'} target="_blank" className="underline" >
                ankitku3101/niffler
              </Link>
            </p>
          </div>
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
