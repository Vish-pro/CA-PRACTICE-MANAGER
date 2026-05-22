"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface CategoryPillsProps {
  categories: string[]
  active: string
  onChange: (category: string) => void
  className?: string
}

export function CategoryPills({ categories, active, onChange, className }: CategoryPillsProps) {
  return (
    <div className={cn("flex flex-nowrap overflow-x-auto pb-2 -mb-2 gap-2 snap-x scrollbar-hide", className)}>
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className={cn(
            "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors snap-start",
            active === cat
              ? "bg-primary text-primary-foreground shadow-sm"
              : "border bg-background text-muted-foreground hover:bg-muted"
          )}
        >
          {cat}
        </button>
      ))}
    </div>
  )
}
