# PRABANDH — Complete Build Specification
> Hand this document to Jules. Every UI element, field, interaction, API route, and schema change is described below.
> Tech stack: Next.js 16 (App Router), Prisma + SQLite, Tailwind CSS, lucide-react, next-auth.

---

## 0. CONVENTIONS

- All pages are under `src/app/(dashboard)/`
- All API routes are under `src/app/api/`
- Use `"use client"` only when state/hooks are needed; prefer server components for data fetching
- Tailwind only — no extra UI libraries
- All table pages follow the same shell: stats bar → title + search + actions → table
- Avatar circles: 2 capital letters, bg color derived from name hash, white text, rounded-full, w-8 h-8
- Auto-IDs: Tasks → TSK + 5-digit zero-padded number (TSK00001), Clients → auto client code (PLC/PVT/PAR + 5 digits based on entity type), Services → internal uuid
- Badges: pill shape (`px-2 py-0.5 rounded-full text-xs font-medium`)

---

## 1. DATABASE SCHEMA CHANGES (prisma/schema.prisma)

### 1a. Modify `Service` model
```prisma
model Service {
  id              String   @id @default(uuid())
  name            String
  description     String?
  category        String   // GST | MCA | TDS/TCS | Income Tax | PF | ESI | Professional Tax | Advance Tax | Manual
  frequency       String   @default("ONE_TIME") // ONE_TIME | DAILY | WEEKLY | FORTNIGHTLY | MONTHLY | QUARTERLY | ANNUAL
  professionalFee Float    @default(0)
  hasSOP          Boolean  @default(false)
  hasSubtasks     Boolean  @default(false)
  isActive        Boolean  @default(true)
  isLocked        Boolean  @default(false) // shows lock icon — system default services cannot be deleted
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  invoiceLineItems InvoiceLineItem[]
  rateCards        ClientRateCard[]
  slas             SLA[]
  tasks            Task[]           @relation("ServiceTasks")
  sopSteps         ServiceSOP[]
}
```

### 1b. Add `ServiceSOP` model (SOP steps linked to a service)
```prisma
model ServiceSOP {
  id          String   @id @default(uuid())
  serviceId   String
  service     Service  @relation(fields: [serviceId], references: [id], onDelete: Cascade)
  title       String
  description String?
  orderIndex  Int
  createdAt   DateTime @default(now())
}
```

### 1c. Modify `Task` model
Add these fields:
```prisma
  taskNumber    Int      @default(autoincrement()) // used to generate TSK00001
  serviceId     String?
  service       Service? @relation("ServiceTasks", fields: [serviceId], references: [id])
  category      String?  // derived from service.category, stored for fast filtering
  reviewerId    String?
  reviewer      User?    @relation("ReviewedTasks", fields: [reviewerId], references: [id])
  isRecurring   Boolean  @default(false)
  frequency     String?  // DAILY | WEEKLY | FORTNIGHTLY | MONTHLY | QUARTERLY | ANNUAL
  recurringEnd  DateTime? // when recurring stops
  parentTaskId  String?  // for recurring child tasks, points to parent
```

Add to `User` model:
```prisma
  reviewedTasks Task[] @relation("ReviewedTasks")
```

### 1d. Modify `Lead` model
Replace the current Lead model with:
```prisma
model Lead {
  id              String   @id @default(uuid())
  leadNumber      Int      @default(autoincrement()) // for display reference
  businessName    String
  legalName       String?
  businessEntity  String?  // Public Limited | Private Limited | Partnership | LLP | Proprietorship | Trust | HUF
  contactName     String?
  contactEmail    String?
  contactPhone    String?
  source          String?  // Website | Referral | Walk-in | Social Media | Cold Call | Other
  leadScore       Int      @default(0)  // 0–100
  stage           String   @default("NEW") // NEW | CONTACTED | QUALIFIED | CONVERTED | LOST
  dealValue       Float?
  dealType        String?  // One-time | Recurring | Retainer
  notes           String?
  assignedToId    String?
  assignedTo      User?    @relation("AssignedLeads", fields: [assignedToId], references: [id])
  convertedToClientId String? // set when converted
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### 1e. Modify `ClientProfile` model
Add these fields:
```prisma
  clientCode      String?  @unique // auto-generated: PLC00001 / PVT00001 / PAR00001 etc.
  legalName       String?
  contactName     String?
  contactEmail    String?
  mobile          String?
  businessEntity  String?  // Public Limited | Private Limited | Partnership | LLP | Proprietorship | Trust | HUF
  auditorId       String?
  auditor         User?    @relation("ClientAuditor", fields: [auditorId], references: [id])
  labels          String?  // comma-separated label names
  isActive        Boolean  @default(true)
  lastActivityAt  DateTime?
```

Add to `User`:
```prisma
  auditedClients ClientProfile[] @relation("ClientAuditor")
```

### 1f. Add `Counter` model (for auto-incrementing human-readable IDs)
```prisma
model Counter {
  id      String @id // "task" | "client_PLC" | "client_PVT" | "client_PAR" etc.
  value   Int    @default(0)
}
```

---

## 2. SIDEBAR NAVIGATION

File: `src/app/(dashboard)/layout.tsx`

### Sidebar links (in order, icon from lucide-react):
| Label | href | Icon |
|-------|------|------|
| Home | /action-center | LayoutDashboard |
| Leads | /leads | UserPlus |
| Clients | /clients | Users |
| Services | /services | Briefcase |
| Tasks | /tasks | CheckSquare |
| Invoice | /billing/invoices | FileText |
| DSC | /registers/dsc | Shield |
| Licenses | /registers/licenses | FileCheck |
| Passwords | /registers/passwords | Lock |
| Doc Inbox | /documents | Inbox |
| HR & Team | /hr | UserCog |
| Reports | /reports | PieChart |

### Sidebar design:
- Width: `w-16` collapsed (icon only) on small screens, `w-56` on desktop
- Logo area top: show "Prabandh" in bold primary color with a small icon
- Each nav item: icon (w-5 h-5) + label text, active = bg-primary text-primary-foreground rounded-md
- Bottom: Logout button with LogOut icon

### Top header bar (right side):
- Logged-in user's name (from session)
- Logged-in user's role below name (smaller, muted)
- Avatar circle (2 initials from name, colored)

---

## 3. MODULE: SERVICES

**Route:** `/services`
**File:** `src/app/(dashboard)/services/page.tsx`
**API Routes:**
- `GET /api/services` — list all, supports `?category=GST&status=active&search=gstr`
- `POST /api/services` — create service
- `PUT /api/services/[id]` — update service
- `DELETE /api/services/[id]` — delete (only if not locked)
- `GET /api/services/[id]/sops` — get SOP steps for a service
- `POST /api/services/[id]/sops` — add SOP step
- `PUT /api/services/[id]/sops/[sopId]` — update SOP step
- `DELETE /api/services/[id]/sops/[sopId]` — delete SOP step

### 3a. Page Layout

```
┌─────────────────────────────────────────────────────────┐
│  Services (83)              [Search bar]    [⋮ menu]    │
├─────────────────────────────────────────────────────────┤
│  [☐] Service ⋮  Category ⋮  Frequency ⋮  Fee ⋮         │
│       SOP ⋮  Sub Tasks ⋮  Status ⋮  Actions            │
├─────────────────────────────────────────────────────────┤
│  row...                                                 │
└─────────────────────────────────────────────────────────┘
```

### 3b. Top bar
- Title: `Services (N)` — N = total count from DB, bold, left-aligned
- Right side: search input (magnifier icon inside, placeholder "Search services...") + `⋮` (3-dot) dropdown menu
- 3-dot menu options: `+ Add Service`, `Import`, `Export CSV`
- No separate "+ Add" button at top — it's inside the 3-dot menu

### 3c. Table columns (exact order)
| Column | Type | Notes |
|--------|------|-------|
| Checkbox | checkbox | select row for bulk actions |
| Service | text + avatar | Colored circle avatar (first letter of service name), lock icon (🔒) if `isLocked=true` shown right of name |
| Category | text | plain text |
| Frequency | text | ONE_TIME shows as `-`, others show as Monthly / Quarterly etc. |
| Professional Fee | currency | shows `₹X,XXX` or `-` if 0 |
| SOP | badge | Green pill "Yes" if `hasSOP=true`, Red pill "No" if false |
| Sub Tasks | badge | Green pill "Yes" if `hasSubtasks=true`, Red pill "No" if false |
| Status | badge | Green pill "Active" if `isActive=true`, Gray pill "Inactive" if false |
| Actions | icon button | `⋮` 3-dot with: Edit, Manage SOPs, Toggle Status, Delete |

### 3d. Category filter tabs (above table, horizontal scroll)
Tabs (pill style, active = primary bg):
`All` | `GST` | `MCA` | `TDS/TCS` | `Income Tax` | `PF` | `ESI` | `Professional Tax` | `Advance Tax` | `Manual`

### 3e. Add / Edit Service — Slide-over panel (right side drawer, not modal)
Fields:
- **Service Name** — text input, required
- **Category** — dropdown: GST | MCA | TDS/TCS | Income Tax | PF | ESI | Professional Tax | Advance Tax | Manual
- **Frequency** — dropdown: One-time | Daily | Weekly | Fortnightly | Monthly | Quarterly | Annual
- **Professional Fee (₹)** — number input, optional
- **Description** — textarea, optional
- **Status** — toggle switch: Active / Inactive (default Active)
- **Mark as Locked** — checkbox (admin only)
- Buttons: `Save Service` (primary) | `Cancel`

### 3f. Manage SOPs — Slide-over panel (opens from Actions > Manage SOPs)
- Header: "SOP Checklist — [Service Name]"
- List of existing steps (drag handle icon, step title, edit/delete icons)
- "Add Step" button at bottom → inline input for step title + description
- Steps are ordered (orderIndex), support drag-to-reorder
- Each step: index number, title (bold), description (muted), edit pencil icon, trash icon

### 3g. Seed Data for Services
Pre-populate the following services in `prisma/seed.ts`:

**GST:**
GSTR-1 (Monthly), GSTR-1 (Quarterly - QRMP), GSTR-3B (Monthly), GSTR-3B (QRMP - North India), GSTR-3B (QRMP - South India), GSTR-4 (Composition Dealers), GSTR-5 (Non-resident taxable), GSTR-5A (OIDAR), GSTR-7 (TDS Return), GSTR-9 (Annual Return), GSTR-9C (Reconciliation), GSTR-10 (Final Return), GSTR-11 (Inward Supplies for UIN), CMP-08 (Composition Dealers)

**MCA:**
AOC-4 (Annual Filing), MGT-7 (Annual Return), DIR-3 KYC, ADT-1 (Auditor Appointment), INC-20A (Commencement of Business), INC-22 (Registered Office), PAS-3 (Allotment of Shares), SH-7 (Change in Share Capital)

**TDS/TCS:**
24Q (Salary TDS Return), 26Q (Non-Salary TDS), 27Q (TDS on Foreign Payments), 27EQ (TCS Return), 26QB (TDS on Property), 26QC (TDS on Rent)

**Income Tax:**
ITR-1 (Individual Salary), ITR-2 (Capital Gains), ITR-3 (Business Income), ITR-4 (Presumptive Income), ITR-5 (Partnership), ITR-6 (Company Return), ITR-7 (Trust/NGO), Amendment of PAN, Form 15CA/15CB, Advance Tax Challan

**Professional Tax:**
Professional Tax Return, PT Registration, PT Enrollment Certificate

**PF:**
PF Return Filing, PF Registration, PF Compliance, PF Transfer, PF Withdrawal

**ESI:**
ESI Return, ESI Registration, ESI Compliance

**Advance Tax:**
Advance Tax Payment, Advance Tax Calculation, Advance Tax Challan

**Manual:**
Custom Compliance, Manual Audit, Advisory Services, Certification Work

Mark the following as `isLocked: true` (system defaults — cannot be deleted):
GSTR-1 (Monthly), GSTR-1 (Quarterly - QRMP), GSTR-3B (Monthly), GSTR-5A (OIDAR), GSTR-7 (TDS Return), 24Q, 26Q, ITR-1 through ITR-7

---

## 4. MODULE: TASKS & WORKFLOW

**Routes:**
- `/tasks` → redirects to `/tasks/list`
- `/tasks/list` — main task list (replaces tracker)
- `/tasks/summary` — task summary analytics
- `/tasks/templates` — service templates / recurring config (existing, enhance)
- `/tasks/calendar` — calendar view (existing)

**API Routes:**
- `GET /api/tasks` — list tasks, supports filters: `?category=GST&status=PENDING&assigneeId=x&search=y&page=1&limit=50`
- `POST /api/tasks` — create task
- `PUT /api/tasks/[id]` — update task (status, assignee, reviewer, priority, due date)
- `DELETE /api/tasks/[id]` — delete task
- `GET /api/tasks/stats` — returns counts per status for the summary cards
- `POST /api/tasks/[id]/complete-sop/[sopId]` — mark a SOP step as done

### 4a. Page: `/tasks/list`

#### Sub-navigation tabs (top of page, below breadcrumb):
`Task List` (active by default) | `Task Summary`
— Tab style: underline style, active tab has primary color underline and text

#### Category filter pills (horizontal scrollable row, below tabs):
`All Categories` | `GST` | `MCA` | `TDS/TCS` | `Professional Tax` | `PF` | `ESI` | `Income Tax` | `Advance Tax` | `Manual`
— Active pill: solid primary background, white text
— Inactive pill: border, muted text

#### Status summary cards (8 cards in a horizontal row):
Each card: icon (colored) + count (large bold) + label (small muted)

| Card | Icon | Color | Status Value |
|------|------|-------|-------------|
| Total Tasks | ClipboardList | orange | all |
| Pending | PauseCircle | blue | PENDING |
| In Progress | Timer | amber/yellow | IN_PROGRESS |
| Sent for Review | Upload | blue | SENT_FOR_REVIEW |
| Request Changes | RefreshCw | indigo | REQUEST_CHANGES |
| Overdue | AlarmClock | red | OVERDUE |
| Completed | CheckCircle2 | green | COMPLETED |
| Cancelled/On Hold | XCircle | red | CANCELLED |

Card design: `bg-card border rounded-xl p-4`, icon in top-left, count as `text-3xl font-bold`, label below in `text-xs text-muted-foreground`. Each card is clickable and filters the table to that status.

#### Table header row:
```
[☐]  ID       Client          Service                    Category    Assignee  Status          Reviewer  Priority
```

#### Table — column specifications:

**Checkbox column:** standard row selection

**ID column:**
- Display: `#TSK00850` — monospace font or font-medium, muted color
- Width: ~100px fixed

**Client column:**
- Line 1: Company name — bold, dark
- Line 2: Client code (e.g. SPE00206) — text-xs text-muted-foreground
- Width: ~180px

**Service column:**
- Plain text service name (e.g. "GSTR-5 (Non-resident taxable)")
- Width: ~200px

**Category column:**
- Plain text (GST, MCA, TDS/TCS, etc.)
- Width: ~100px

**Assignee column:**
- Circular avatar — 2 initials (e.g. "AS"), colored bg based on name
- Tooltip on hover shows full name
- Width: ~80px, centered

**Status column:**
- Badge (pill) with color coding:
  - `Pending` → gray bg, gray text
  - `In Progress` → blue bg, blue text
  - `Sent for Review` → sky/cyan bg, sky text
  - `Request Changes` → indigo bg, indigo text  
  - `Completed` → green bg, green text
  - `Overdue` → orange bg, orange text + extra red "OD" badge beside it
  - `Cancelled` → red bg, red text
- Width: ~150px

**Reviewer column:**
- Same avatar style as Assignee, or `-` if none
- Width: ~80px, centered

**Priority column:**
- Text only, colored:
  - `High` → `text-red-500 font-semibold`
  - `Medium` → `text-orange-500 font-semibold`
  - `Low` → `text-green-500 font-semibold`
- Width: ~80px

#### Table toolbar (between category pills and the table):
Left: `Tasks (N)` — count updates with active filter
Right: `[🔍 Search...]` input + `[+ Add]` button (primary, with Plus icon)

#### Row interactions:
- Clicking a row opens a right-side drawer (Task Detail panel)
- Hovering row shows subtle highlight

#### Task Detail Drawer (right slide-over, ~480px wide):
Header:
- Task ID (`#TSK00850`) in muted monospace
- Task title (large bold)
- Status badge (same colors as table)
- Close (X) button top-right

Sections:
1. **Details section:**
   - Client (with link)
   - Service
   - Category
   - Due Date (with calendar icon, red if overdue)
   - Created by + Created on

2. **Assignment section:**
   - Assignee (avatar + name, dropdown to change)
   - Reviewer (avatar + name or "None", dropdown to change)
   - Priority (Low / Medium / High selector pills)

3. **Status section:**
   - Current status badge
   - Action buttons based on current status:
     - If PENDING → `[Mark In Progress]`
     - If IN_PROGRESS → `[Send for Review]`
     - If SENT_FOR_REVIEW → `[Approve → Complete]` + `[Request Changes]`
     - If REQUEST_CHANGES → `[Mark In Progress]`
     - All statuses → `[Mark Overdue]` | `[Cancel Task]`

4. **SOP Checklist section** (only if task has SOPs):
   - Section heading "SOP Checklist"
   - Each step: checkbox + step number + title + description
   - Completed steps: strikethrough text, checkbox checked, muted
   - Progress bar at top of section (e.g. "3/5 steps done")

5. **Subtasks section** (if any):
   - Each subtask: checkbox + title
   - `+ Add subtask` link at bottom

6. **Notes/Comments section:**
   - Text area to add a note
   - `Add Note` button

#### Add Task — Modal (triggered by "+ Add" button):
Fields:
- **Task Title** — text, required
- **Client** — searchable dropdown of all clients
- **Service** — searchable dropdown (filters by client's assigned services if client selected first)
- **Category** — auto-filled from service, editable dropdown
- **Assignee** — dropdown of all staff users (ADMIN / SENIOR_STAFF / JUNIOR_STAFF)
- **Reviewer** — dropdown of staff users, optional
- **Priority** — pill selector: Low | Medium | High (default Medium)
- **Due Date** — date picker
- **Is Recurring?** — toggle switch
  - If ON → show **Frequency** dropdown: Daily | Weekly | Fortnightly | Monthly | Quarterly | Annual
  - If ON → show **Recurring End Date** — date picker, optional
- **Description / Notes** — textarea, optional
- Buttons: `Create Task` (primary) | `Cancel`

When task is created:
- Auto-generate taskNumber (increment Counter for "task")
- Display ID = `TSK` + zero-pad taskNumber to 5 digits
- If service is linked, copy ServiceSOP steps as the task's SOP checklist

### 4b. Page: `/tasks/summary` (Tab 2)
Display charts and summary stats:
- Total tasks by status (horizontal bar chart or donut)
- Tasks by category (bar chart)
- Overdue tasks list (table, same columns as main table but filtered)
- Top assignees by task count (ranked list)
- Tasks due this week (small table)

---

## 5. MODULE: LEADS

**Route:** `/leads`
**File:** `src/app/(dashboard)/leads/page.tsx`

**API Routes:**
- `GET /api/leads` — list leads, supports `?stage=NEW&search=name&page=1&limit=50`
- `POST /api/leads` — create lead
- `PUT /api/leads/[id]` — update lead
- `DELETE /api/leads/[id]` — delete lead
- `POST /api/leads/[id]/convert` — convert lead to client

### 5a. Stats bar (top, 5 cards in a row):

| Card | Value | Icon | Background |
|------|-------|------|-----------|
| Open | count of NEW+CONTACTED+QUALIFIED | Clock | light gray |
| Converted | count of CONVERTED | CheckCircle | light green |
| Lost | count of LOST | UserX | light red |
| Total Leads | count of all | Users | light blue |
| Conversion Rate | (converted/total)*100 + "%" | Percent | light cyan |

Card design: icon on right (large, 40px, muted color), number large bold on left, label below number. Horizontal row, equal width.

### 5b. Table toolbar:
Left: `Leads (N)` — N = total matching current filter
Right: `[🔍 Search...]` + `[Filters ▼]` button + `[≡]` view toggle icon + `[⋮]` 3-dot menu

Filters panel (dropdown when "Filters" clicked):
- Stage: multi-select checkboxes (NEW, CONTACTED, QUALIFIED, CONVERTED, LOST)
- Source: multi-select (Website, Referral, Walk-in, Social Media, Cold Call, Other)
- Assigned To: dropdown of staff users
- Date range: from / to date pickers
- `Apply Filters` button | `Clear All` link

### 5c. Table columns (exact order):

| Column | Type | Notes |
|--------|------|-------|
| Checkbox | checkbox | row selection |
| Created On | date | formatted as `Oct 23, 2025` |
| Business Name | text + avatar | Colored 2-letter avatar circle + business name bold |
| Business Entity | text | Public Limited Co / Private Limited Co / Partnership Firm / LLP / Proprietorship / Trust / HUF or `-` |
| Contact Person | text + avatar | Colored 2-letter avatar + contact name |
| Contact No | text | phone number or `-` |
| Lead Score | number + progress bar | Score 0–100 shown as colored number badge (red if <30, orange if <70, green if ≥70) + thin horizontal progress bar below |
| Stage | text | plain text or `-` |
| Deal Value | currency | `₹X,XXX` or `-` |
| Deal Type | text | One-time / Recurring / Retainer or `-` |
| User (Assigned) | avatar | 2-letter avatar circle, tooltip = full name |

Table rows are paginated: `Rows per page: 50 ▼` selector + `1–N of M` count + prev/next arrows — all bottom-right.

### 5d. Row click — Lead Detail Drawer (right slide-over):
Sections:
1. **Header:** Business name (large bold) + stage badge + close button
2. **Lead Info:** Created on, Source, Business Entity, Lead Score (progress bar visual)
3. **Contact:** Contact Person, Email, Phone
4. **Deal:** Deal Value, Deal Type, Stage (editable dropdown)
5. **Assignment:** Assigned To (dropdown)
6. **Notes:** textarea + save button, previous notes shown as timeline below
7. **Actions:**
   - `Convert to Client` button (green, shown only if stage ≠ CONVERTED) — opens Convert modal
   - `Mark as Lost` button (red outline) — sets stage to LOST
   - `Delete Lead` button (destructive, red)

### 5e. Add Lead — Modal:
Fields:
- **Business Name** — text, required
- **Legal Name** — text, optional
- **Business Entity** — dropdown: Public Limited | Private Limited | Partnership Firm | LLP | Proprietorship | Trust | HUF
- **Contact Person Name** — text
- **Contact Email** — email input
- **Contact Phone** — tel input, 10-digit
- **Source** — dropdown: Website | Referral | Walk-in | Social Media | Cold Call | Other
- **Stage** — dropdown: NEW | CONTACTED | QUALIFIED (default NEW)
- **Deal Value (₹)** — number, optional
- **Deal Type** — dropdown: One-time | Recurring | Retainer, optional
- **Assigned To** — dropdown of staff users
- **Notes** — textarea
- Buttons: `Add Lead` (primary) | `Cancel`

### 5f. Convert to Client — Modal (triggered from Lead Detail drawer):
Pre-fills from lead data:
- **Business Name** — pre-filled, editable
- **Legal Name** — pre-filled, editable
- **Business Entity** — pre-filled, editable
- **Contact Name** — pre-filled, editable
- **Mobile** — pre-filled, editable
- **GST Number** — text, optional
- **PAN Number** — text, optional
- **Address** — textarea, optional
- **Assigned Employee** — dropdown of staff
- **Auditor** — dropdown of staff with SENIOR_STAFF or ADMIN role
- **Group** — dropdown of existing ClientGroups, optional
Buttons: `Convert & Create Client` (primary) | `Cancel`

On submit:
- Create ClientProfile record with auto-generated clientCode
- Set lead's `stage = CONVERTED`, set `convertedToClientId`
- Redirect to `/clients/[new-client-id]`

---

## 6. MODULE: CLIENTS

**Route:** `/clients`
**File:** `src/app/(dashboard)/clients/page.tsx`

**API Routes:**
- `GET /api/clients` — list clients, supports `?search=name&activity=active&page=1&limit=50`
- `POST /api/clients` — create client
- `PUT /api/clients/[id]` — update client
- `DELETE /api/clients/[id]` — delete client
- `GET /api/clients/[id]` — get single client with all details

### 6a. Stats bar (top, 4 cards):

| Card | Label | Calculation | Icon | Color |
|------|-------|-------------|------|-------|
| 1 | Total Clients | count of all active ClientProfile records | Users | blue |
| 2 | New Clients this month | created in current calendar month | UserPlus | green |
| 3 | Active Clients 90 days | have a task or activity in last 90 days | UserCheck | green |
| 4 | No Activity 90 days | no task/activity in last 90 days | UserSearch | orange |

Card design: Large number left, icon right (muted, large), label below number. Equal-width cards.

### 6b. Table toolbar:
Left: `Client (N)` — bold
Right: `[🔍 Search clients...]` + `[⋮]` 3-dot menu (options: Add Client, Export CSV)

### 6c. Table columns (exact order):

| Column | Type | Notes |
|--------|------|-------|
| Checkbox | checkbox | row selection |
| Business Name | text + avatar + code | 2-letter colored avatar circle + business name (bold) on same line, client code (e.g. PLC00002) below in text-xs muted |
| Legal Name | text | plain text |
| Contact Name | text + avatar | 2-letter colored avatar + contact name + email below in text-xs muted |
| Mobile | text | phone number or `-` |
| Business Entity | text | truncated with `...` if long, full on hover tooltip |
| Services | avatar group | up to 2-3 colored 2-letter avatar circles for assigned staff/services (truncated); show `+N` if more |
| Employee | avatar | assigned employee 2-letter avatar circle |
| Groups | avatar | group avatar circle or `-` |
| Auditor | avatar | auditor 2-letter avatar circle or `-` |
| Labels | colored pill badges | small colored pills, e.g. "ID" (indigo), "GF" (green) — clickable |

All avatar circles: w-7 h-7, rounded-full, text-xs font-bold, white text.
Multiple avatar circles in a column overlap slightly (stacked left-to-right with -ml-1).

### 6d. Row click — Client Detail Page (full page, not drawer):
Route: `/clients/[id]`
Page layout: Left sidebar (client info) + Right main content (tabs)

**Left sidebar (fixed, ~280px):**
- Large avatar circle (2 initials, colored)
- Business name (bold, large)
- Client code (muted, small)
- Business entity type
- Section: Contact info (name, email, mobile)
- Section: GST / PAN numbers
- Section: Address
- Section: Assigned Employee + Auditor (avatars)
- Section: Group (name)
- Section: Labels (pill badges)
- `Edit Client` button at bottom

**Right main content — tabs:**
1. **Overview** — recent tasks (last 5), recent invoices, activity timeline
2. **Tasks** — same table as Tasks page but pre-filtered to this client
3. **Services** — list of services assigned to this client (add/remove)
4. **Documents** — file list (upload, download)
5. **DSC** — DSC records for this client
6. **Licenses** — License records for this client
7. **Passwords** — Password vault entries for this client
8. **Invoices** — Invoice history
9. **Notes** — free text notes

### 6e. Add Client — Modal:
Fields:
- **Business Name** — text, required
- **Legal Name** — text, optional
- **Business Entity** — dropdown: Public Limited | Private Limited | Partnership Firm | LLP | Proprietorship | Trust | HUF (required)
- **Contact Person Name** — text
- **Contact Email** — email
- **Mobile** — tel, 10-digit
- **GST Number** — text, optional
- **PAN Number** — text, optional
- **Address** — textarea, optional
- **Assigned Employee** — dropdown staff users
- **Auditor** — dropdown senior staff / admin
- **Group** — dropdown ClientGroups, optional
- **Labels** — tag input (type and press Enter to add label)
Buttons: `Add Client` (primary) | `Cancel`

Client code auto-generation logic:
- Public Limited → `PLC` + zero-pad counter
- Private Limited → `PVT` + zero-pad counter
- Partnership → `PAR` + zero-pad counter
- LLP → `LLP` + zero-pad counter
- Proprietorship → `PRO` + zero-pad counter
- Trust → `TRS` + zero-pad counter
- HUF → `HUF` + zero-pad counter

---

## 7. SHARED COMPONENTS TO BUILD

### 7a. `<Avatar name={string} size="sm|md|lg" />` 
- Generates consistent color from name string (use simple hash → pick from 8 preset bg colors)
- Shows first 2 capital letters of name
- Sizes: sm = w-6 h-6 text-xs, md = w-8 h-8 text-sm, lg = w-12 h-12 text-base

### 7b. `<StatusBadge status={string} />`
- Renders colored pill for any status value
- Color map:
  - PENDING → `bg-gray-100 text-gray-700`
  - IN_PROGRESS → `bg-blue-100 text-blue-700`
  - SENT_FOR_REVIEW → `bg-sky-100 text-sky-700`
  - REQUEST_CHANGES → `bg-indigo-100 text-indigo-700`
  - COMPLETED → `bg-green-100 text-green-700`
  - OVERDUE → `bg-orange-100 text-orange-700` + secondary `bg-red-500 text-white` "OD" badge
  - CANCELLED → `bg-red-100 text-red-700`
  - Active → `bg-green-100 text-green-700`
  - Inactive → `bg-gray-100 text-gray-500`
  - NEW → `bg-blue-50 text-blue-600`
  - CONTACTED → `bg-yellow-100 text-yellow-700`
  - QUALIFIED → `bg-purple-100 text-purple-700`
  - CONVERTED → `bg-green-100 text-green-700`
  - LOST → `bg-red-100 text-red-600`

### 7c. `<SlideOver open={bool} onClose={fn} title={string}>` 
- Right-side panel, 480px wide on desktop, full screen on mobile
- Dark overlay behind it
- Header with title + X close button
- Scrollable body
- Sticky footer for action buttons

### 7d. `<DataTable columns={} data={} />` 
- Reusable table with: checkbox column, sortable headers (clicking header sorts asc/desc), hover highlight on rows, sticky header, horizontal scroll on overflow

### 7e. `<StatsCard icon={} value={} label={} color={} />`
- Reusable stats card as described in modules above

### 7f. `<SearchInput placeholder={} onChange={} />`
- Input with magnifier icon inside left side, clear (X) button appears when text entered

### 7g. `<CategoryPills categories={[]} active={} onChange={} />`
- Horizontal scrollable pill group with active state

---

## 8. API IMPLEMENTATION NOTES

- All API routes use Prisma Client (`src/lib/prisma/index.ts`)
- Auth check: every API route must verify session with `getServerSession(authOptions)` and return 401 if not authenticated
- Error format: `{ error: "message" }` with appropriate HTTP status
- Success list format: `{ data: [...], total: N, page: N, limit: N }`
- Success single format: `{ data: {...} }`
- For `GET /api/tasks/stats`:
  ```json
  {
    "total": 28,
    "pending": 8,
    "inProgress": 6,
    "sentForReview": 2,
    "requestChanges": 1,
    "overdue": 3,
    "completed": 7,
    "cancelled": 1
  }
  ```
- Auto-increment task number: use a transaction — fetch Counter "task", increment, save, use as taskNumber
- Overdue detection: any task where `dueDate < now()` and status is not COMPLETED or CANCELLED should show as OVERDUE (can be a computed field or a background update)

---

## 9. SEED DATA (`prisma/seed.ts`)

Run with `npx prisma db seed`

1. Create 4 staff users:
   - admin@prabandh.in / password123 / ADMIN / "Admin Partner"
   - senior@prabandh.in / password123 / SENIOR_STAFF / "Senior Accountant"  
   - junior@prabandh.in / password123 / JUNIOR_STAFF / "Junior Clerk"
   - billing@prabandh.in / password123 / BILLING / "Billing Executive"

2. Create all services listed in Section 3g above

3. Create 5 sample clients (business names, codes, entity types as shown in screenshots)

4. Create 1 sample ClientGroup named "Premium Clients"

5. Create 25+ sample tasks across all categories and statuses to match the screenshot data

6. Create 3 sample leads (1 NEW, 1 CONVERTED, 1 LOST) to match screenshot data

7. Initialise Counter records:
   - `{ id: "task", value: 874 }` (so next task = TSK00875)
   - `{ id: "client_PLC", value: 2 }`
   - `{ id: "client_PVT", value: 2 }`
   - `{ id: "client_PAR", value: 0 }`

---

## 10. MIGRATION STEPS

After all schema changes:
```bash
npx prisma db push       # apply schema to SQLite
npx prisma generate      # regenerate client
npx prisma db seed       # run seed
```

---

## 11. FILE STRUCTURE (files to create / modify)

```
src/
  app/
    (dashboard)/
      services/
        page.tsx              ← NEW: Services list page
      tasks/
        page.tsx              ← MODIFY: redirect to /tasks/list
        list/
          page.tsx            ← NEW: main task list (replaces tracker)
        summary/
          page.tsx            ← NEW: task summary analytics
        templates/
          page.tsx            ← MODIFY: enhance existing
        calendar/
          page.tsx            ← keep existing
      leads/
        page.tsx              ← REWRITE: full table view
      clients/
        page.tsx              ← REWRITE: table view
        [id]/
          page.tsx            ← NEW: client detail page
      layout.tsx              ← MODIFY: update sidebar links
    api/
      services/
        route.ts              ← NEW
        [id]/
          route.ts            ← NEW
          sops/
            route.ts          ← NEW
            [sopId]/
              route.ts        ← NEW
      tasks/
        route.ts              ← NEW
        stats/
          route.ts            ← NEW
        [id]/
          route.ts            ← NEW
      leads/
        route.ts              ← NEW
        [id]/
          route.ts            ← NEW
          convert/
            route.ts          ← NEW
      clients/
        route.ts              ← NEW
        [id]/
          route.ts            ← NEW
  components/
    ui/
      avatar.tsx              ← NEW
      status-badge.tsx        ← NEW
      slide-over.tsx          ← NEW
      data-table.tsx          ← NEW
      stats-card.tsx          ← NEW
      search-input.tsx        ← NEW
      category-pills.tsx      ← NEW
      modal.tsx               ← NEW
prisma/
  schema.prisma               ← MODIFY (as per Section 1)
  seed.ts                     ← NEW
```

---

## 12. PRIORITY BUILD ORDER

1. Schema changes + seed data (foundation for everything)
2. Shared components (Avatar, StatusBadge, SlideOver, StatsCard, SearchInput, CategoryPills, DataTable, Modal)
3. Services page (simplest — no complex relations)
4. Tasks list page (depends on services)
5. Leads page (independent)
6. Clients page + client detail (depends on leads for convert flow)
7. Task detail drawer with SOP checklist
8. Task summary analytics page
