# PRABANDH — Fix & Completion Specification (Round 2)

> Hand this document to Jules. It is a targeted fix list based on an audit of the Round 1 build.
> Do NOT refactor anything that is already working. Only touch the files and sections described below.
> Tech stack is unchanged: Next.js (App Router), Prisma + SQLite, Tailwind CSS, lucide-react, next-auth.
> All conventions from the original BUILD_SPEC.md still apply.

---

## HOW TO READ THIS DOCUMENT

- Each section = one self-contained fix.
- Sections are ordered by priority — build top-to-bottom.
- Every section names the **exact file(s) to change**.
- "Do not touch" means leave the rest of the file exactly as it is.
- When a section says "add a fetch" — fetch from the existing API, don't invent a new one.
- When a section says "use SlideOver" — import from `@/components/ui/slide-over`.
- Always run `getServerSession` for auth in any new API route. Return 401 if not found.

---

## FIX 1 — Overdue Auto-Detection (API Logic)

**Problem:** Tasks are only marked OVERDUE when a user manually clicks "Mark Overdue". The spec requires automatic detection.

**Files to change:**
- `src/app/api/tasks/route.ts` (GET handler)
- `src/app/api/tasks/stats/route.ts` (GET handler)

### 1a. In `GET /api/tasks` — auto-compute overdue before returning

After fetching tasks from Prisma, before the `return NextResponse.json(...)`, add this transformation:

```ts
const now = new Date();
const tasksWithOverdue = tasks.map(task => {
  if (
    task.dueDate &&
    new Date(task.dueDate) < now &&
    task.status !== 'COMPLETED' &&
    task.status !== 'CANCELLED'
  ) {
    return { ...task, status: 'OVERDUE' };
  }
  return task;
});
```

Then return `tasksWithOverdue` instead of `tasks`.

### 1b. In `GET /api/tasks/stats` — compute overdue count dynamically

Replace the static `prisma.task.count({ where: { status: 'OVERDUE' } })` line with a dynamic query:

```ts
const now = new Date();

const overdue = await prisma.task.count({
  where: {
    dueDate: { lt: now },
    status: { notIn: ['COMPLETED', 'CANCELLED', 'OVERDUE'] }
  }
});

// Add it to the existing OVERDUE count
const manuallyOverdue = await prisma.task.count({ where: { status: 'OVERDUE' } });
```

Then in the return: `overdue: overdue + manuallyOverdue`

> Do not change any other logic in these files.

---

## FIX 2 — Create Two Missing Pages (404 Crashes)

**Problem:** Sidebar links `/documents` and `/registers/licenses` return 404 — no page exists.

### 2a. Create `/documents` page

**File to create:** `src/app/(dashboard)/documents/page.tsx`

This is a placeholder page. Build it as a clean empty state:

```
┌──────────────────────────────────────┐
│  Doc Inbox                           │
│  ─────────────────────────────────── │
│  [Inbox icon, large, centered]       │
│  "Document Inbox"                    │
│  "Incoming client documents will     │
│   appear here."                      │
└──────────────────────────────────────┘
```

- Use `Inbox` icon from lucide-react (w-16 h-16 text-muted-foreground)
- Title: `text-2xl font-bold` above the icon area
- Subtitle: `text-muted-foreground text-sm` below
- Center everything in a `flex flex-col items-center justify-center min-h-[400px]` div

This is a server component — no `"use client"` needed.

### 2b. Create `/registers/licenses` page

**File to create:** `src/app/(dashboard)/registers/licenses/page.tsx`

Same empty-state pattern as documents but for licenses:
- Icon: `FileCheck` from lucide-react
- Title: "License Register"
- Subtitle: "Client license and registration records will appear here."

Same layout: server component, centered, no data.

---

## FIX 3 — Staff Users Fetch for Task & Lead Forms

**Problem:** The Add Task form and Convert to Client modal have empty dropdowns because no API route returns staff users.

### 3a. Create new API route: `GET /api/users`

**File to create:** `src/app/api/users/route.ts`

```ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role'); // optional filter: ADMIN, SENIOR_STAFF, JUNIOR_STAFF, BILLING

    const where: any = { role: { not: 'CLIENT' } }; // exclude client accounts
    if (role) where.role = role;

    const users = await prisma.user.findMany({
      where,
      select: { id: true, name: true, role: true, email: true },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({ data: users });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
```

### 3b. Fix Add Task form — fetch and populate Assignee + Reviewer dropdowns

**File to change:** `src/app/(dashboard)/tasks/list/page.tsx`

Find the `useEffect` that loads clients and services:
```ts
useEffect(() => {
  fetch('/api/clients').then(r => r.json()).then(d => setClients(d.data || []));
  fetch('/api/services').then(r => r.json()).then(d => setServices(d.data || []));
}, []);
```

Replace with:
```ts
const [staff, setStaff] = useState<any[]>([]);

useEffect(() => {
  fetch('/api/clients').then(r => r.json()).then(d => setClients(d.data || []));
  fetch('/api/services').then(r => r.json()).then(d => setServices(d.data || []));
  fetch('/api/users').then(r => r.json()).then(d => setStaff(d.data || []));
}, []);
```

Then in the Add Task form, find the Priority `<select>` and add ABOVE it:

```tsx
<div>
  <label className="block text-sm font-medium mb-1">Assignee</label>
  <select name="assignedToId" className="w-full p-2 border rounded-md text-sm">
    <option value="">Select Assignee...</option>
    {staff.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
  </select>
</div>
<div>
  <label className="block text-sm font-medium mb-1">Reviewer</label>
  <select name="reviewerId" className="w-full p-2 border rounded-md text-sm">
    <option value="">None</option>
    {staff.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
  </select>
</div>
```

Place them between the Category select and the Priority select.

### 3c. Fix Recurring toggle — show sub-fields dynamically

**File to change:** `src/app/(dashboard)/tasks/list/page.tsx`

Add state:
```ts
const [isRecurring, setIsRecurring] = useState(false);
```

Find the recurring checkbox in the form:
```tsx
<div className="flex items-center gap-2 pt-2">
  <input type="checkbox" name="isRecurring" id="isRecurring" className="rounded" />
  <label htmlFor="isRecurring" className="text-sm font-medium">Is Recurring?</label>
</div>
```

Replace with:
```tsx
<div className="flex items-center gap-2 pt-2">
  <input
    type="checkbox"
    name="isRecurring"
    id="isRecurring"
    className="rounded"
    checked={isRecurring}
    onChange={(e) => setIsRecurring(e.target.checked)}
  />
  <label htmlFor="isRecurring" className="text-sm font-medium">Is Recurring?</label>
</div>
{isRecurring && (
  <>
    <div>
      <label className="block text-sm font-medium mb-1">Frequency</label>
      <select name="frequency" className="w-full p-2 border rounded-md text-sm">
        <option value="DAILY">Daily</option>
        <option value="WEEKLY">Weekly</option>
        <option value="FORTNIGHTLY">Fortnightly</option>
        <option value="MONTHLY">Monthly</option>
        <option value="QUARTERLY">Quarterly</option>
        <option value="ANNUAL">Annual</option>
      </select>
    </div>
    <div>
      <label className="block text-sm font-medium mb-1">Recurring End Date</label>
      <input type="date" name="recurringEnd" className="w-full p-2 border rounded-md text-sm" />
    </div>
  </>
)}
```

Also reset `isRecurring` to `false` after the form submits successfully:
```ts
setIsRecurring(false);
```
Add that line in `handleAddTask` after `setIsAddOpen(false)`.

---

## FIX 4 — Task Detail Drawer: Assignment Section + Notes Section

**Problem:** The Task Detail drawer is missing (a) dropdowns to change assignee/reviewer, (b) priority pill selector, and (c) a notes/comments textarea.

**File to change:** `src/app/(dashboard)/tasks/list/page.tsx`

The Task Detail `<SlideOver>` currently has sections: Header → Details → Status Actions → SOP Checklist → Description.

### 4a. Add Assignment Section

Insert this block BETWEEN the "Details" grid and the "Status Actions" section:

```tsx
{/* Assignment Section */}
<div className="space-y-3">
  <h3 className="font-semibold text-lg">Assignment</h3>
  <div className="grid grid-cols-2 gap-4 text-sm">
    <div>
      <div className="text-muted-foreground mb-1">Assignee</div>
      <select
        className="w-full p-2 border rounded-md text-sm bg-background"
        defaultValue={selectedTask.assignedToId || ""}
        onChange={async (e) => {
          await fetch(`/api/tasks/${selectedTask.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ assignedToId: e.target.value || null }),
          });
          handleRowClick(selectedTask);
          fetchTasks();
        }}
      >
        <option value="">None</option>
        {staff.map((u: any) => (
          <option key={u.id} value={u.id}>{u.name}</option>
        ))}
      </select>
    </div>
    <div>
      <div className="text-muted-foreground mb-1">Reviewer</div>
      <select
        className="w-full p-2 border rounded-md text-sm bg-background"
        defaultValue={selectedTask.reviewerId || ""}
        onChange={async (e) => {
          await fetch(`/api/tasks/${selectedTask.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reviewerId: e.target.value || null }),
          });
          handleRowClick(selectedTask);
          fetchTasks();
        }}
      >
        <option value="">None</option>
        {staff.map((u: any) => (
          <option key={u.id} value={u.id}>{u.name}</option>
        ))}
      </select>
    </div>
  </div>

  {/* Priority Pills */}
  <div>
    <div className="text-muted-foreground text-sm mb-2">Priority</div>
    <div className="flex gap-2">
      {["LOW", "MEDIUM", "HIGH"].map((p) => (
        <button
          key={p}
          onClick={async () => {
            await fetch(`/api/tasks/${selectedTask.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ priority: p }),
            });
            handleRowClick(selectedTask);
            fetchTasks();
          }}
          className={cn(
            "px-3 py-1 rounded-full text-xs font-semibold border transition-colors",
            selectedTask.priority === p
              ? p === "HIGH" ? "bg-red-500 text-white border-red-500"
                : p === "MEDIUM" ? "bg-orange-400 text-white border-orange-400"
                : "bg-green-500 text-white border-green-500"
              : "bg-background text-muted-foreground border-border hover:bg-muted"
          )}
        >
          {p.charAt(0) + p.slice(1).toLowerCase()}
        </button>
      ))}
    </div>
  </div>
</div>
```

Note: `staff` state is already available from Fix 3b above. The `staff` fetch runs once on mount and is available globally in the component.

### 4b. Add Notes Section

Insert this block at the END of the Task Detail drawer, AFTER the Description section:

```tsx
{/* Notes / Comments */}
<div className="space-y-3">
  <h3 className="font-semibold text-lg">Notes</h3>
  <textarea
    rows={3}
    placeholder="Add a note..."
    id="task-note-input"
    className="w-full p-3 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
  />
  <button
    onClick={() => {
      const el = document.getElementById('task-note-input') as HTMLTextAreaElement;
      if (!el?.value.trim()) return;
      // For now, append note to description via PUT
      const existingDesc = selectedTask.description || '';
      const newDesc = existingDesc
        ? existingDesc + '\n\n[Note] ' + el.value.trim()
        : '[Note] ' + el.value.trim();
      fetch(`/api/tasks/${selectedTask.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: newDesc }),
      }).then(() => {
        el.value = '';
        handleRowClick(selectedTask);
      });
    }}
    className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium"
  >
    Add Note
  </button>
  {selectedTask.description && (
    <div className="p-3 bg-muted/30 border rounded-lg text-sm whitespace-pre-wrap text-muted-foreground">
      {selectedTask.description}
    </div>
  )}
</div>
```

> Note: This appends notes to the task description field as a stopgap. A future iteration can add a proper TaskNote model.

---

## FIX 5 — Task Summary Page: Add Missing Charts

**Problem:** The `/tasks/summary` page only shows 2 charts. Spec requires 4 more sections.

**File to change:** `src/app/(dashboard)/tasks/summary/page.tsx`

The stats endpoint (`/api/tasks/stats`) does not return per-category data. First extend the API, then update the page.

### 5a. Extend `GET /api/tasks/stats`

**File to change:** `src/app/api/tasks/stats/route.ts`

Add this after all existing counts:

```ts
const now = new Date();
const sevenDaysFromNow = new Date();
sevenDaysFromNow.setDate(now.getDate() + 7);

// Tasks due this week
const dueSoon = await prisma.task.findMany({
  where: {
    dueDate: { gte: now, lte: sevenDaysFromNow },
    status: { notIn: ['COMPLETED', 'CANCELLED'] }
  },
  include: {
    client: { select: { companyName: true, clientCode: true } },
    assignedTo: { select: { name: true } }
  },
  orderBy: { dueDate: 'asc' },
  take: 10
});

// Per-category counts
const categoryGroups = await prisma.task.groupBy({
  by: ['category'],
  _count: { id: true }
});

// Overdue tasks
const overdueAutoTasks = await prisma.task.findMany({
  where: {
    dueDate: { lt: now },
    status: { notIn: ['COMPLETED', 'CANCELLED'] }
  },
  include: {
    client: { select: { companyName: true, clientCode: true } },
    assignedTo: { select: { name: true } }
  },
  orderBy: { dueDate: 'asc' },
  take: 20
});

const manualOverdue = await prisma.task.findMany({
  where: { status: 'OVERDUE' },
  include: {
    client: { select: { companyName: true, clientCode: true } },
    assignedTo: { select: { name: true } }
  },
  take: 20
});

// Top assignees
const assigneeGroups = await prisma.task.groupBy({
  by: ['assignedToId'],
  _count: { id: true },
  where: { assignedToId: { not: null } },
  orderBy: { _count: { id: 'desc' } },
  take: 5
});

const assigneeIds = assigneeGroups.map(g => g.assignedToId!).filter(Boolean);
const assigneeUsers = await prisma.user.findMany({
  where: { id: { in: assigneeIds } },
  select: { id: true, name: true }
});

const topAssignees = assigneeGroups.map(g => ({
  name: assigneeUsers.find(u => u.id === g.assignedToId)?.name || 'Unknown',
  count: g._count.id
}));
```

Update the return to include all new fields:
```ts
return NextResponse.json({
  total, pending, inProgress, sentForReview, requestChanges,
  overdue: overdue + manuallyOverdue,
  completed, cancelled,
  byCategory: categoryGroups.map(g => ({ category: g.category || 'Uncategorized', count: g._count.id })),
  overdueTasks: [...overdueAutoTasks, ...manualOverdue].slice(0, 20),
  dueSoon,
  topAssignees
});
```

### 5b. Update the Summary Page UI

**File to change:** `src/app/(dashboard)/tasks/summary/page.tsx`

After the existing 2-chart grid, add:

```tsx
{/* Tasks by Category */}
<div className="bg-card border rounded-xl p-6 shadow-sm">
  <h2 className="text-lg font-semibold mb-6">Tasks by Category</h2>
  <div className="h-64">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={stats.byCategory || []} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="category" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} />
        <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
        <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </div>
</div>

{/* Top Assignees */}
<div className="bg-card border rounded-xl p-6 shadow-sm">
  <h2 className="text-lg font-semibold mb-4">Top Assignees by Task Count</h2>
  <div className="space-y-3">
    {(stats.topAssignees || []).map((a: any, i: number) => (
      <div key={i} className="flex items-center gap-3">
        <span className="text-sm font-bold text-muted-foreground w-5">{i + 1}.</span>
        <div className="flex-1">
          <div className="text-sm font-medium">{a.name}</div>
          <div className="w-full bg-muted rounded-full h-1.5 mt-1">
            <div
              className="bg-primary h-1.5 rounded-full"
              style={{ width: `${Math.min((a.count / (stats.total || 1)) * 100, 100)}%` }}
            />
          </div>
        </div>
        <span className="text-sm font-semibold">{a.count}</span>
      </div>
    ))}
    {(!stats.topAssignees || stats.topAssignees.length === 0) && (
      <p className="text-sm text-muted-foreground italic">No assignee data.</p>
    )}
  </div>
</div>

{/* Tasks Due This Week */}
<div className="bg-card border rounded-xl p-6 shadow-sm">
  <h2 className="text-lg font-semibold mb-4">Due This Week</h2>
  {(stats.dueSoon || []).length > 0 ? (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-muted-foreground text-xs uppercase">
          <th className="text-left pb-2 font-medium">Task</th>
          <th className="text-left pb-2 font-medium">Client</th>
          <th className="text-left pb-2 font-medium">Due</th>
          <th className="text-left pb-2 font-medium">Assignee</th>
        </tr>
      </thead>
      <tbody>
        {(stats.dueSoon || []).map((t: any) => (
          <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
            <td className="py-2 font-medium">{t.title}</td>
            <td className="py-2 text-muted-foreground">{t.client?.companyName || "-"}</td>
            <td className="py-2 text-orange-600 font-medium">{t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : "-"}</td>
            <td className="py-2 text-muted-foreground">{t.assignedTo?.name || "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  ) : (
    <p className="text-sm text-muted-foreground italic">No tasks due in the next 7 days.</p>
  )}
</div>

{/* Overdue Tasks */}
<div className="bg-card border rounded-xl p-6 shadow-sm">
  <h2 className="text-lg font-semibold mb-4 text-red-600">Overdue Tasks</h2>
  {(stats.overdueTasks || []).length > 0 ? (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-muted-foreground text-xs uppercase">
          <th className="text-left pb-2 font-medium">Task</th>
          <th className="text-left pb-2 font-medium">Client</th>
          <th className="text-left pb-2 font-medium">Due</th>
          <th className="text-left pb-2 font-medium">Assignee</th>
        </tr>
      </thead>
      <tbody>
        {(stats.overdueTasks || []).map((t: any) => (
          <tr key={t.id} className="border-b last:border-0 hover:bg-red-50/50 transition-colors">
            <td className="py-2 font-medium">{t.title}</td>
            <td className="py-2 text-muted-foreground">{t.client?.companyName || "-"}</td>
            <td className="py-2 text-red-600 font-semibold">{t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : "-"}</td>
            <td className="py-2 text-muted-foreground">{t.assignedTo?.name || "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  ) : (
    <p className="text-sm text-muted-foreground italic text-green-600">No overdue tasks. Great work!</p>
  )}
</div>
```

Place all 4 of these divs inside an outer `<div className="grid grid-cols-1 gap-6 mt-6">` block, appended after the existing 2-chart grid.

---

## FIX 6 — Leads: Filters Panel

**Problem:** The "Filters ▼" button renders but clicking it does nothing.

**File to change:** `src/app/(dashboard)/leads/page.tsx`

### 6a. Add filter state

Add near the top of the component (after existing state declarations):

```ts
const [isFilterOpen, setIsFilterOpen] = useState(false);
const [filterStages, setFilterStages] = useState<string[]>([]);
const [filterSources, setFilterSources] = useState<string[]>([]);
```

### 6b. Apply filters to fetch

Update `fetchLeads` to pass stage and source filters:

```ts
if (filterStages.length > 0) {
  // Pass as comma-separated string
  url.searchParams.append("stages", filterStages.join(","));
}
if (filterSources.length > 0) {
  url.searchParams.append("sources", filterSources.join(","));
}
```

Also add `filterStages` and `filterSources` to the `useEffect` dependency array:
```ts
useEffect(() => {
  fetchLeads();
}, [stageFilter, search, filterStages, filterSources]);
```

### 6c. Update `GET /api/leads` to support multi-stage and multi-source filters

**File to change:** `src/app/api/leads/route.ts`

In the GET handler, after reading existing params, add:

```ts
const stages = searchParams.get('stages'); // comma-separated
const sources = searchParams.get('sources'); // comma-separated

if (stages) {
  where.stage = { in: stages.split(',') };
}
if (sources) {
  where.source = { in: sources.split(',') };
}
```

### 6d. Render the Filters panel dropdown

Find the existing Filters button:
```tsx
<button className="flex items-center gap-2 px-3 py-2 border rounded-md hover:bg-muted text-sm font-medium transition-colors">
  <Filter className="w-4 h-4" /> Filters <span className="text-xs">▼</span>
</button>
```

Wrap it in a relative div and add the dropdown panel below:

```tsx
<div className="relative">
  <button
    onClick={() => setIsFilterOpen(f => !f)}
    className="flex items-center gap-2 px-3 py-2 border rounded-md hover:bg-muted text-sm font-medium transition-colors"
  >
    <Filter className="w-4 h-4" />
    Filters
    {(filterStages.length + filterSources.length) > 0 && (
      <span className="bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5 ml-1">
        {filterStages.length + filterSources.length}
      </span>
    )}
    <span className="text-xs">▼</span>
  </button>

  {isFilterOpen && (
    <div className="absolute right-0 mt-2 w-72 bg-popover border shadow-xl rounded-xl z-50 p-4 space-y-4">
      {/* Stage filter */}
      <div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Stage</div>
        <div className="space-y-1">
          {["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "LOST"].map(s => (
            <label key={s} className="flex items-center gap-2 text-sm cursor-pointer hover:text-foreground">
              <input
                type="checkbox"
                checked={filterStages.includes(s)}
                onChange={(e) => {
                  if (e.target.checked) setFilterStages(prev => [...prev, s]);
                  else setFilterStages(prev => prev.filter(x => x !== s));
                }}
                className="rounded"
              />
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </label>
          ))}
        </div>
      </div>

      {/* Source filter */}
      <div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Source</div>
        <div className="space-y-1">
          {["Website", "Referral", "Walk-in", "Social Media", "Cold Call", "Other"].map(s => (
            <label key={s} className="flex items-center gap-2 text-sm cursor-pointer hover:text-foreground">
              <input
                type="checkbox"
                checked={filterSources.includes(s)}
                onChange={(e) => {
                  if (e.target.checked) setFilterSources(prev => [...prev, s]);
                  else setFilterSources(prev => prev.filter(x => x !== s));
                }}
                className="rounded"
              />
              {s}
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-between items-center pt-2 border-t">
        <button
          onClick={() => { setFilterStages([]); setFilterSources([]); setIsFilterOpen(false); }}
          className="text-xs text-muted-foreground hover:text-foreground underline"
        >
          Clear All
        </button>
        <button
          onClick={() => setIsFilterOpen(false)}
          className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium"
        >
          Apply Filters
        </button>
      </div>
    </div>
  )}
</div>
```

---

## FIX 7 — Leads: Notes Section in Detail Drawer

**Problem:** The Lead Detail drawer shows `lead.notes` as static text. Spec requires a textarea + save button.

**File to change:** `src/app/(dashboard)/leads/page.tsx`

Find the Notes section in the Lead Detail drawer (the `<SlideOver>` that opens when a row is clicked):

```tsx
{/* Notes */}
<div className="space-y-3">
  <h3 className="font-semibold border-b pb-2">Notes</h3>
  {selectedLead.notes ? (
    <div className="p-3 bg-muted/30 border rounded-md text-sm whitespace-pre-wrap">
      {selectedLead.notes}
    </div>
  ) : (
    <div className="text-sm text-muted-foreground italic">No notes added.</div>
  )}
</div>
```

Replace with:

```tsx
{/* Notes */}
<div className="space-y-3">
  <h3 className="font-semibold border-b pb-2">Notes</h3>
  {selectedLead.notes && (
    <div className="p-3 bg-muted/30 border rounded-md text-sm whitespace-pre-wrap text-muted-foreground">
      {selectedLead.notes}
    </div>
  )}
  <textarea
    rows={3}
    placeholder="Add a note..."
    id="lead-note-input"
    className="w-full p-3 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
  />
  <button
    onClick={async () => {
      const el = document.getElementById('lead-note-input') as HTMLTextAreaElement;
      if (!el?.value.trim()) return;
      const existing = selectedLead.notes || '';
      const newNotes = existing ? existing + '\n\n' + el.value.trim() : el.value.trim();
      await fetch(`/api/leads/${selectedLead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: newNotes }),
      });
      el.value = '';
      handleRowClick(selectedLead);
    }}
    className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium"
  >
    Add Note
  </button>
</div>
```

---

## FIX 8 — Leads: Convert Modal — Add Assigned Employee + Group Fields

**Problem:** The Convert to Client modal is missing "Assigned Employee" and "Group" dropdowns.

**File to change:** `src/app/(dashboard)/leads/page.tsx`

### 8a. Fetch staff and groups on mount

The existing `useEffect` at the top that fetches staff is empty. Replace it:

```ts
const [groups, setGroups] = useState<any[]>([]);

useEffect(() => {
  fetch('/api/users').then(r => r.json()).then(d => setStaff(d.data || []));
  fetch('/api/groups').then(r => r.json()).then(d => setGroups(d.data || []));
}, []);
```

### 8b. Create `GET /api/groups`

**File to create:** `src/app/api/groups/route.ts`

```ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const groups = await prisma.clientGroup.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({ data: groups });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
  }
}
```

### 8c. Add fields to the Convert form

In the Convert to Client `<Modal>`, inside the `<form id="convert-form">`, find the last `<div>` (Address textarea) and ADD these two fields AFTER it:

```tsx
<div>
  <label className="block text-sm font-medium mb-1">Assigned Employee</label>
  <select name="assignedEmployeeId" className="w-full p-2 border rounded-md text-sm">
    <option value="">Select Employee...</option>
    {staff.map((u: any) => (
      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
    ))}
  </select>
</div>
<div>
  <label className="block text-sm font-medium mb-1">Auditor</label>
  <select name="auditorId" className="w-full p-2 border rounded-md text-sm">
    <option value="">Select Auditor...</option>
    {staff.filter((u: any) => u.role === 'ADMIN' || u.role === 'SENIOR_STAFF').map((u: any) => (
      <option key={u.id} value={u.id}>{u.name}</option>
    ))}
  </select>
</div>
<div>
  <label className="block text-sm font-medium mb-1">Group</label>
  <select name="groupId" className="w-full p-2 border rounded-md text-sm">
    <option value="">None</option>
    {groups.map((g: any) => (
      <option key={g.id} value={g.id}>{g.name}</option>
    ))}
  </select>
</div>
```

Also update `handleConvertClient` to include the new fields:
```ts
groupId: formData.get("groupId") || null,
// auditorId already exists in payload
```

---

## FIX 9 — Clients: Add Client Modal (Standalone)

**Problem:** The spec (§6e) requires a standalone "Add Client" modal accessible from the Clients page. Currently clients can only be created via Lead Conversion.

**File to change:** `src/app/(dashboard)/clients/page.tsx`
**File to change:** `src/app/api/clients/route.ts`

### 9a. Fix the POST `/api/clients` route

The current `POST /api/clients` returns 400 "Use Lead Conversion". Replace the entire POST handler body with the real implementation (copy the logic from `src/app/api/leads/[id]/convert/route.ts` — it already does client creation correctly):

```ts
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();

    const client = await prisma.$transaction(async (tx) => {
      let prefix = 'OTH';
      const entity = body.businessEntity || '';
      if (entity.includes('Public Limited')) prefix = 'PLC';
      else if (entity.includes('Private Limited')) prefix = 'PVT';
      else if (entity.includes('Partnership')) prefix = 'PAR';
      else if (entity.includes('LLP')) prefix = 'LLP';
      else if (entity.includes('Proprietorship')) prefix = 'PRO';
      else if (entity.includes('Trust')) prefix = 'TRS';
      else if (entity.includes('HUF')) prefix = 'HUF';

      const counterId = `client_${prefix}`;
      const counter = await tx.counter.upsert({
        where: { id: counterId },
        update: { value: { increment: 1 } },
        create: { id: counterId, value: 1 }
      });
      const clientCode = `${prefix}${String(counter.value).padStart(5, '0')}`;

      const passwordHash = await bcrypt.hash(Math.random().toString(36).slice(-8), 10);
      const clientUser = await tx.user.create({
        data: {
          email: body.contactEmail || `client_${clientCode}@prabandh.in`,
          passwordHash,
          name: body.contactName || body.businessName,
          role: 'CLIENT',
        }
      });

      return await tx.clientProfile.create({
        data: {
          userId: clientUser.id,
          companyName: body.businessName,
          clientCode,
          legalName: body.legalName,
          businessEntity: body.businessEntity,
          contactName: body.contactName,
          contactEmail: body.contactEmail,
          mobile: body.mobile,
          gstNumber: body.gstNumber,
          panNumber: body.panNumber,
          address: body.address,
          auditorId: body.auditorId || null,
          groupId: body.groupId || null,
          labels: body.labels || null,
        }
      });
    });

    return NextResponse.json({ data: client });
  } catch (error) {
    console.error('Failed to create client', error);
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }
}
```

Add `import bcrypt from 'bcryptjs';` at the top of the file.

### 9b. Add Add Client modal to the Clients page

**File to change:** `src/app/(dashboard)/clients/page.tsx`

Add imports at the top:
```ts
import { SlideOver } from "@/components/ui/slide-over";
import { useState } from "react"; // already present
```

Add state:
```ts
const [isAddOpen, setIsAddOpen] = useState(false);
const [staff, setStaff] = useState<any[]>([]);
const [groups, setGroups] = useState<any[]>([]);
```

Add a `useEffect` to fetch staff and groups:
```ts
useEffect(() => {
  fetch('/api/users').then(r => r.json()).then(d => setStaff(d.data || []));
  fetch('/api/groups').then(r => r.json()).then(d => setGroups(d.data || []));
}, []);
```

Add the handler:
```ts
const handleAddClient = async (e: React.FormEvent) => {
  e.preventDefault();
  const form = e.target as HTMLFormElement;
  const data = new FormData(form);
  const labels = (data.get("labels") as string || "").trim();

  await fetch("/api/clients", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      businessName: data.get("businessName"),
      legalName: data.get("legalName"),
      businessEntity: data.get("businessEntity"),
      contactName: data.get("contactName"),
      contactEmail: data.get("contactEmail"),
      mobile: data.get("mobile"),
      gstNumber: data.get("gstNumber"),
      panNumber: data.get("panNumber"),
      address: data.get("address"),
      auditorId: data.get("auditorId") || null,
      groupId: data.get("groupId") || null,
      labels: labels || null,
    }),
  });
  setIsAddOpen(false);
  fetchClients();
};
```

Change the "Add Client (via Lead)" button in the 3-dot menu to open the modal:
```tsx
<button
  className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
  onClick={() => setIsAddOpen(true)}
>
  <Plus className="w-4 h-4" /> Add Client
</button>
```

Add the SlideOver at the bottom of the JSX (before the closing `</div>`):

```tsx
<SlideOver open={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add Client">
  <form id="add-client-form" onSubmit={handleAddClient} className="space-y-4">
    <div>
      <label className="block text-sm font-medium mb-1">Business Name <span className="text-red-500">*</span></label>
      <input name="businessName" required className="w-full p-2 border rounded-md text-sm" />
    </div>
    <div>
      <label className="block text-sm font-medium mb-1">Legal Name</label>
      <input name="legalName" className="w-full p-2 border rounded-md text-sm" />
    </div>
    <div>
      <label className="block text-sm font-medium mb-1">Business Entity <span className="text-red-500">*</span></label>
      <select name="businessEntity" required className="w-full p-2 border rounded-md text-sm">
        <option value="">Select...</option>
        <option value="Public Limited">Public Limited</option>
        <option value="Private Limited">Private Limited</option>
        <option value="Partnership">Partnership Firm</option>
        <option value="LLP">LLP</option>
        <option value="Proprietorship">Proprietorship</option>
        <option value="Trust">Trust</option>
        <option value="HUF">HUF</option>
      </select>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium mb-1">Contact Name</label>
        <input name="contactName" className="w-full p-2 border rounded-md text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Mobile</label>
        <input type="tel" name="mobile" className="w-full p-2 border rounded-md text-sm" />
      </div>
    </div>
    <div>
      <label className="block text-sm font-medium mb-1">Contact Email</label>
      <input type="email" name="contactEmail" className="w-full p-2 border rounded-md text-sm" />
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium mb-1">GST Number</label>
        <input name="gstNumber" className="w-full p-2 border rounded-md text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">PAN Number</label>
        <input name="panNumber" className="w-full p-2 border rounded-md text-sm" />
      </div>
    </div>
    <div>
      <label className="block text-sm font-medium mb-1">Address</label>
      <textarea name="address" rows={2} className="w-full p-2 border rounded-md text-sm" />
    </div>
    <div>
      <label className="block text-sm font-medium mb-1">Assigned Employee</label>
      <select name="assignedEmployeeId" className="w-full p-2 border rounded-md text-sm">
        <option value="">Select...</option>
        {staff.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
      </select>
    </div>
    <div>
      <label className="block text-sm font-medium mb-1">Auditor</label>
      <select name="auditorId" className="w-full p-2 border rounded-md text-sm">
        <option value="">Select...</option>
        {staff.filter(u => u.role === 'ADMIN' || u.role === 'SENIOR_STAFF').map(u => (
          <option key={u.id} value={u.id}>{u.name}</option>
        ))}
      </select>
    </div>
    <div>
      <label className="block text-sm font-medium mb-1">Group</label>
      <select name="groupId" className="w-full p-2 border rounded-md text-sm">
        <option value="">None</option>
        {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
      </select>
    </div>
    <div>
      <label className="block text-sm font-medium mb-1">Labels <span className="text-xs text-muted-foreground">(comma-separated, e.g. VIP,Tech)</span></label>
      <input name="labels" placeholder="VIP, Tech, Priority" className="w-full p-2 border rounded-md text-sm" />
    </div>
  </form>
  <div className="mt-6 flex justify-end gap-2">
    <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 border rounded-md text-sm font-medium">Cancel</button>
    <button form="add-client-form" type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium">Add Client</button>
  </div>
</SlideOver>
```

---

## FIX 10 — Client Detail: Fix Real Services in Client List Table

**Problem:** The Services column in `/clients` table shows hardcoded "GST", "TDS", "+3" avatars.

**File to change:** `src/app/(dashboard)/clients/page.tsx`

The column currently hardcodes avatars. Replace that column cell renderer:

```tsx
{
  header: "Services",
  cell: (row) => {
    // Show task count as a proxy for service activity until client-service linking is built
    const count = row._count?.tasks || 0;
    return count > 0 ? (
      <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">
        {count} task{count !== 1 ? 's' : ''}
      </span>
    ) : (
      <span className="text-muted-foreground text-xs">-</span>
    );
  }
},
```

---

## FIX 11 — Services: SOP Edit (Inline)

**Problem:** The Edit (pencil) icon in the SOP slide-over does nothing.

**File to change:** `src/app/(dashboard)/services/page.tsx`

### 11a. Add edit state

```ts
const [editingSopId, setEditingSopId] = useState<string | null>(null);
const [editSopTitle, setEditSopTitle] = useState("");
const [editSopDesc, setEditSopDesc] = useState("");
```

### 11b. Add PUT handler

```ts
const handleEditSop = async (sopId: string) => {
  await fetch(`/api/services/${currentService.id}/sops/${sopId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: editSopTitle, description: editSopDesc })
  });
  setEditingSopId(null);
  const res = await fetch(`/api/services/${currentService.id}/sops`);
  const json = await res.json();
  if (json.data) setSops(json.data);
};
```

### 11c. Update SOP list rendering to show inline edit form when editing

In the SOP list `.map()`, replace the current render with:

```tsx
{sops.map((sop, idx) => (
  <div key={sop.id} className="flex items-start gap-3 p-3 border rounded-lg bg-card">
    <GripVertical className="w-5 h-5 text-muted-foreground mt-0.5 cursor-grab shrink-0" />
    <div className="flex-1">
      {editingSopId === sop.id ? (
        <div className="space-y-2">
          <input
            value={editSopTitle}
            onChange={(e) => setEditSopTitle(e.target.value)}
            className="w-full p-2 border rounded-md text-sm font-semibold"
          />
          <textarea
            value={editSopDesc}
            onChange={(e) => setEditSopDesc(e.target.value)}
            className="w-full p-2 border rounded-md text-sm"
            rows={2}
          />
          <div className="flex gap-2">
            <button
              onClick={() => handleEditSop(sop.id)}
              className="px-3 py-1 bg-primary text-primary-foreground rounded text-xs font-medium"
            >
              Save
            </button>
            <button
              onClick={() => setEditingSopId(null)}
              className="px-3 py-1 border rounded text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground">{idx + 1}.</span>
            <span className="font-semibold">{sop.title}</span>
          </div>
          {sop.description && (
            <p className="text-sm text-muted-foreground mt-1 ml-5">{sop.description}</p>
          )}
        </>
      )}
    </div>
    {editingSopId !== sop.id && (
      <div className="flex gap-1 shrink-0">
        <button
          onClick={() => { setEditingSopId(sop.id); setEditSopTitle(sop.title); setEditSopDesc(sop.description || ""); }}
          className="p-1.5 text-muted-foreground hover:bg-muted rounded"
        >
          <Edit className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleDeleteSop(sop.id)}
          className="p-1.5 text-red-500 hover:bg-red-50 rounded"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    )}
  </div>
))}
```

---

## WHAT NOT TO TOUCH

- Do NOT modify `prisma/schema.prisma` — schema is complete.
- Do NOT change `src/lib/auth/authOptions.ts`.
- Do NOT change `src/lib/prisma/index.ts`.
- Do NOT change the 7 shared UI components in `src/components/ui/` unless a fix explicitly says to.
- Do NOT change the sidebar links or layout in `src/app/(dashboard)/layout.tsx` unless explicitly told.
- Do NOT rewrite pages that are working — only add/edit the specific sections described above.
- Do NOT introduce any new UI libraries. Tailwind only.
- Do NOT add comments explaining what you did or what the code does.

---

## BUILD ORDER (for Jules — follow this sequence)

1. Fix 1 — Overdue API logic (no UI, pure backend)
2. Fix 2 — Create 2 missing pages (quick, isolated)
3. Fix 3a — Create `GET /api/users` route
4. Fix 3b + 3c — Fix Add Task form (assignee/reviewer dropdowns + recurring toggle)
5. Fix 4 — Task Detail drawer (assignment section + notes)
6. Fix 5a — Extend `/api/tasks/stats` return shape
7. Fix 5b — Task Summary page (4 new sections)
8. Fix 6 — Leads filters panel (state + API + UI)
9. Fix 7 — Leads notes section in drawer
10. Fix 8a — Create `GET /api/groups` route
11. Fix 8b + 8c — Convert modal fields
12. Fix 9a — Fix `POST /api/clients`
13. Fix 9b — Add Client modal on Clients page
14. Fix 10 — Client list services column (remove hardcoded)
15. Fix 11 — SOP inline edit

---

## ROUND 3 — Live Testing Bugs (found during user QA session, 2026-05-22)

> These are new issues found by the product owner while testing localhost. Build these AFTER Round 2 fixes are complete. Same rules apply — do not refactor anything not listed here.

---

### R3-FIX 1 — Leads Stats Cards: Click to Filter

**Problem:** The 5 stats cards at the top of `/leads` (Open, Converted, Lost, Total Leads, Conversion Rate) are not clickable. Clicking them should filter the table to that stage group.

**File to change:** `src/app/(dashboard)/leads/page.tsx`

Each card should call `setStageFilter` with the appropriate value when clicked:
- **Open** card → set `stageFilter` to filter for stages `NEW`, `CONTACTED`, `QUALIFIED` combined. Since the current filter only supports one stage, add a new state `activeStatCard` (string, default `"ALL"`) and pass it to the fetch alongside `stageFilter`.
- **Converted** card → filter `stage = CONVERTED`
- **Lost** card → filter `stage = LOST`
- **Total Leads** card → clear all filters (show all)
- **Conversion Rate** card → no filter action (it's a metric, not a stage)

Implementation approach:

Add state:
```ts
const [activeStatCard, setActiveStatCard] = useState<string>("ALL");
```

Add `activeStatCard` to the `fetchLeads` `useEffect` dependency array.

In `fetchLeads`, add:
```ts
if (activeStatCard === "OPEN") {
  // Override any stage filter — show NEW, CONTACTED, QUALIFIED
  url.searchParams.set("stages", "NEW,CONTACTED,QUALIFIED");
} else if (activeStatCard === "CONVERTED") {
  url.searchParams.set("stage", "CONVERTED");
} else if (activeStatCard === "LOST") {
  url.searchParams.set("stage", "LOST");
}
```

For each stat card `<div>`, add:
- `onClick={() => setActiveStatCard("OPEN")}` / `"CONVERTED"` / `"LOST"` / `"ALL"`
- `cursor-pointer` class
- Active ring highlight: when `activeStatCard === "OPEN"`, add `ring-2 ring-primary` to that card's className

The active card should have a visible selected state — add `ring-2 ring-offset-1` in the card's primary color (e.g. `ring-primary` for the Open card using the same color as its number text).

Add a "clear filter" visual — when any stat card filter is active, show a small `×` or reset link below the cards:
```tsx
{activeStatCard !== "ALL" && (
  <button
    onClick={() => setActiveStatCard("ALL")}
    className="text-xs text-muted-foreground hover:text-foreground underline"
  >
    Clear filter
  </button>
)}
```

---

### R3-FIX 2 — Leads: Add Lead Dropdown Button Invisible on Hover

**Problem:** The 3-dot menu dropdown on the Leads toolbar uses `group-hover:block` CSS. This causes the dropdown to disappear when the mouse moves from the trigger button into the dropdown items (losing hover state on the parent). The "Add Lead" button appears to vanish or become transparent on hover.

**File to change:** `src/app/(dashboard)/leads/page.tsx`

Replace the CSS-only `group-hover` dropdown with a state-controlled one.

Find:
```tsx
<div className="relative group">
  <button className="p-2 border rounded-md hover:bg-muted transition-colors">
    <MoreVertical className="w-5 h-5 text-muted-foreground" />
  </button>
  <div className="absolute right-0 mt-1 hidden group-hover:block w-40 bg-popover border shadow-lg rounded-md z-50">
    <button
      className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
      onClick={() => setIsAddOpen(true)}
    >
      <Plus className="w-4 h-4" /> Add Lead
    </button>
  </div>
</div>
```

Replace with a state-controlled dropdown. Add state: `const [isMenuOpen, setIsMenuOpen] = useState(false);`

```tsx
<div className="relative">
  <button
    className="p-2 border rounded-md hover:bg-muted transition-colors"
    onClick={() => setIsMenuOpen(v => !v)}
  >
    <MoreVertical className="w-5 h-5 text-muted-foreground" />
  </button>
  {isMenuOpen && (
    <>
      {/* Invisible overlay to close menu when clicking outside */}
      <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
      <div className="absolute right-0 mt-1 w-40 bg-popover border shadow-lg rounded-md z-50">
        <button
          className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2 text-foreground"
          onClick={() => { setIsAddOpen(true); setIsMenuOpen(false); }}
        >
          <Plus className="w-4 h-4" /> Add Lead
        </button>
      </div>
    </>
  )}
</div>
```

Note: `text-foreground` is explicitly added to the button so it never goes transparent.

---

### R3-FIX 3 — Leads: Checkboxes Not Functional

**Problem:** The checkboxes in the Leads table render but do nothing when clicked. The DataTable component supports checkbox selection via `selectedIds`, `onSelectChange`, and `onSelectAll` props — but the Leads page passes none of them, so checkboxes have no state.

**File to change:** `src/app/(dashboard)/leads/page.tsx`

Add state near other state declarations:
```ts
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
```

Add handlers:
```ts
const handleSelectChange = (id: string, selected: boolean) => {
  setSelectedIds(prev => {
    const next = new Set(prev);
    if (selected) next.add(id); else next.delete(id);
    return next;
  });
};

const handleSelectAll = (selected: boolean) => {
  if (selected) setSelectedIds(new Set(leads.map(l => l.id)));
  else setSelectedIds(new Set());
};
```

Pass to `<DataTable>`:
```tsx
<DataTable
  columns={columns}
  data={leads}
  keyExtractor={(row) => row.id}
  selectable
  selectedIds={selectedIds}
  onSelectChange={handleSelectChange}
  onSelectAll={handleSelectAll}
  onRowClick={handleRowClick}
/>
```

When leads change (after fetch), clear selection:
```ts
setSelectedIds(new Set());
```
Add that line inside `fetchLeads` after `setLeads(json.data)`.

---

### R3-FIX 4 — Leads: Stage Dropdown in Detail Drawer — Remove Converted & Lost

**Problem:** The Stage dropdown inside the Lead Detail drawer includes "Converted" and "Lost" as options. These are confusing because dedicated action buttons already exist for both actions. Selecting "Converted" from the dropdown bypasses the Convert to Client flow (no client record is created). Selecting "Lost" from the dropdown duplicates the "Mark as Lost" button.

**File to change:** `src/app/(dashboard)/leads/page.tsx`

Find the Stage `<select>` inside the Lead Detail `<SlideOver>` (inside the Deal Information section):

```tsx
<select
  className="w-full p-2 border rounded-md text-sm mt-1 bg-background"
  value={selectedLead.stage}
  onChange={(e) => handleUpdateStage(e.target.value)}
>
  <option value="NEW">New</option>
  <option value="CONTACTED">Contacted</option>
  <option value="QUALIFIED">Qualified</option>
  <option value="CONVERTED">Converted</option>
  <option value="LOST">Lost</option>
</select>
```

Replace with (remove CONVERTED and LOST options):
```tsx
<select
  className="w-full p-2 border rounded-md text-sm mt-1 bg-background"
  value={selectedLead.stage}
  onChange={(e) => handleUpdateStage(e.target.value)}
  disabled={selectedLead.stage === 'CONVERTED' || selectedLead.stage === 'LOST'}
>
  <option value="NEW">New</option>
  <option value="CONTACTED">Contacted</option>
  <option value="QUALIFIED">Qualified</option>
  {/* Show current stage as read-only label if already terminal */}
  {selectedLead.stage === 'CONVERTED' && <option value="CONVERTED" disabled>Converted (via Convert button)</option>}
  {selectedLead.stage === 'LOST' && <option value="LOST" disabled>Lost (use Mark as Lost button)</option>}
</select>
```

This way: if the lead is already Converted or Lost, the dropdown is disabled and shows why. If the lead is still open (NEW/CONTACTED/QUALIFIED), users can only move between those three — and must use the dedicated green/red buttons to convert or lose.

---

### R3-FIX 5 — Leads: Lead Score — Add Label and Editable Field in Drawer

**Problem:** The user does not know what "Lead Score" means. It shows as a red "0" badge in the table with no explanation. There is also no way to set or update it.

**Two-part fix:**

**Part A — Table column tooltip:**
In the `columns` array in `src/app/(dashboard)/leads/page.tsx`, find the Lead Score column header. Add a tooltip title to the header.

The column currently has `header: "Lead Score"`. Wrap the table header in a `<span>` with a `title` attribute — but since `header` is just a string in `ColumnDef`, instead add the explanation directly to the score badge cell:

In the Lead Score cell renderer, add a `title` attribute to the outer div:
```tsx
<div className="w-16" title="Lead Score: 0–100 qualification score. Red = cold, Orange = warm, Green = hot.">
```

**Part B — Editable in drawer:**
In the Lead Detail `<SlideOver>`, inside the Lead Info grid section, find where lead score is displayed. Add an editable number input below the score progress bar:

```tsx
<div>
  <div className="text-muted-foreground mb-1 text-xs uppercase tracking-wider">Lead Score</div>
  <div className="flex items-center gap-2">
    <input
      type="number"
      min={0}
      max={100}
      defaultValue={selectedLead.leadScore}
      className="w-20 p-1.5 border rounded-md text-sm text-center font-bold"
      onBlur={async (e) => {
        const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
        await fetch(`/api/leads/${selectedLead.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadScore: val }),
        });
        handleRowClick(selectedLead);
        fetchLeads();
      }}
    />
    <span className="text-xs text-muted-foreground">/ 100 — qualification score (0 = cold, 100 = hot)</span>
  </div>
  <div className="w-full bg-muted rounded-full h-1.5 mt-2">
    <div
      className={cn("h-1.5 rounded-full", calculateScoreProgressColor(selectedLead.leadScore))}
      style={{ width: `${selectedLead.leadScore}%` }}
    />
  </div>
</div>
```

---

### R3-FIX 6 — Convert to Client: GST and PAN Number Validation

**Problem:** The GST Number and PAN Number fields in the Convert to Client modal accept any text. Wrong formats should be rejected before form submission.

**File to change:** `src/app/(dashboard)/leads/page.tsx` (the Convert to Client `<Modal>`)

**GST Number rules:**
- Exactly 15 characters
- Format: `22AAAAA0000A1Z5` — 2 digits + 5 letters + 4 digits + 1 letter + 1 digit + 1 letter + 1 digit
- Regex: `/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/`

**PAN Number rules:**
- Exactly 10 characters
- Format: `AAAAA9999A` — 5 letters + 4 digits + 1 letter
- Regex: `/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/`

Replace the GST and PAN inputs inside the Convert form:

```tsx
<div>
  <label className="block text-sm font-medium mb-1">GST Number</label>
  <input
    name="gstNumber"
    placeholder="22AAAAA0000A1Z5"
    maxLength={15}
    pattern="^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$"
    title="Enter valid GST number (e.g. 22AAAAA0000A1Z5)"
    className="w-full p-2 border rounded-md text-sm uppercase"
    onChange={(e) => { e.target.value = e.target.value.toUpperCase(); }}
  />
  <p className="text-xs text-muted-foreground mt-0.5">15 characters — e.g. 22AAAAA0000A1Z5</p>
</div>
<div>
  <label className="block text-sm font-medium mb-1">PAN Number</label>
  <input
    name="panNumber"
    placeholder="AAAAA9999A"
    maxLength={10}
    pattern="^[A-Z]{5}[0-9]{4}[A-Z]{1}$"
    title="Enter valid PAN number (e.g. ABCDE1234F)"
    className="w-full p-2 border rounded-md text-sm uppercase"
    onChange={(e) => { e.target.value = e.target.value.toUpperCase(); }}
  />
  <p className="text-xs text-muted-foreground mt-0.5">10 characters — e.g. ABCDE1234F</p>
</div>
```

Apply the **same validation** to the Add Client form (Fix 9b in Round 2) — find the GST and PAN inputs there and replace with the same pattern above.

---

## UPDATED BUILD ORDER (append Round 3 after Round 2)

After completing all 15 Round 2 fixes, continue with:

16. R3-Fix 1 — Leads stats cards click-to-filter
17. R3-Fix 2 — Add Lead dropdown hover bug (state-controlled)
18. R3-Fix 3 — Leads checkbox selection wiring
19. R3-Fix 4 — Stage dropdown: remove Converted/Lost options
20. R3-Fix 5 — Lead Score label + editable in drawer
21. R3-Fix 6 — GST/PAN validation in Convert modal and Add Client modal

---

## VERIFICATION CHECKLIST (run these after building)

After each fix, verify:

- [ ] `npx tsc --noEmit` — no TypeScript errors
- [ ] `npx next build` — build succeeds
- [ ] No new imports that aren't available in the existing package.json
- [ ] All new API routes return `{ error: "..." }` on failure and `{ data: ... }` on success
- [ ] All new API routes call `getServerSession(authOptions)` and return 401 if session is null
- [ ] No `console.log` left in production code (only `console.error` for errors is acceptable)
