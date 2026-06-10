"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SlideOver } from "@/components/ui/slide-over";
import { Avatar } from "@/components/ui/avatar";
import { SearchInput } from "@/components/ui/search-input";
import {
  Plus, FileText, CheckCircle2, Clock, AlertTriangle, RefreshCw,
  Send, ChevronsRight, MoreVertical, Trash2, Eye
} from "lucide-react";
import toast from "react-hot-toast";

type Invoice = {
  id: string;
  invoiceNumber: string | null;
  status: string;
  issueDate: string;
  dueDate: string | null;
  totalAmount: number;
  taxableAmount: number;
  taxAmount: number;
  discount: number;
  paidAmount: number;
  notes: string | null;
  client: { id: string; companyName: string; legalName: string | null; clientCode: string };
  lineItems: Array<{ id: string; description: string; quantity: number; unitPrice: number; taxRate: number; totalPrice: number; hsnCode: string | null }>;
  payments: Array<{ id: string; amount: number; paymentDate: string; method: string; reference: string | null }>;
  billingEntity: { id: string; name: string } | null;
  createdBy: { id: string; name: string } | null;
};

type Stats = {
  unpaidAmount: number; unpaidCount: number;
  paidAmount:   number; paidCount:   number;
  proformaCount: number; overdueCount: number;
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const statusColors: Record<string, string> = {
  PROFORMA: "bg-blue-100   text-blue-800",
  UNPAID:   "bg-amber-100  text-amber-800",
  PARTIAL:  "bg-orange-100 text-orange-800",
  PAID:     "bg-green-100  text-green-800",
  OVERDUE:  "bg-red-100    text-red-800",
};

const STATUS_FILTERS = ["all", "PROFORMA", "UNPAID", "PARTIAL", "PAID", "OVERDUE"];

const defaultLine = () => ({ description: "", serviceId: "", hsnCode: "", quantity: 1, unitPrice: 0, taxRate: 18 });

export default function InvoicesPage() {
  const router = useRouter();

  const [invoices, setInvoices]       = useState<Invoice[]>([]);
  const [stats,    setStats]          = useState<Stats | null>(null);
  const [loading,  setLoading]        = useState(true);
  const [search,   setSearch]         = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Clients for dropdowns
  const [clients, setClients] = useState<any[]>([]);

  // Create Invoice
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProforma, setIsProforma]     = useState(true);
  const [newInvoice, setNewInvoice]     = useState({
    clientId: "", billingEntityId: "", dueDate: "", issueDate: "", notes: "", discount: 0,
  });
  const [lineItems, setLineItems] = useState([defaultLine()]);

  // Record Payment
  const [paymentTarget, setPaymentTarget] = useState<Invoice | null>(null);
  const [paymentForm,   setPaymentForm]   = useState({ amount: 0, paymentDate: "", method: "BANK_TRANSFER", reference: "" });

  // Detail view
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search) params.set("search", search);
      const res  = await fetch(`/api/billing/invoices?${params}`);
      const json = await res.json();
      if (json.data)  setInvoices(json.data);
      if (json.stats) setStats(json.stats);
    } catch (e) {
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);
  useEffect(() => {
    fetch("/api/clients?limit=500").then(r => r.json()).then(d => setClients(d.data || []));
  }, []);

  /* ─── Line item helpers ─── */
  const updateLine = (i: number, key: string, val: any) =>
    setLineItems(ls => ls.map((l, idx) => idx === i ? { ...l, [key]: val } : l));
  const addLine    = () => setLineItems(ls => [...ls, defaultLine()]);
  const removeLine = (i: number) => setLineItems(ls => ls.filter((_, idx) => idx !== i));

  const lineSubtotal = lineItems.reduce((s, l) => s + (l.unitPrice * l.quantity), 0);
  const lineTax      = lineItems.reduce((s, l) => s + (l.unitPrice * l.quantity * l.taxRate / 100), 0);
  const lineTotal    = lineSubtotal + lineTax - (newInvoice.discount || 0);

  /* ─── Create Invoice ─── */
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvoice.clientId) { toast.error("Please select a client"); return; }
    if (lineItems.some(l => !l.description || l.unitPrice <= 0)) {
      toast.error("All line items need a description and price"); return;
    }
    try {
      const res = await fetch("/api/billing/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newInvoice, isProforma, lineItems }),
      });
      if (!res.ok) throw new Error();
      toast.success(isProforma ? "Proforma created" : "Invoice created");
      setIsCreateOpen(false);
      setNewInvoice({ clientId: "", billingEntityId: "", dueDate: "", issueDate: "", notes: "", discount: 0 });
      setLineItems([defaultLine()]);
      fetchInvoices();
    } catch {
      toast.error("Failed to create invoice");
    }
  };

  /* ─── Convert proforma → real ─── */
  const handleConvert = async (inv: Invoice) => {
    if (!confirm(`Convert ${inv.invoiceNumber} to a real invoice?`)) return;
    try {
      const res = await fetch(`/api/billing/invoices/${inv.id}/convert`, { method: "POST" });
      if (!res.ok) throw new Error();
      toast.success("Converted to real invoice");
      fetchInvoices();
    } catch {
      toast.error("Conversion failed");
    }
  };

  /* ─── Record payment ─── */
  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentTarget) return;
    try {
      const res = await fetch(`/api/billing/invoices/${paymentTarget.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentForm),
      });
      if (!res.ok) throw new Error();
      toast.success("Payment recorded");
      setPaymentTarget(null);
      fetchInvoices();
    } catch {
      toast.error("Failed to record payment");
    }
  };

  /* ─── Delete ─── */
  const handleDelete = async (inv: Invoice) => {
    if (!confirm(`Delete ${inv.invoiceNumber}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/billing/invoices/${inv.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Invoice deleted");
      fetchInvoices();
    } catch {
      toast.error("Delete failed (only ADMIN can delete)");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Invoices</h2>
          <p className="text-muted-foreground text-sm">Proforma &amp; real invoices with payment tracking</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchInvoices} className="p-2 rounded-lg border hover:bg-muted transition-colors">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => { setIsProforma(true); setIsCreateOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
          >
            <Plus className="w-4 h-4" /> Proforma
          </button>
          <button
            onClick={() => { setIsProforma(false); setIsCreateOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1b4d3e] text-white text-sm font-medium hover:bg-[#163d31] transition-colors"
          >
            <Plus className="w-4 h-4" /> New Invoice
          </button>
        </div>
      </div>

      {/* Stats Strip */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-muted-foreground uppercase font-semibold">Unpaid</span>
            </div>
            <div className="text-xl font-bold">{fmt(stats.unpaidAmount)}</div>
            <div className="text-xs text-muted-foreground">{stats.unpaidCount} invoice{stats.unpaidCount !== 1 ? "s" : ""}</div>
          </div>
          <div className="bg-card border rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-xs text-muted-foreground uppercase font-semibold">Overdue</span>
            </div>
            <div className="text-xl font-bold text-red-600">{stats.overdueCount}</div>
            <div className="text-xs text-muted-foreground">past due date</div>
          </div>
          <div className="bg-card border rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-xs text-muted-foreground uppercase font-semibold">Collected</span>
            </div>
            <div className="text-xl font-bold text-green-600">{fmt(stats.paidAmount)}</div>
            <div className="text-xs text-muted-foreground">{stats.paidCount} paid</div>
          </div>
          <div className="bg-card border rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-muted-foreground uppercase font-semibold">Proformas</span>
            </div>
            <div className="text-xl font-bold">{stats.proformaCount}</div>
            <div className="text-xs text-muted-foreground">pending conversion</div>
          </div>
        </div>
      )}

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search invoice# or client..."
          className="max-w-xs"
        />
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                statusFilter === s
                  ? "bg-[#1b4d3e] text-white border-[#1b4d3e]"
                  : "bg-card text-muted-foreground hover:bg-muted border-border"
              }`}
            >
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
              <tr>
                <th className="px-5 py-3 font-medium">Invoice #</th>
                <th className="px-5 py-3 font-medium">Client</th>
                <th className="px-5 py-3 font-medium">Issue Date</th>
                <th className="px-5 py-3 font-medium">Due Date</th>
                <th className="px-5 py-3 font-medium text-right">Amount</th>
                <th className="px-5 py-3 font-medium text-right">Paid</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">Loading…</td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-muted-foreground italic">No invoices found.</td></tr>
              ) : invoices.map(inv => (
                <tr key={inv.id} className="border-t hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3 font-mono font-semibold text-[#1b4d3e] text-xs">
                    {inv.invoiceNumber || "—"}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar name={inv.client.companyName} size="sm" />
                      <div>
                        <div className="font-medium text-sm leading-tight">{inv.client.legalName || inv.client.companyName}</div>
                        <div className="text-[10px] text-muted-foreground">{inv.client.clientCode}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground text-xs">
                    {new Date(inv.issueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-5 py-3 text-xs">
                    {inv.dueDate
                      ? <span className={new Date(inv.dueDate) < new Date() && inv.status === "UNPAID" ? "text-red-600 font-semibold" : "text-muted-foreground"}>
                          {new Date(inv.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                      : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold">{fmt(inv.totalAmount)}</td>
                  <td className="px-5 py-3 text-right text-muted-foreground text-xs">
                    {inv.paidAmount > 0 ? fmt(inv.paidAmount) : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${statusColors[inv.status] || "bg-gray-100 text-gray-800"}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setViewInvoice(inv)}
                        className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground"
                        title="View"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {inv.status === "PROFORMA" && (
                        <button
                          onClick={() => handleConvert(inv)}
                          className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded border border-blue-300 text-blue-700 hover:bg-blue-50 transition-colors"
                          title="Convert to Real Invoice"
                        >
                          <ChevronsRight className="w-3 h-3" /> Convert
                        </button>
                      )}
                      {["UNPAID", "PARTIAL", "OVERDUE"].includes(inv.status) && (
                        <button
                          onClick={() => {
                            setPaymentTarget(inv);
                            setPaymentForm({ amount: inv.totalAmount - inv.paidAmount, paymentDate: new Date().toISOString().substring(0, 10), method: "BANK_TRANSFER", reference: "" });
                          }}
                          className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded border border-green-300 text-green-700 hover:bg-green-50 transition-colors"
                        >
                          <CheckCircle2 className="w-3 h-3" /> Pay
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(inv)}
                        className="p-1.5 rounded hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Create Invoice SlideOver ─── */}
      <SlideOver
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={isProforma ? "New Proforma Invoice" : "New Invoice"}
      >
        <form onSubmit={handleCreate} className="space-y-5">
          {/* Type toggle */}
          <div className="flex gap-2">
            {[true, false].map(p => (
              <button
                key={String(p)}
                type="button"
                onClick={() => setIsProforma(p)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  isProforma === p ? "bg-[#1b4d3e] text-white border-[#1b4d3e]" : "bg-card border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {p ? "Proforma" : "Real Invoice"}
              </button>
            ))}
          </div>

          {/* Client */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Client *</label>
            <select
              required
              value={newInvoice.clientId}
              onChange={e => setNewInvoice(n => ({ ...n, clientId: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-[#1b4d3e] outline-none"
            >
              <option value="">— Select client —</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.legalName || c.companyName} ({c.clientCode})</option>
              ))}
            </select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Issue Date</label>
              <input type="date" value={newInvoice.issueDate} onChange={e => setNewInvoice(n => ({ ...n, issueDate: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-[#1b4d3e] outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Due Date</label>
              <input type="date" value={newInvoice.dueDate} onChange={e => setNewInvoice(n => ({ ...n, dueDate: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-[#1b4d3e] outline-none" />
            </div>
          </div>

          {/* Line items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Line Items</label>
              <button type="button" onClick={addLine} className="text-xs text-[#1b4d3e] font-semibold hover:underline">+ Add line</button>
            </div>
            <div className="space-y-2">
              {lineItems.map((li, i) => (
                <div key={i} className="border rounded-lg p-3 space-y-2 bg-muted/30">
                  <div className="flex gap-2">
                    <input
                      placeholder="Description *"
                      value={li.description}
                      onChange={e => updateLine(i, "description", e.target.value)}
                      className="flex-1 border rounded px-2.5 py-1.5 text-xs bg-background focus:ring-1 focus:ring-[#1b4d3e] outline-none"
                    />
                    {lineItems.length > 1 && (
                      <button type="button" onClick={() => removeLine(i)} className="text-red-400 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground">HSN Code</label>
                      <input placeholder="HSN" value={li.hsnCode} onChange={e => updateLine(i, "hsnCode", e.target.value)}
                        className="w-full border rounded px-2 py-1 text-xs bg-background outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Qty</label>
                      <input type="number" min="1" value={li.quantity} onChange={e => updateLine(i, "quantity", Number(e.target.value))}
                        className="w-full border rounded px-2 py-1 text-xs bg-background outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Unit Price (₹)</label>
                      <input type="number" min="0" value={li.unitPrice} onChange={e => updateLine(i, "unitPrice", Number(e.target.value))}
                        className="w-full border rounded px-2 py-1 text-xs bg-background outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Tax %</label>
                      <select value={li.taxRate} onChange={e => updateLine(i, "taxRate", Number(e.target.value))}
                        className="w-full border rounded px-2 py-1 text-xs bg-background outline-none">
                        {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    Subtotal: {fmt(li.unitPrice * li.quantity)} + GST: {fmt(li.unitPrice * li.quantity * li.taxRate / 100)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Discount + totals */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Discount (₹)</label>
            <input type="number" min="0" value={newInvoice.discount}
              onChange={e => setNewInvoice(n => ({ ...n, discount: Number(e.target.value) }))}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-[#1b4d3e] outline-none" />
          </div>

          <div className="bg-muted/40 rounded-xl p-4 text-sm space-y-1">
            <div className="flex justify-between text-muted-foreground"><span>Taxable Amount</span><span>{fmt(lineSubtotal)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Total GST</span><span>{fmt(lineTax)}</span></div>
            {newInvoice.discount > 0 && (
              <div className="flex justify-between text-muted-foreground"><span>Discount</span><span>- {fmt(newInvoice.discount)}</span></div>
            )}
            <div className="flex justify-between font-bold text-base border-t pt-2 mt-2"><span>Total</span><span>{fmt(lineTotal)}</span></div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes</label>
            <textarea rows={3} value={newInvoice.notes} onChange={e => setNewInvoice(n => ({ ...n, notes: e.target.value }))}
              placeholder="Payment terms, bank details, remarks…"
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-[#1b4d3e] outline-none resize-none" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setIsCreateOpen(false)}
              className="flex-1 py-2.5 rounded-xl border text-sm font-medium hover:bg-muted transition-colors">
              Cancel
            </button>
            <button type="submit"
              className="flex-1 py-2.5 rounded-xl bg-[#1b4d3e] text-white text-sm font-semibold hover:bg-[#163d31] transition-colors">
              {isProforma ? "Create Proforma" : "Create Invoice"}
            </button>
          </div>
        </form>
      </SlideOver>

      {/* ─── Record Payment SlideOver ─── */}
      <SlideOver
        open={!!paymentTarget}
        onClose={() => setPaymentTarget(null)}
        title="Record Payment"
      >
        {paymentTarget && (
          <form onSubmit={handlePayment} className="space-y-5">
            <div className="bg-muted/40 rounded-xl p-4 space-y-1 text-sm">
              <div className="font-semibold">{paymentTarget.invoiceNumber}</div>
              <div className="text-muted-foreground">{paymentTarget.client.legalName || paymentTarget.client.companyName}</div>
              <div className="flex justify-between mt-2">
                <span className="text-muted-foreground">Invoice Total</span>
                <span className="font-semibold">{fmt(paymentTarget.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Already Paid</span>
                <span className="text-green-600 font-semibold">{fmt(paymentTarget.paidAmount)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-medium">Balance Due</span>
                <span className="font-bold text-red-600">{fmt(paymentTarget.totalAmount - paymentTarget.paidAmount)}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Amount Received (₹) *</label>
              <input required type="number" min="1" value={paymentForm.amount}
                onChange={e => setPaymentForm(f => ({ ...f, amount: Number(e.target.value) }))}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-[#1b4d3e] outline-none" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Payment Date *</label>
              <input required type="date" value={paymentForm.paymentDate}
                onChange={e => setPaymentForm(f => ({ ...f, paymentDate: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-[#1b4d3e] outline-none" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Payment Method</label>
              <select value={paymentForm.method} onChange={e => setPaymentForm(f => ({ ...f, method: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-[#1b4d3e] outline-none">
                {["BANK_TRANSFER", "CHEQUE", "CASH", "UPI", "NEFT", "RTGS", "IMPS"].map(m => (
                  <option key={m} value={m}>{m.replace("_", " ")}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Reference / UTR</label>
              <input type="text" value={paymentForm.reference}
                onChange={e => setPaymentForm(f => ({ ...f, reference: e.target.value }))}
                placeholder="Transaction ID, cheque no, etc."
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-[#1b4d3e] outline-none" />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setPaymentTarget(null)}
                className="flex-1 py-2.5 rounded-xl border text-sm font-medium hover:bg-muted transition-colors">
                Cancel
              </button>
              <button type="submit"
                className="flex-1 py-2.5 rounded-xl bg-[#1b4d3e] text-white text-sm font-semibold hover:bg-[#163d31] transition-colors">
                Record Payment
              </button>
            </div>
          </form>
        )}
      </SlideOver>

      {/* ─── Invoice Detail View SlideOver ─── */}
      <SlideOver
        open={!!viewInvoice}
        onClose={() => setViewInvoice(null)}
        title={viewInvoice?.invoiceNumber || "Invoice Detail"}
      >
        {viewInvoice && (
          <div className="space-y-5 text-sm">
            {/* Meta */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Client</div>
                <div className="font-semibold">{viewInvoice.client.legalName || viewInvoice.client.companyName}</div>
                <div className="text-xs text-muted-foreground">{viewInvoice.client.clientCode}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Status</div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColors[viewInvoice.status] || ""}`}>
                  {viewInvoice.status}
                </span>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Issue Date</div>
                <div>{new Date(viewInvoice.issueDate).toLocaleDateString("en-IN")}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Due Date</div>
                <div>{viewInvoice.dueDate ? new Date(viewInvoice.dueDate).toLocaleDateString("en-IN") : "—"}</div>
              </div>
            </div>

            {/* Line items */}
            <div>
              <div className="text-xs text-muted-foreground uppercase font-semibold mb-2">Line Items</div>
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left">Description</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">Rate</th>
                      <th className="px-3 py-2 text-right">GST</th>
                      <th className="px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewInvoice.lineItems.map(li => (
                      <tr key={li.id} className="border-t">
                        <td className="px-3 py-2">{li.description}{li.hsnCode && <span className="text-muted-foreground ml-1">({li.hsnCode})</span>}</td>
                        <td className="px-3 py-2 text-right">{li.quantity}</td>
                        <td className="px-3 py-2 text-right">{fmt(li.unitPrice)}</td>
                        <td className="px-3 py-2 text-right">{li.taxRate}%</td>
                        <td className="px-3 py-2 text-right font-medium">{fmt(li.totalPrice * (1 + li.taxRate / 100))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="bg-muted/40 rounded-xl p-4 space-y-1">
              <div className="flex justify-between text-muted-foreground"><span>Taxable</span><span>{fmt(viewInvoice.taxableAmount)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>GST</span><span>{fmt(viewInvoice.taxAmount)}</span></div>
              {viewInvoice.discount > 0 && <div className="flex justify-between text-muted-foreground"><span>Discount</span><span>- {fmt(viewInvoice.discount)}</span></div>}
              <div className="flex justify-between font-bold text-base border-t pt-2"><span>Total</span><span>{fmt(viewInvoice.totalAmount)}</span></div>
            </div>

            {/* Payments */}
            {viewInvoice.payments.length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground uppercase font-semibold mb-2">Payments Received</div>
                <div className="space-y-2">
                  {viewInvoice.payments.map(p => (
                    <div key={p.id} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{fmt(p.amount)}</div>
                        <div className="text-xs text-muted-foreground">{new Date(p.paymentDate).toLocaleDateString("en-IN")} · {p.method.replace("_", " ")}</div>
                        {p.reference && <div className="text-xs text-muted-foreground">Ref: {p.reference}</div>}
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    </div>
                  ))}
                </div>
                <div className="text-right font-bold mt-2 text-green-600">
                  Paid: {fmt(viewInvoice.paidAmount)} / {fmt(viewInvoice.totalAmount)}
                </div>
              </div>
            )}

            {/* Notes */}
            {viewInvoice.notes && (
              <div>
                <div className="text-xs text-muted-foreground uppercase font-semibold mb-1">Notes</div>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{viewInvoice.notes}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              {viewInvoice.status === "PROFORMA" && (
                <button onClick={() => { handleConvert(viewInvoice); setViewInvoice(null); }}
                  className="flex-1 py-2 rounded-xl border border-blue-300 text-blue-700 text-sm font-medium hover:bg-blue-50 transition-colors">
                  Convert to Invoice
                </button>
              )}
              {["UNPAID", "PARTIAL", "OVERDUE"].includes(viewInvoice.status) && (
                <button onClick={() => {
                  setPaymentTarget(viewInvoice);
                  setPaymentForm({ amount: viewInvoice.totalAmount - viewInvoice.paidAmount, paymentDate: new Date().toISOString().substring(0, 10), method: "BANK_TRANSFER", reference: "" });
                  setViewInvoice(null);
                }}
                  className="flex-1 py-2 rounded-xl bg-[#1b4d3e] text-white text-sm font-semibold hover:bg-[#163d31] transition-colors">
                  Record Payment
                </button>
              )}
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  );
}
