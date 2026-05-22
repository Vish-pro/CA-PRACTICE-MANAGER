# PRABANDH — Fix Specification (Round 5 — QA Session 3)

> Hand this to Jules alongside FIX_SPEC.md, fix2.md. Same rules apply.
> Do not refactor anything not listed. Tailwind only. No new libraries.

---

## ISSUE 1 — Tasks: "Mark Overdue" Button Must Not Show When Task Is Already Overdue

**Page:** `/tasks/list` — Task Detail Drawer
**File:** `src/app/(dashboard)/tasks/list/page.tsx`

### Problem
The Task Detail drawer currently shows a "Mark Overdue" button regardless of current status. If a task is already `OVERDUE` (either auto-computed from due date or manually set), the button is useless and confusing.

Screenshot shows: task with status `Overdue` + `OD` badge still shows the "Mark Overdue" button.

### Fix

In the Status Actions section of the Task Detail drawer, find:

```tsx
<button onClick={() => handleUpdateStatus('OVERDUE')} className="...">Mark Overdue</button>
```

Wrap it in a condition — only show when the task is NOT already overdue AND NOT completed AND NOT cancelled:

```tsx
{!['OVERDUE', 'COMPLETED', 'CANCELLED'].includes(selectedTask.status) && (
  <button
    onClick={() => handleUpdateStatus('OVERDUE')}
    className="px-4 py-2 border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 rounded-md text-sm font-medium"
  >
    Mark Overdue
  </button>
)}
```

Also: when a task's status is `OVERDUE`, the only sensible workflow buttons are:
- If the user wants to resume work: `[Mark In Progress]`
- Global: `[Cancel Task]`

So add this case to the status action buttons:

```tsx
{selectedTask.status === 'OVERDUE' && (
  <button
    onClick={() => handleUpdateStatus('IN_PROGRESS')}
    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium"
  >
    Resume — Mark In Progress
  </button>
)}
```

---

## ISSUE 2 — Tasks: When "Mark Overdue" Is Clicked Manually, Set Due Date to Yesterday

**File:** `src/app/(dashboard)/tasks/list/page.tsx`
**File:** `src/app/api/tasks/[id]/route.ts`

### Problem
When a user manually clicks "Mark Overdue", the task status changes to OVERDUE but the due date stays at whatever it was. The due date should automatically be set to yesterday — because if something is being manually flagged overdue, it means it was due before today.

### Fix — Part A: API (PUT /api/tasks/[id])

**File:** `src/app/api/tasks/[id]/route.ts`

In the PUT handler, after reading `body.status`, add logic:

```ts
let dueDate = body.dueDate ? new Date(body.dueDate) : undefined;

// If manually marking as OVERDUE and no explicit due date provided,
// set due date to yesterday
if (body.status === 'OVERDUE' && !body.dueDate) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(23, 59, 59, 0);
  dueDate = yesterday;
}
```

Then use `dueDate` in the `prisma.task.update` call:

```ts
const task = await prisma.task.update({
  where: { id: resolvedParams.id },
  data: {
    title: body.title,
    description: body.description,
    status: body.status,
    priority: body.priority,
    dueDate: dueDate,
    assignedToId: body.assignedToId,
    reviewerId: body.reviewerId,
    completedAt: body.status === 'COMPLETED' ? new Date() : null,
  }
});
```

### Fix — Part B: UI refresh after marking overdue

**File:** `src/app/(dashboard)/tasks/list/page.tsx`

The `handleUpdateStatus` function currently calls `handleRowClick(selectedTask)` after updating — this re-fetches the task from the API so the new due date will show automatically. No further UI change needed here.

---

## ISSUE 3 — Cancel Task: Require Typed Name Confirmation (App-Wide Pattern)

### Problem
"Cancel Task" is a destructive irreversible action. Currently it has no confirmation at all. The requirement is a modal where the user must **type their own name** (the logged-in profile owner's name) before the action proceeds. This pattern must be used consistently across the app for all destructive actions.

### Step 1 — Build a reusable `<ConfirmByTyping>` modal component

**File to create:** `src/components/ui/confirm-by-typing.tsx`

```tsx
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

interface ConfirmByTypingProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmName: string;          // The name the user must type — usually session.user.name
  actionLabel?: string;         // Text on the confirm button, default "Confirm"
  actionClassName?: string;     // CSS override for the confirm button
}

export function ConfirmByTyping({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmName,
  actionLabel = "Confirm",
  actionClassName,
}: ConfirmByTypingProps) {
  const [typed, setTyped] = useState("");

  if (!open) return null;

  const isMatch = typed.trim().toLowerCase() === confirmName.trim().toLowerCase();

  const handleConfirm = () => {
    if (!isMatch) return;
    onConfirm();
    setTyped("");
    onClose();
  };

  const handleClose = () => {
    setTyped("");
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-card border rounded-xl shadow-2xl p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>

        {/* Typing prompt */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Type your name <span className="font-bold text-foreground">"{confirmName}"</span> to confirm:
          </label>
          <input
            autoFocus
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm(); if (e.key === 'Escape') handleClose(); }}
            placeholder={`Type "${confirmName}" here...`}
            className={cn(
              "w-full p-2.5 border rounded-md text-sm transition-colors focus:outline-none focus:ring-2",
              isMatch
                ? "border-red-400 focus:ring-red-200 bg-red-50"
                : "border-border focus:ring-primary/30"
            )}
          />
          {typed.length > 0 && !isMatch && (
            <p className="text-xs text-red-500">Name does not match. Check capitalisation.</p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={handleClose}
            className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted transition-colors"
          >
            Go Back
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isMatch}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
              actionClassName || "bg-red-600 text-white hover:bg-red-700"
            )}
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </>
  );
}
```

### Step 2 — Use `ConfirmByTyping` for Cancel Task in the Task Detail drawer

**File:** `src/app/(dashboard)/tasks/list/page.tsx`

#### 2a. Import the component and get the session name

Add import:
```ts
import { ConfirmByTyping } from "@/components/ui/confirm-by-typing";
import { useSession } from "next-auth/react";
```

Add near the top of the component:
```ts
const { data: session } = useSession();
const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
const [taskToCancel, setTaskToCancel] = useState<any>(null);
```

#### 2b. Replace the Cancel Task button

Find in the Task Detail drawer:
```tsx
<button onClick={() => handleUpdateStatus('CANCELLED')} className="px-4 py-2 border hover:bg-muted rounded-md text-sm font-medium">Cancel Task</button>
```

Replace with:
```tsx
{!['COMPLETED', 'CANCELLED'].includes(selectedTask.status) && (
  <button
    onClick={() => { setTaskToCancel(selectedTask); setIsCancelConfirmOpen(true); }}
    className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-md text-sm font-medium transition-colors"
  >
    Cancel Task
  </button>
)}
```

#### 2c. Add the confirmation modal at the bottom of the component JSX

Place this OUTSIDE all SlideOver components, at the very end of the returned JSX before the closing `</div>`:

```tsx
<ConfirmByTyping
  open={isCancelConfirmOpen}
  onClose={() => { setIsCancelConfirmOpen(false); setTaskToCancel(null); }}
  onConfirm={async () => {
    if (!taskToCancel) return;
    await fetch(`/api/tasks/${taskToCancel.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CANCELLED' }),
    });
    setIsDetailOpen(false);
    fetchTasks();
    fetchStats();
  }}
  title="Cancel Task"
  description={`This will cancel task #TSK${String(taskToCancel?.taskNumber || 0).padStart(5, '0')}. This action cannot be undone.`}
  confirmName={session?.user?.name || "Admin"}
  actionLabel="Yes, Cancel Task"
/>
```

### Step 3 — Apply the same pattern to Delete Lead

**File:** `src/app/(dashboard)/leads/page.tsx`

The "Delete Lead" button in the Lead Detail drawer currently calls `handleDeleteLead()` directly after a `confirm()` browser dialog. Replace with `ConfirmByTyping`.

Add import:
```ts
import { ConfirmByTyping } from "@/components/ui/confirm-by-typing";
import { useSession } from "next-auth/react";
```

Add state:
```ts
const { data: session } = useSession();
const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
```

Replace the Delete Lead button:
```tsx
<button
  onClick={() => setIsDeleteConfirmOpen(true)}
  className="w-full py-2.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-md text-sm font-medium transition-colors mt-4"
>
  Delete Lead
</button>
```

Add the confirmation modal at the end of the JSX:
```tsx
<ConfirmByTyping
  open={isDeleteConfirmOpen}
  onClose={() => setIsDeleteConfirmOpen(false)}
  onConfirm={async () => {
    if (!selectedLead) return;
    await fetch(`/api/leads/${selectedLead.id}`, { method: 'DELETE' });
    setIsDetailOpen(false);
    setIsDeleteConfirmOpen(false);
    fetchLeads();
  }}
  title="Delete Lead"
  description={`Permanently delete "${selectedLead?.businessName}"? All lead data will be lost.`}
  confirmName={session?.user?.name || "Admin"}
  actionLabel="Yes, Delete Lead"
/>
```

Remove the old `confirm()` browser dialog from `handleDeleteLead` — it is no longer needed since `ConfirmByTyping` handles confirmation.

### Step 4 — Apply the same pattern to Service Delete

**File:** `src/app/(dashboard)/services/page.tsx`

The `handleDeleteService` function currently uses `if (!confirm("...")) return;`. Replace with `ConfirmByTyping`.

Add imports:
```ts
import { ConfirmByTyping } from "@/components/ui/confirm-by-typing";
import { useSession } from "next-auth/react";
```

Add state:
```ts
const { data: session } = useSession();
const [isDeleteServiceOpen, setIsDeleteServiceOpen] = useState(false);
const [serviceToDelete, setServiceToDelete] = useState<any>(null);
```

In the Actions column cell renderer, change the Delete button from calling `handleDeleteService(row.id)` directly to:
```tsx
<button
  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
  onClick={() => { setServiceToDelete(row); setIsDeleteServiceOpen(true); }}
>
  Delete
</button>
```

Add confirmation modal at end of JSX:
```tsx
<ConfirmByTyping
  open={isDeleteServiceOpen}
  onClose={() => { setIsDeleteServiceOpen(false); setServiceToDelete(null); }}
  onConfirm={async () => {
    if (!serviceToDelete) return;
    await fetch(`/api/services/${serviceToDelete.id}`, { method: 'DELETE' });
    fetchServices();
  }}
  title="Delete Service"
  description={`Permanently delete "${serviceToDelete?.name}"? This cannot be undone.`}
  confirmName={session?.user?.name || "Admin"}
  actionLabel="Yes, Delete Service"
/>
```

Remove the `confirm()` call from `handleDeleteService`.

---

## RULE: Where to Apply `ConfirmByTyping` Going Forward

Any button in this app that is:
- Labelled "Delete", "Cancel", "Remove", or "Reject" on a primary record (not a list filter or form cancel)
- Irreversible or hard to reverse

Must use `ConfirmByTyping` instead of a browser `confirm()` dialog or no confirmation at all.

Current locations to apply (above covers Tasks, Leads, Services):
- Future: Delete Client, Cancel Invoice, Delete SOP step (optional — SOP is low-stakes, skip)

---

## BUILD ORDER FOR THIS DOCUMENT

After all previous fixes (FIX_SPEC.md rounds 1–3, fix2.md):

28. Issue 1 — Hide "Mark Overdue" when task is already overdue; show "Resume" button instead
29. Issue 2 — Set due date to yesterday when manually marking overdue (API change)
30. Issue 3 — Build `<ConfirmByTyping>` component
31. Issue 3 — Wire Cancel Task in tasks drawer
32. Issue 3 — Wire Delete Lead in leads drawer
33. Issue 3 — Wire Delete Service in services page

---

## DO NOT TOUCH

- Do not change the shared `<DataTable>` component.
- Do not change `prisma/schema.prisma`.
- Do not install any date libraries — use native `Date` for yesterday calculation.
- The `ConfirmByTyping` component must be a client component (`"use client"`) but must not have any server-side imports.

---

## VERIFICATION

- [ ] Task with status OVERDUE: "Mark Overdue" button is absent. "Resume — Mark In Progress" button is present.
- [ ] Task with status COMPLETED or CANCELLED: both "Mark Overdue" and "Cancel Task" buttons are absent.
- [ ] Clicking "Mark Overdue" on a PENDING/IN_PROGRESS task → status becomes OVERDUE, due date becomes yesterday.
- [ ] Clicking "Cancel Task" → modal appears with name prompt. Confirm button disabled until correct name typed. On confirm, task status = CANCELLED and drawer closes.
- [ ] Clicking "Delete Lead" → same modal behaviour.
- [ ] Clicking "Delete Service" (unlocked only) → same modal behaviour.
- [ ] Pressing Escape on the modal closes it without taking action.
- [ ] Pressing Enter when name matches triggers confirm.
- [ ] `npx tsc --noEmit` passes with no errors.
