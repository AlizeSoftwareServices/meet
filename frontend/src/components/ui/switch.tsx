"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  size = "default",
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: "sm" | "default"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 items-center rounded-full border-2 border-transparent transition-colors outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 bg-zinc-300 dark:bg-zinc-700 data-[checked]:bg-blue-600 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
        size === "sm" ? "h-5 w-9" : "h-6 w-11",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full bg-white shadow-md ring-0 transition-transform",
          size === "sm"
            ? "h-4 w-4 group-data-[checked]/switch:translate-x-4 translate-x-0"
            : "h-5 w-5 group-data-[checked]/switch:translate-x-5 translate-x-0"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
