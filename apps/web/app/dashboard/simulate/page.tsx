import { SimulatePanel } from "@/components/simulate-panel"

export default function SimulatePage() {
  return (
    <div className="px-4 py-6 lg:px-6 md:py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Try It Yourself</h1>
      <p className="mt-1.5 mb-8 text-base text-muted-foreground">
        Create a real Razorpay Test Mode order and watch NIFFLER recover it live.
      </p>
      <SimulatePanel />
    </div>
  )
}
