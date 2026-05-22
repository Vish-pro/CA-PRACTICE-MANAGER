"use client"

import * as React from "react"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string
  onChange?: (value: string) => void
  onClear?: () => void
}

export function SearchInput({ className, value = "", onChange, onClear, ...props }: SearchInputProps) {
  const [internalValue, setInternalValue] = React.useState(value)

  React.useEffect(() => {
    setInternalValue(value)
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInternalValue(e.target.value)
    onChange?.(e.target.value)
  }

  const handleClear = () => {
    setInternalValue("")
    onChange?.("")
    onClear?.()
  }

  return (
    <div className={cn("relative flex items-center", className)}>
      <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
      <input
        type="text"
        className="w-full pl-9 pr-9 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
        value={internalValue}
        onChange={handleChange}
        {...props}
      />
      {internalValue && (
        <button
          onClick={handleClear}
          className="absolute right-3 p-0.5 rounded-full text-muted-foreground hover:bg-muted transition-colors"
          type="button"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}
