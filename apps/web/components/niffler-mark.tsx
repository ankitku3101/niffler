import Image from "next/image"
import { cn } from "@/lib/utils"

// Black linework plus a white body fill on transparent, so it reads on both themes without a variant.
// alt is empty because every usage sits beside the NIFFLER wordmark.
export function NifflerMark({
  size = 24,
  className,
}: {
  size?: number
  className?: string
}) {
  return (
    <Image
      src="/niffler-mark.png"
      alt=""
      width={size}
      height={size}
      priority
      className={cn("shrink-0 object-contain", className)}
    />
  )
}
