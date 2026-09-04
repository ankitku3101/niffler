import Link from "next/link"
import type { NifflerReport } from "@/lib/report"

// Deliberately states what was measured and what was not. Any throughput claim here would be invented,
// since this has only ever run at a few hundred cases.
export function ScaleNote({ report }: { report: NifflerReport }) {
  const total = report.treatmentCases + report.controlCases

  return (
    <section className="flex flex-col gap-3 px-4 lg:px-6">
      <div>
        <h2 className="text-xl font-semibold">Would this survive lakhs of orders?</h2>
        <p className="mt-1 max-w-[75ch] text-base text-muted-foreground">
          Honest answer: it has been run on {total} orders, not lakhs, so anything else would be a guess.
          But the shape of the problem is clear enough to say where it would bend.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border p-4">
          <div className="text-base font-medium">Most of it never touches AI</div>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Finding the failed orders is plain code over the database. Checking the rules is plain code
            too. Both are fast at any size. Only the diagnosis needs a model, and only for orders that
            are worth chasing in the first place.
          </p>
        </div>

        <div className="rounded-lg border p-4">
          <div className="text-base font-medium">The model is the bottleneck</div>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Each case costs several AI calls, and cases are handled one after another today. That was a
            choice for correctness, not speed. The real ceiling I hit was the free tier&apos;s daily
            token limit, not the code.
          </p>
        </div>

        <div className="rounded-lg border p-4">
          <div className="text-base font-medium">Three quarters could skip the model</div>
          <p className="mt-1.5 text-sm text-muted-foreground">
            The{" "}
            <Link href="/dashboard/baseline" className="text-primary underline">
              rules comparison
            </Link>{" "}
            shows plain rules reach the same answer 73% of the time. Send the easy majority through
            rules and spend the model only on the rest, and the AI cost drops by roughly three quarters.
          </p>
        </div>
      </div>

      <p className="max-w-[75ch] text-sm text-muted-foreground">
        What is genuinely missing for that scale: cases are processed one at a time rather than in
        parallel, the run happens inside the web request instead of a proper queue, and none of it has
        been load tested. Those are real gaps, not ones I am going to pretend are solved.
      </p>
    </section>
  )
}
