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
      className={cn("p-4 bg-white dark:bg-zinc-950 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 w-full", className)}
      classNames={{
        months: "w-full",
        month: "space-y-4 w-full relative",
        
        // Month Title & Navigation Header
        caption: "flex justify-center items-center relative mb-4 h-9",
        month_caption: "flex justify-center items-center relative mb-4 h-9",
        caption_label: "text-base font-bold text-zinc-900 dark:text-zinc-100",
        nav: "flex items-center justify-between absolute inset-x-0 top-0 h-9 pointer-events-none px-1",
        button_previous: "h-8 w-8 bg-transparent p-0 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg flex items-center justify-center transition-colors border border-zinc-200 dark:border-zinc-800 pointer-events-auto",
        button_next: "h-8 w-8 bg-transparent p-0 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg flex items-center justify-center transition-colors border border-zinc-200 dark:border-zinc-800 pointer-events-auto",
        nav_button: "h-8 w-8 bg-transparent p-0 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg flex items-center justify-center transition-colors border border-zinc-200 dark:border-zinc-800 pointer-events-auto",
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",

        // Calendar Grid Table (table-fixed guarantees every column is exactly 1/7 = 14.285%)
        month_grid: "w-full border-collapse table-fixed my-2",
        table: "w-full border-collapse table-fixed my-2",

        // Weekday Header Row & Cells (SU, MO, TU, WE, TH, FR, SA)
        weekdays: "w-full",
        head_row: "w-full",
        weekday: "text-zinc-400 dark:text-zinc-500 font-bold text-xs tracking-wider uppercase py-2 text-center w-[14.2857%] align-middle",
        head_cell: "text-zinc-400 dark:text-zinc-500 font-bold text-xs tracking-wider uppercase py-2 text-center w-[14.2857%] align-middle",

        // Week Rows & Day Cells
        weeks: "w-full space-y-1",
        week: "w-full",
        row: "w-full",
        day: "relative p-1 text-center text-sm w-[14.2857%] align-middle",
        cell: "relative p-1 text-center text-sm w-[14.2857%] align-middle",

        // Day Number Button
        day_button: cn(
          "h-9 w-9 sm:h-10 sm:w-10 p-0 font-medium rounded-full transition-all flex items-center justify-center text-zinc-800 dark:text-zinc-200 hover:bg-violet-100 dark:hover:bg-violet-950/50 hover:text-violet-700 dark:hover:text-violet-300 focus:outline-none mx-auto cursor-pointer"
        ),

        // States
        selected: "bg-violet-600 text-white font-bold hover:bg-violet-700 hover:text-white focus:bg-violet-600 focus:text-white shadow-md shadow-violet-500/20 scale-105",
        day_selected: "bg-violet-600 text-white font-bold hover:bg-violet-700 hover:text-white focus:bg-violet-600 focus:text-white shadow-md shadow-violet-500/20 scale-105",
        today: "bg-zinc-100 dark:bg-zinc-800 font-bold text-violet-600 dark:text-violet-400 ring-2 ring-violet-500/20",
        day_today: "bg-zinc-100 dark:bg-zinc-800 font-bold text-violet-600 dark:text-violet-400 ring-2 ring-violet-500/20",
        outside: "text-zinc-300 dark:text-zinc-700 opacity-40 pointer-events-none",
        day_outside: "text-zinc-300 dark:text-zinc-700 opacity-40 pointer-events-none",
        disabled: "text-zinc-300 dark:text-zinc-700 opacity-30 cursor-not-allowed hover:bg-transparent hover:text-zinc-300",
        day_disabled: "text-zinc-300 dark:text-zinc-700 opacity-30 cursor-not-allowed hover:bg-transparent hover:text-zinc-300",
        hidden: "invisible",
        day_hidden: "invisible",
        ...classNames,
      } as any}
      components={{
        IconLeft: ({ ...props }: any) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ...props }: any) => <ChevronRight className="h-4 w-4" />,
        Chevron: ({ orientation }: any) => orientation === 'left' ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />,
      } as any}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
