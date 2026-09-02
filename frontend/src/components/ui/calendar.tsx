"use client"

import * as React from "react"
import { DayPicker } from "react-day-picker"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight } from "lucide-react"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4 bg-white dark:bg-zinc-950 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4 w-full",
        caption: "flex justify-center pt-1 relative items-center mb-2",
        caption_label: "text-base font-bold text-zinc-900 dark:text-zinc-100",
        nav: "space-x-1 flex items-center",
        nav_button: "h-8 w-8 bg-transparent p-0 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg flex items-center justify-center transition-colors border border-zinc-200 dark:border-zinc-800",
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "grid grid-cols-7 mb-2 text-center",
        head_cell: "text-zinc-400 dark:text-zinc-500 font-semibold text-xs tracking-wider uppercase py-1",
        row: "grid grid-cols-7 mt-1 gap-1",
        cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 flex items-center justify-center",
        day: cn(
          "h-10 w-10 p-0 font-medium rounded-full transition-all flex items-center justify-center text-zinc-800 dark:text-zinc-200 hover:bg-violet-100 dark:hover:bg-violet-950/50 hover:text-violet-700 dark:hover:text-violet-300 focus:outline-none"
        ),
        day_selected:
          "bg-violet-600 text-white font-bold hover:bg-violet-700 hover:text-white focus:bg-violet-600 focus:text-white shadow-md shadow-violet-500/20 scale-105",
        day_today: "bg-zinc-100 dark:bg-zinc-800 font-bold text-violet-600 dark:text-violet-400 ring-2 ring-violet-500/20",
        day_outside: "text-zinc-300 dark:text-zinc-700 opacity-40 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-zinc-300 dark:text-zinc-700 opacity-30 cursor-not-allowed hover:bg-transparent hover:text-zinc-300",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
