import * as React from "react"
import { cn } from "@/lib/utils"

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string
  size?: "sm" | "md" | "lg"
}

const colors = [
  "bg-red-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-green-500",
  "bg-emerald-500",
  "bg-teal-500",
  "bg-cyan-500",
  "bg-blue-500",
  "bg-indigo-500",
  "bg-violet-500",
  "bg-purple-500",
  "bg-fuchsia-500",
  "bg-pink-500",
  "bg-rose-500",
]

function hashCode(str: string) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

function getInitials(name: string) {
  const parts = name.split(" ").filter(Boolean)
  if (parts.length === 0) return "??"
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function Avatar({ name, size = "md", className, ...props }: AvatarProps) {
  const hash = hashCode(name)
  const colorClass = colors[hash % colors.length]
  const initials = getInitials(name)

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full text-white font-semibold",
        colorClass,
        {
          "w-6 h-6 text-[10px]": size === "sm",
          "w-8 h-8 text-xs": size === "md",
          "w-12 h-12 text-base": size === "lg",
        },
        className
      )}
      title={name}
      {...props}
    >
      {initials}
    </div>
  )
}
