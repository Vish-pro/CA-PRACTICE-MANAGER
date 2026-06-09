import * as React from "react"
import { cn } from "@/lib/utils"

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: string
}

const statusMap: Record<string, { bg: string; text: string; label: string }> = {
  PENDING: { bg: "bg-gray-100", text: "text-gray-700", label: "Pending" },
  IN_PROGRESS: { bg: "bg-blue-100", text: "text-blue-700", label: "In Progress" },
  SENT_FOR_REVIEW: { bg: "bg-sky-100", text: "text-sky-700", label: "Sent for Review" },
  REQUEST_CHANGES: { bg: "bg-indigo-100", text: "text-indigo-700", label: "Request Changes" },
  COMPLETED: { bg: "bg-green-100", text: "text-green-700", label: "Completed" },
  OVERDUE: { bg: "bg-orange-100", text: "text-orange-700", label: "Overdue" },
  CANCELLED: { bg: "bg-red-100", text: "text-red-700", label: "Cancelled" },
  ACTIVE: { bg: "bg-green-100", text: "text-green-700", label: "Active" },
  INACTIVE: { bg: "bg-gray-100", text: "text-gray-500", label: "Inactive" },
  NEW: { bg: "bg-blue-50", text: "text-blue-600", label: "New" },
  CONTACTED: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Contacted" },
  QUALIFIED: { bg: "bg-purple-100", text: "text-purple-700", label: "Qualified" },
  CONVERTED: { bg: "bg-green-100", text: "text-green-700", label: "Converted" },
  LOST: { bg: "bg-red-100", text: "text-red-600", label: "Lost" },
  // Advanced CA Practice Sub-statuses
  REVIEW_REJECTED: { bg: "bg-[#fee2e2]", text: "text-[#991b1b]", label: "Review Rejected" },
  PEER_REVIEW: { bg: "bg-[#dbeafe]", text: "text-[#1e40af]", label: "Peer Review Pending" },
  MANAGEMENT_SIGNOFF: { bg: "bg-[#fef3c7]", text: "text-[#92400e]", label: "Management Sign-off Awaited" },
  PORTAL_GLITCH: { bg: "bg-[#ffedd5]", text: "text-[#c2410c]", label: "Govt Portal Down" },
  BILLING_PENDING: { bg: "bg-[#d1fae5]", text: "text-[#065f46]", label: "Filed - Billing Pending" },
}

export function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
  const upperStatus = status?.toUpperCase() || ""

  // Custom case: Active / Inactive string matches
  let key = upperStatus
  if (upperStatus === "ACTIVE" || upperStatus === "TRUE") key = "ACTIVE"
  else if (upperStatus === "INACTIVE" || upperStatus === "FALSE") key = "INACTIVE"

  const config = statusMap[key] || { bg: "bg-gray-100", text: "text-gray-700", label: status }

  return (
    <div className={cn("inline-flex items-center gap-1", className)} {...props}>
      <span
        className={cn(
          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap",
          config.bg,
          config.text
        )}
      >
        {config.label}
      </span>
      {key === "OVERDUE" && (
        <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white leading-none">
          OD
        </span>
      )}
    </div>
  )
}
