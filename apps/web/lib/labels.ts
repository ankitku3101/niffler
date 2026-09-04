// Plain module, deliberately not inside a "use client" component: a server component that imports
// a value from a client module gets a reference proxy, so these lookups would silently return undefined.
export const RECOMMENDED_ACTION_LABELS: Record<string, string> = {
  CAPTURE_PAYMENT: "Take the payment",
  RECOVERY_LINK: "Send a payment link",
  ESCALATE: "Ask a person",
  STOP: "Stop here",
}

export const DECISION_VARIANT: Record<string, "outline" | "destructive" | "secondary"> = {
  ALLOWED: "outline",
  DENIED: "destructive",
  REQUIRES_HUMAN_APPROVAL: "secondary",
}
