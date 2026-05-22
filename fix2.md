# PRABANDH — Fix Specification (Round 4 — QA Session 2)

> Hand this document to Jules alongside FIX_SPEC.md. Build these AFTER all previous fixes are complete.
> Same rules: do not refactor anything not listed here. Tailwind only. No new libraries.
> All file paths are relative to the repo root.

---

## ISSUE 1 — Action Center: Approve / Reject Buttons Not Working

**Page:** `/action-center`
**File:** `src/app/(dashboard)/action-center/page.tsx`

The Approve and Reject buttons render but have no click handlers wired. They need to call the relevant API endpoints.

### What each item type maps to:

| Type | Approve API | Reject API |
|------|-------------|-----------|
| LEAVE | `PUT /api/hr/leaves/[id]` with `{ status: "APPROVED" }` | `PUT /api/hr/leaves/[id]` with `{ status: "REJECTED" }` |
| REIMBURSEMENT | `PUT /api/hr/reimbursements/[id]` with `{ status: "APPROVED" }` | `PUT /api/hr/reimbursements/[id]` with `{ status: "REJECTED" }` |
| INVOICE | `PUT /api/billing/invoices/[id]` with `{ status: "UNPAID" }` (promoting from PROFORMA) | No reject for invoices — hide Reject button for INVOICE type |

### Step 1 — Create the HR Leave update route

**File to create:** `src/app/api/hr/leaves/[id]/route.ts`

```ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const body = await request.json();

    const leave = await prisma.leave.update({
      where: { id },
      data: { status: body.status }
    });

    return NextResponse.json({ data: leave });
  } catch (error) {
    console.error('Failed to update leave', error);
    return NextResponse.json({ error: 'Failed to update leave' }, { status: 500 });
  }
}
```

### Step 2 — Create the Reimbursement update route

**File to create:** `src/app/api/hr/reimbursements/[id]/route.ts`

```ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const body = await request.json();

    const reimbursement = await prisma.reimbursement.update({
      where: { id },
      data: { status: body.status }
    });

    return NextResponse.json({ data: reimbursement });
  } catch (error) {
    console.error('Failed to update reimbursement', error);
    return NextResponse.json({ error: 'Failed to update reimbursement' }, { status: 500 });
  }
}
```

### Step 3 — Wire up the buttons in the Action Center page

**File to change:** `src/app/(dashboard)/action-center/page.tsx`

Read the current file first to understand its structure. Then find the Approve and Reject buttons for each card type.

Add a handler function:

```ts
const handleAction = async (item: any, action: 'approve' | 'reject') => {
  let url = '';
  let body = {};

  if (item.type === 'LEAVE') {
    url = `/api/hr/leaves/${item.id}`;
    body = { status: action === 'approve' ? 'APPROVED' : 'REJECTED' };
  } else if (item.type === 'REIMBURSEMENT') {
    url = `/api/hr/reimbursements/${item.id}`;
    body = { status: action === 'approve' ? 'APPROVED' : 'REJECTED' };
  } else if (item.type === 'INVOICE' && action === 'approve') {
    url = `/api/billing/invoices/${item.id}`;
    body = { status: 'UNPAID' };
  } else {
    return; // no action for invoice reject
  }

  await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  // Refresh the list after action
  fetchPendingItems(); // call whatever function loads the action center data
};
```

Wire the Approve button: `onClick={() => handleAction(item, 'approve')}`
Wire the Reject button: `onClick={() => handleAction(item, 'reject')}`

For INVOICE type items: hide the Reject button entirely:
```tsx
{item.type !== 'INVOICE' && (
  <button onClick={() => handleAction(item, 'reject')} ...>Reject</button>
)}
```

After a successful approve/reject, remove that item from the pending list immediately (optimistic UI) — do not wait for a refetch.

---

## ISSUE 2 — Services Page: Increase Row Spacing

**Page:** `/services`
**File:** `src/app/(dashboard)/services/page.tsx`

The table rows feel cramped. The `<DataTable>` component renders `py-3` on each `<td>`. Since DataTable is a shared component, do NOT change it globally. Instead, pass a custom row height through the existing `className` prop on the `<DataTable>` in the services page:

Change:
```tsx
<DataTable
  columns={columns}
  data={services}
  keyExtractor={(row) => row.id}
  selectable
/>
```

To:
```tsx
<DataTable
  columns={columns}
  data={services}
  keyExtractor={(row) => row.id}
  selectable
  className="[&_td]:py-4 [&_th]:py-4"
/>
```

This increases cell padding from `py-3` to `py-4` only on the services table without touching the shared component.

Also increase the gap between the category pills and the table — change the `space-y-6` wrapper to `space-y-8` on the services page root `<div>`.

---

## ISSUE 3 — Services Page: Lock Icon Has No Explanation

**Page:** `/services`
**File:** `src/app/(dashboard)/services/page.tsx`

The lock icon (🔒) appears next to locked services (e.g. "24Q (Salary TDS Return) 🔒") but users don't know what it means.

**Fix:** Add a `title` tooltip to the lock icon so hovering shows an explanation.

Find in the Service column cell renderer:
```tsx
{row.isLocked && <Lock className="w-3 h-3 text-muted-foreground" />}
```

Replace with:
```tsx
{row.isLocked && (
  <Lock
    className="w-3 h-3 text-muted-foreground shrink-0"
    title="System default service — cannot be deleted"
  />
)}
```

Also add a small legend line below the category pills (above the table), right-aligned:
```tsx
<div className="flex justify-end">
  <span className="flex items-center gap-1 text-xs text-muted-foreground">
    <Lock className="w-3 h-3" /> System default — cannot be deleted
  </span>
</div>
```

Place this between the `<CategoryPills>` and the `<DataTable>` in the services page JSX.

---

## ISSUE 4 — Services Page: Add "Client Count" Column

**Page:** `/services`
**File to change:** `src/app/api/services/route.ts` + `src/app/(dashboard)/services/page.tsx`

### Step 1 — Return client count from the API

**File:** `src/app/api/services/route.ts`

In the `GET` handler, the Prisma query already does `include: { _count: { select: { sopSteps: true, tasks: true } } }`.

Add `clientRateCards: true` to the `_count` select:

```ts
include: {
  _count: {
    select: { sopSteps: true, tasks: true, rateCards: true }
  }
}
```

Then in the `data` mapping:
```ts
const data = services.map(s => ({
  ...s,
  hasSOP: s._count.sopSteps > 0,
  hasSubtasks: s._count.tasks > 0,
  clientCount: s._count.rateCards,  // ← add this
}));
```

> Note: `rateCards` in the schema is `ClientRateCard[]` — each record represents one client assigned to this service. This is the count to show.

### Step 2 — Add the column to the table

**File:** `src/app/(dashboard)/services/page.tsx`

In the `columns` array, add a new column BETWEEN the "Professional Fee" column and the "SOP" column:

```tsx
{
  header: "Clients",
  accessorKey: "clientCount",
  cell: (row) => (
    <span className={cn(
      "px-2 py-0.5 rounded-full text-xs font-semibold",
      row.clientCount > 0
        ? "bg-blue-100 text-blue-700"
        : "text-muted-foreground"
    )}>
      {row.clientCount > 0 ? row.clientCount : "—"}
    </span>
  )
},
```

---

## ISSUE 5 — Client Detail: Services Tab — Assign / Remove Services

**Page:** `/clients/[id]` → Services tab
**File:** `src/app/(dashboard)/clients/[id]/page.tsx`

Currently the Services tab shows "This module is currently being built" placeholder. It needs to:
1. Show all services currently assigned to this client (via `ClientRateCard`)
2. Allow adding a service from the global services list
3. Allow removing an assigned service

### Step 1 — Create API routes for client-service assignment

**File to create:** `src/app/api/clients/[id]/services/route.ts`

```ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET — list services assigned to this client
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const rateCards = await prisma.clientRateCard.findMany({
      where: { clientId: id },
      include: { service: true }
    });

    return NextResponse.json({ data: rateCards });
  } catch (error) {
    console.error('Failed to fetch client services', error);
    return NextResponse.json({ error: 'Failed to fetch client services' }, { status: 500 });
  }
}

// POST — assign a service to this client
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const body = await request.json();

    // Prevent duplicates
    const existing = await prisma.clientRateCard.findFirst({
      where: { clientId: id, serviceId: body.serviceId }
    });
    if (existing) return NextResponse.json({ error: 'Service already assigned' }, { status: 409 });

    const rateCard = await prisma.clientRateCard.create({
      data: {
        clientId: id,
        serviceId: body.serviceId,
        customPrice: body.customPrice || 0,
      },
      include: { service: true }
    });

    return NextResponse.json({ data: rateCard });
  } catch (error) {
    console.error('Failed to assign service', error);
    return NextResponse.json({ error: 'Failed to assign service' }, { status: 500 });
  }
}
```

**File to create:** `src/app/api/clients/[id]/services/[rateCardId]/route.ts`

```ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// DELETE — remove a service from this client
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string, rateCardId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { rateCardId } = await params;

    await prisma.clientRateCard.delete({ where: { id: rateCardId } });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error('Failed to remove service', error);
    return NextResponse.json({ error: 'Failed to remove service' }, { status: 500 });
  }
}
```

### Step 2 — Build the Services tab UI in the client detail page

**File to change:** `src/app/(dashboard)/clients/[id]/page.tsx`

Add state at the top of the component (alongside other state):
```ts
const [assignedServices, setAssignedServices] = useState<any[]>([]);
const [allServices, setAllServices] = useState<any[]>([]);
const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
const [selectedServiceId, setSelectedServiceId] = useState('');
const [customPrice, setCustomPrice] = useState('');
```

Add a fetch function:
```ts
const fetchAssignedServices = async () => {
  const res = await fetch(`/api/clients/${id}/services`);
  const json = await res.json();
  if (json.data) setAssignedServices(json.data);
};
```

Fetch when the Services tab is activated:
```ts
useEffect(() => {
  if (activeTab === 'Services') {
    fetchAssignedServices();
    fetch('/api/services').then(r => r.json()).then(d => setAllServices(d.data || []));
  }
}, [activeTab]);
```

Replace the Services tab placeholder content:

Find:
```tsx
{["Services", "Documents", "DSC", "Licenses", "Passwords", "Invoices", "Notes"].includes(activeTab) && (
  <div className="bg-card border rounded-xl p-8 ...">
    ...placeholder...
  </div>
)}
```

Split it: handle `Services` separately, keep the others as placeholder:

```tsx
{activeTab === "Services" && (
  <div className="bg-card border rounded-xl p-5 shadow-sm min-h-[400px] space-y-4">
    <div className="flex items-center justify-between">
      <h3 className="font-semibold text-lg">Assigned Services</h3>
      <button
        onClick={() => setIsAddServiceOpen(true)}
        className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium"
      >
        + Assign Service
      </button>
    </div>

    {assignedServices.length === 0 ? (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground text-sm">No services assigned yet.</p>
        <button
          onClick={() => setIsAddServiceOpen(true)}
          className="mt-3 text-primary text-sm underline"
        >
          Assign a service
        </button>
      </div>
    ) : (
      <div className="divide-y border rounded-xl overflow-hidden">
        {assignedServices.map((rc: any) => (
          <div key={rc.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
            <div>
              <div className="font-medium text-sm">{rc.service.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {rc.service.category} · {rc.service.frequency === 'ONE_TIME' ? 'One-time' : rc.service.frequency.charAt(0) + rc.service.frequency.slice(1).toLowerCase()}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm font-semibold">
                {rc.customPrice > 0 ? `₹${rc.customPrice.toLocaleString()}` : rc.service.professionalFee > 0 ? `₹${rc.service.professionalFee.toLocaleString()}` : '—'}
              </div>
              <button
                onClick={async () => {
                  await fetch(`/api/clients/${id}/services/${rc.id}`, { method: 'DELETE' });
                  fetchAssignedServices();
                }}
                className="text-xs text-red-500 hover:text-red-700 px-2 py-1 border border-red-200 rounded hover:bg-red-50 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    )}

    {/* Assign Service panel */}
    {isAddServiceOpen && (
      <div className="border rounded-xl p-4 bg-muted/20 space-y-3">
        <h4 className="font-medium text-sm">Assign a Service</h4>
        <select
          className="w-full p-2 border rounded-md text-sm bg-background"
          value={selectedServiceId}
          onChange={(e) => setSelectedServiceId(e.target.value)}
        >
          <option value="">Select service...</option>
          {allServices
            .filter((s: any) => !assignedServices.find((rc: any) => rc.serviceId === s.id))
            .map((s: any) => (
              <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
            ))
          }
        </select>
        <input
          type="number"
          placeholder="Custom price (₹) — leave blank to use standard fee"
          className="w-full p-2 border rounded-md text-sm"
          value={customPrice}
          onChange={(e) => setCustomPrice(e.target.value)}
        />
        <div className="flex gap-2">
          <button
            onClick={async () => {
              if (!selectedServiceId) return;
              await fetch(`/api/clients/${id}/services`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  serviceId: selectedServiceId,
                  customPrice: parseFloat(customPrice) || 0,
                }),
              });
              setSelectedServiceId('');
              setCustomPrice('');
              setIsAddServiceOpen(false);
              fetchAssignedServices();
            }}
            disabled={!selectedServiceId}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50"
          >
            Assign
          </button>
          <button
            onClick={() => { setIsAddServiceOpen(false); setSelectedServiceId(''); setCustomPrice(''); }}
            className="px-4 py-2 border rounded-md text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    )}
  </div>
)}

{["Documents", "DSC", "Licenses", "Passwords", "Invoices", "Notes"].includes(activeTab) && (
  <div className="bg-card border rounded-xl p-8 shadow-sm min-h-[400px] flex items-center justify-center">
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
        <Users className="w-6 h-6 text-primary" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{activeTab}</h3>
      <p className="text-muted-foreground max-w-sm mx-auto">
        This module is currently being built or will show data for {client.companyName}.
      </p>
    </div>
  </div>
)}
```

---

## ISSUE 6 — Services Avatar Bug: Number-Starting Names Show Wrong Initials

**Observation:** Service "24Q (Salary TDS Return)" shows avatar "2R" instead of something meaningful. The Avatar component picks 2 letters from the name — for services starting with numbers this produces odd results (e.g. "2R" from "24Q... Return").

**File to change:** `src/components/ui/avatar.tsx`

Read the current Avatar component. Find the logic that extracts initials from the name string.

The current logic likely does something like splitting on spaces and taking first letters. For service names starting with numbers, return the first 2 non-space characters of the name as a fallback — but cap them so numbers don't show.

Replace the initials logic with:

```ts
function getInitials(name: string): string {
  if (!name) return '?';
  // Split into words, filter empty
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    // Single word — take first 2 chars that are letters
    const letters = words[0].replace(/[^A-Za-z]/g, '');
    return (letters.slice(0, 2) || words[0].slice(0, 2)).toUpperCase();
  }
  // Multi-word — first letter of first and last word (letters only)
  const first = words[0].replace(/[^A-Za-z]/g, '')[0] || words[0][0];
  const last = words[words.length - 1].replace(/[^A-Za-z]/g, '')[0] || words[words.length - 1][0];
  return (first + last).toUpperCase();
}
```

This ensures:
- "24Q (Salary TDS Return)" → first word "24Q" → strip non-letters → "Q", last word "Return" → "R" → shows "QR" (better than "2R")
- "GSTR-1 (Monthly)" → "G" + "M" → "GM"
- "Reliance Industries" → "R" + "I" → "RI" (unchanged)
- "Admin Partner" → "A" + "P" → "AP" (unchanged)

---

## BUILD ORDER FOR THIS DOCUMENT

Build in this order (after all FIX_SPEC.md Round 2 + Round 3 fixes):

22. Issue 1 — Action Center approve/reject (create 2 API routes, wire buttons)
23. Issue 2 — Services page row spacing
24. Issue 3 — Lock icon tooltip + legend
25. Issue 4 — Services client count column (API + table)
26. Issue 5 — Client detail Services tab (2 new API routes + full tab UI)
27. Issue 6 — Avatar initials bug fix

---

## DO NOT TOUCH

- Do not change any other tab in the client detail page — only Services tab.
- Do not change the DataTable shared component for the spacing fix — use the Tailwind override pattern shown in Issue 2.
- Do not add any new npm packages.
- Do not change `prisma/schema.prisma` — all models needed already exist (`ClientRateCard`, `Leave`, `Reimbursement`).

---

## VERIFICATION

After each fix:
- [ ] `npx tsc --noEmit` — no TypeScript errors
- [ ] Test approve button on Action Center — item should disappear from list after click
- [ ] Test Services tab on a client — assign a service, verify it appears, remove it, verify it disappears
- [ ] Services table — Clients column shows 0 or correct count
- [ ] Lock icon has tooltip on hover
- [ ] Avatar for "24Q (Salary TDS Return)" shows "QM" or similar (not "2R")
