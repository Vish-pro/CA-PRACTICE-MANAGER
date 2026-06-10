"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import { Phone, Mail, Building2, MapPin, Hash, Users, Activity, Plus, Trash2, CheckCircle2, Clock, AlertTriangle, ChevronsRight, Eye } from "lucide-react";
import { SlideOver } from "@/components/ui/slide-over";

export default function ClientDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Overview");

  // Services State
  const [clientServices, setClientServices] = useState<any[]>([]);
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [isAssignSlideOpen, setIsAssignSlideOpen] = useState(false);
  const [assigningService, setAssigningService] = useState({ serviceId: "", customPrice: "" });
  const [servicesLoading, setServicesLoading] = useState(false);

  // Edit Client State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [staff, setStaff] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);

  // Invoice State
  const [clientInvoices, setClientInvoices] = useState<any[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<any | null>(null);
  const [paymentForm, setPaymentForm] = useState({ amount: 0, paymentDate: "", method: "BANK_TRANSFER", reference: "" });
  const [viewInvoice, setViewInvoice] = useState<any | null>(null);

  const tabs = [
    "Overview", "Tasks", "Services", "Documents", "DSC", "Licenses", "Passwords", "Invoices", "Notes"
  ];

  const fetchClient = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/clients/${id}`);
      const json = await res.json();
      if (json.data) {
        setClient(json.data);
      }
    } catch (error) {
      console.error("Failed to fetch client", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientServices = async () => {
    setServicesLoading(true);
    try {
      const res = await fetch(`/api/clients/${id}/services`);
      const json = await res.json();
      if (json.data) setClientServices(json.data);
    } catch (error) {
      console.error("Failed to fetch client services", error);
    } finally {
      setServicesLoading(false);
    }
  };

  const fetchAllServices = async () => {
    try {
      const res = await fetch('/api/services');
      const json = await res.json();
      if (json.data) setAvailableServices(json.data);
    } catch (error) {
      console.error("Failed to fetch all services", error);
    }
  };

  useEffect(() => {
    fetchClient();
    fetch('/api/users').then(r => r.json()).then(d => setStaff(d.data || []));
    fetch('/api/groups').then(r => r.json()).then(d => setGroups(d.data || []));
  }, [id]);

  const handleEditClient = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const data = new FormData(form);
    const labels = (data.get("labels") as string || "").trim();

    await fetch(`/api/clients/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyName: data.get("companyName"),
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
    setIsEditOpen(false);
    fetchClient();
  };

  useEffect(() => {
    if (activeTab === "Services") {
      fetchClientServices();
      fetchAllServices();
    }
    if (activeTab === "Invoices") {
      fetchClientInvoices();
    }
  }, [activeTab, id]);

  const fetchClientInvoices = async () => {
    setInvoicesLoading(true);
    try {
      const res  = await fetch(`/api/billing/invoices?clientId=${id}&limit=100`);
      const json = await res.json();
      if (json.data) setClientInvoices(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setInvoicesLoading(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentTarget) return;
    try {
      const res = await fetch(`/api/billing/invoices/${paymentTarget.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentForm),
      });
      if (!res.ok) throw new Error();
      setPaymentTarget(null);
      fetchClientInvoices();
    } catch { console.error("Payment failed"); }
  };

  const handleConvertInvoice = async (inv: any) => {
    if (!confirm(`Convert ${inv.invoiceNumber} to real invoice?`)) return;
    const res = await fetch(`/api/billing/invoices/${inv.id}/convert`, { method: "POST" });
    if (res.ok) fetchClientInvoices();
  };

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

  const invStatusColors: Record<string, string> = {
    PROFORMA: "bg-blue-100 text-blue-800",
    UNPAID:   "bg-amber-100 text-amber-800",
    PARTIAL:  "bg-orange-100 text-orange-800",
    PAID:     "bg-green-100 text-green-800",
    OVERDUE:  "bg-red-100 text-red-800",
  };

  const handleAssignService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/clients/${id}/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assigningService)
      });
      if (res.ok) {
        setIsAssignSlideOpen(false);
        setAssigningService({ serviceId: "", customPrice: "" });
        fetchClientServices();
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Failed to assign service");
      }
    } catch (error) {
      console.error("Failed to assign service", error);
    }
  };

  const handleDetachService = async (serviceId: string) => {
    if (!confirm("Are you sure you want to remove this service from the client?")) return;
    try {
      await fetch(`/api/clients/${id}/services?serviceId=${serviceId}`, { method: "DELETE" });
      fetchClientServices();
    } catch (error) {
      console.error("Failed to detach service", error);
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading client details...</div>;
  if (!client) return <div className="p-8 text-center text-red-500">Client not found.</div>;

  const labelsList = client.labels ? client.labels.split(',').map((l: string) => l.trim()) : [];

  const taskColumns: ColumnDef<any>[] = [
    {
      header: "ID",
      cell: (row) => <span className="font-mono text-xs">#TSK{String(row.taskNumber || 0).padStart(5, '0')}</span>
    },
    { header: "Title", accessorKey: "title" },
    { header: "Service", cell: (row) => row.service?.name || "-" },
    { header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
  ];

  const serviceColumns: ColumnDef<any>[] = [
    { header: "Service Name", cell: (row) => <span className="font-medium">{row.service?.name}</span> },
    { header: "Category", cell: (row) => row.service?.category },
    { header: "Frequency", cell: (row) => row.service?.frequency },
    { header: "Professional Fee", cell: (row) => `₹${row.service?.professionalFee.toLocaleString()}` },
    { header: "Custom Price", cell: (row) => row.customPrice ? `₹${row.customPrice.toLocaleString()}` : "Standard" },
    {
      header: "Action",
      cell: (row) => (
        <button
          onClick={() => handleDetachService(row.serviceId)}
          className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
          title="Remove Service"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )
    }
  ];

  return (
    <div className="flex flex-col md:flex-row gap-6 h-full pb-8">
      {/* Left Sidebar Info */}
      <div className="w-full md:w-[280px] shrink-0 space-y-6">
        <div className="bg-card border rounded-xl p-6 text-center shadow-sm">
          <Avatar name={client.companyName} size="lg" className="mx-auto mb-4 w-20 h-20 text-2xl" />
          <h1 className="text-xl font-bold leading-tight mb-1">{client.companyName}</h1>
          <div className="text-sm font-mono text-muted-foreground mb-3">{client.clientCode}</div>
          <div className="inline-block px-3 py-1 bg-muted rounded-full text-xs font-medium">
            {client.businessEntity || "Unknown Entity"}
          </div>
        </div>

        <div className="bg-card border rounded-xl shadow-sm divide-y">
          <div className="p-4 space-y-3 text-sm">
            <h3 className="font-semibold text-muted-foreground uppercase text-xs tracking-wider">Contact Info</h3>
            {client.contactName && (
              <div className="flex items-center gap-2">
                <Avatar name={client.contactName} size="sm" className="w-5 h-5 text-[10px]" />
                <span className="font-medium">{client.contactName}</span>
              </div>
            )}
            {client.contactEmail && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span>{client.contactEmail}</span>
              </div>
            )}
            {client.mobile && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-4 h-4" />
                <span>{client.mobile}</span>
              </div>
            )}
          </div>

          <div className="p-4 space-y-3 text-sm">
            <h3 className="font-semibold text-muted-foreground uppercase text-xs tracking-wider">Tax IDs</h3>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1"><Hash className="w-3.5 h-3.5" /> GST</span>
              <span className="font-medium">{client.gstNumber || "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> PAN</span>
              <span className="font-medium">{client.panNumber || "-"}</span>
            </div>
          </div>

          <div className="p-4 space-y-2 text-sm">
            <h3 className="font-semibold text-muted-foreground uppercase text-xs tracking-wider flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> Address
            </h3>
            <p className="text-muted-foreground">{client.address || "No address provided."}</p>
          </div>

          <div className="p-4 space-y-3 text-sm">
            <h3 className="font-semibold text-muted-foreground uppercase text-xs tracking-wider">Team & Group</h3>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Employee</span>
              {client.user ? <div className="flex items-center gap-1"><Avatar name={client.user.name} size="sm" className="w-5 h-5 text-[10px]" /> <span className="font-medium">{client.user.name}</span></div> : "-"}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Auditor</span>
              {client.auditor ? <div className="flex items-center gap-1"><Avatar name={client.auditor.name} size="sm" className="w-5 h-5 text-[10px]" /> <span className="font-medium">{client.auditor.name}</span></div> : "-"}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Group</span>
              <span className="font-medium">{client.group?.name || "-"}</span>
            </div>
          </div>

          {labelsList.length > 0 && (
            <div className="p-4 space-y-2 text-sm">
              <h3 className="font-semibold text-muted-foreground uppercase text-xs tracking-wider">Labels</h3>
              <div className="flex flex-wrap gap-1.5">
                {labelsList.map((label: string, i: number) => (
                  <span key={i} className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => setIsEditOpen(true)}
          className="w-full py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
        >
          Edit Client
        </button>
      </div>

      {/* Right Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tabs */}
        <div className="flex overflow-x-auto border-b border-border scrollbar-hide mb-6 bg-card sticky top-0 z-10 px-2 rounded-t-xl">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-4 text-sm font-medium whitespace-nowrap transition-all border-b-2",
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "Overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-card border rounded-xl p-5 shadow-sm">
                  <h3 className="font-semibold mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-primary" /> Recent Tasks</h3>
                  {client.tasks?.length > 0 ? (
                    <DataTable columns={taskColumns} data={client.tasks} keyExtractor={(r) => r.id} />
                  ) : (
                    <p className="text-sm text-muted-foreground italic text-center py-4">No recent tasks.</p>
                  )}
                </div>
                <div className="bg-card border rounded-xl p-5 shadow-sm">
                  <h3 className="font-semibold mb-4">Recent Invoices</h3>
                  {client.invoices?.length > 0 ? (
                    <div className="space-y-2">
                      {client.invoices.map((inv: any) => (
                        <div key={inv.id} className="flex justify-between items-center p-3 border rounded-lg text-sm hover:bg-muted transition-colors cursor-pointer">
                          <span className="font-mono text-muted-foreground">INV-{inv.id.substring(0,6)}</span>
                          <StatusBadge status={inv.status} />
                          <span className="font-bold">₹{inv.totalAmount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic text-center py-4">No recent invoices.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "Tasks" && (
            <div className="bg-card border rounded-xl p-5 shadow-sm min-h-[400px]">
              <h3 className="font-semibold mb-4">All Tasks</h3>
              <p className="text-sm text-muted-foreground italic">Filtering full tasks table to this client ID...</p>
              {/* Note: In full app, we would mount the full Tasks list component here filtered by client */}
              {client.tasks?.length > 0 && (
                <DataTable columns={taskColumns} data={client.tasks} keyExtractor={(r) => r.id} className="mt-4" />
              )}
            </div>
          )}

          {activeTab === "Services" && (
            <div className="bg-card border rounded-xl p-5 shadow-sm min-h-[400px]">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-semibold text-lg">Assigned Services</h3>
                  <p className="text-sm text-muted-foreground">Manage the services provided to this client.</p>
                </div>
                <button
                  onClick={() => setIsAssignSlideOpen(true)}
                  className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Assign Service
                </button>
              </div>

              {servicesLoading ? (
                <div className="p-8 text-center text-muted-foreground">Loading services...</div>
              ) : clientServices.length > 0 ? (
                <DataTable columns={serviceColumns} data={clientServices} keyExtractor={(r) => r.id} />
              ) : (
                <div className="p-12 text-center border-2 border-dashed rounded-xl bg-muted/20">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                    <Activity className="w-6 h-6 text-primary" />
                  </div>
                  <h4 className="text-lg font-semibold mb-2">No services assigned</h4>
                  <p className="text-muted-foreground max-w-sm mx-auto mb-6">
                    This client does not have any active services. Assign a service to start tracking tasks and billing.
                  </p>
                  <button
                    onClick={() => setIsAssignSlideOpen(true)}
                    className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Assign Service
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "Invoices" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Invoices for {client.legalName || client.companyName}</h3>
                <a href="/billing/invoices" className="text-xs text-[#1b4d3e] font-semibold hover:underline">
                  Create Invoice →
                </a>
              </div>
              {invoicesLoading ? (
                <div className="py-12 text-center text-muted-foreground text-sm">Loading invoices…</div>
              ) : clientInvoices.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="text-muted-foreground italic text-sm">No invoices for this client yet.</div>
                  <a href="/billing/invoices" className="mt-2 inline-block text-xs text-[#1b4d3e] font-semibold hover:underline">
                    Go to Invoices →
                  </a>
                </div>
              ) : (
                <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
                      <tr>
                        <th className="px-4 py-3 text-left">Invoice #</th>
                        <th className="px-4 py-3 text-left">Date</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                        <th className="px-4 py-3 text-right">Paid</th>
                        <th className="px-4 py-3 text-left">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientInvoices.map((inv: any) => (
                        <tr key={inv.id} className="border-t hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 font-mono font-semibold text-[#1b4d3e] text-xs">{inv.invoiceNumber || "—"}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {new Date(inv.issueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold">{fmtCurrency(inv.totalAmount)}</td>
                          <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                            {inv.paidAmount > 0 ? fmtCurrency(inv.paidAmount) : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${invStatusColors[inv.status] || "bg-gray-100 text-gray-800"}`}>
                              {inv.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => setViewInvoice(inv)} className="p-1.5 rounded hover:bg-muted text-muted-foreground" title="View">
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              {inv.status === "PROFORMA" && (
                                <button onClick={() => handleConvertInvoice(inv)}
                                  className="px-2 py-1 text-[10px] font-medium rounded border border-blue-300 text-blue-700 hover:bg-blue-50">
                                  Convert
                                </button>
                              )}
                              {["UNPAID", "PARTIAL", "OVERDUE"].includes(inv.status) && (
                                <button onClick={() => {
                                  setPaymentTarget(inv);
                                  setPaymentForm({ amount: inv.totalAmount - inv.paidAmount, paymentDate: new Date().toISOString().substring(0, 10), method: "BANK_TRANSFER", reference: "" });
                                }}
                                  className="px-2 py-1 text-[10px] font-medium rounded border border-green-300 text-green-700 hover:bg-green-50">
                                  Pay
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {["Documents", "DSC", "Licenses", "Passwords", "Notes"].includes(activeTab) && (
            <div className="bg-card border rounded-xl p-8 shadow-sm min-h-[400px] flex items-center justify-center">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{activeTab}</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">This module is currently being built or will show data for {client.companyName}.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Assign Service SlideOver */}
      <SlideOver
        open={isAssignSlideOpen}
        onClose={() => setIsAssignSlideOpen(false)}
        title="Assign Service to Client"
      >
        <div className="mb-6 text-sm text-muted-foreground">Select a service and set an optional custom price for this client.</div>
        <form onSubmit={handleAssignService} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Select Service</label>
            <select
              value={assigningService.serviceId}
              onChange={(e) => setAssigningService({ ...assigningService, serviceId: e.target.value })}
              className="w-full p-2.5 bg-background border border-input rounded-md text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              required
            >
              <option value="">-- Select a service --</option>
              {availableServices.filter(s => !clientServices.some(cs => cs.serviceId === s.id)).map(service => (
                <option key={service.id} value={service.id}>
                  {service.name} ({service.category}) - ₹{service.professionalFee.toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Custom Price (₹) <span className="text-muted-foreground font-normal">(Optional)</span></label>
            <input
              type="number"
              value={assigningService.customPrice}
              onChange={(e) => setAssigningService({ ...assigningService, customPrice: e.target.value })}
              className="w-full p-2.5 bg-background border border-input rounded-md text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              placeholder="Leave blank to use standard fee"
              min="0"
            />
            <p className="text-xs text-muted-foreground">Overrides the default professional fee for this client.</p>
          </div>

          <div className="pt-4 border-t flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsAssignSlideOpen(false)}
              className="px-4 py-2 text-sm font-medium border border-input bg-background rounded-md hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!assigningService.serviceId}
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              Assign Service
            </button>
          </div>
        </form>
      </SlideOver>
      <SlideOver open={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Client">
        {client && (
          <form id="edit-client-form" onSubmit={handleEditClient} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Business Name <span className="text-red-500">*</span></label>
              <input name="companyName" defaultValue={client.companyName} required className="w-full p-2 border rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Legal Name</label>
              <input name="legalName" defaultValue={client.legalName || ""} className="w-full p-2 border rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Business Entity <span className="text-red-500">*</span></label>
              <select name="businessEntity" defaultValue={client.businessEntity || ""} required className="w-full p-2 border rounded-md text-sm">
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
                <input name="contactName" defaultValue={client.contactName || ""} className="w-full p-2 border rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mobile</label>
                <input type="tel" name="mobile" defaultValue={client.mobile || ""} className="w-full p-2 border rounded-md text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contact Email</label>
              <input type="email" name="contactEmail" defaultValue={client.contactEmail || ""} className="w-full p-2 border rounded-md text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">GST Number</label>
                <input
                  name="gstNumber"
                  defaultValue={client.gstNumber || ""}
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                  pattern="^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$"
                  title="Enter valid GST number (e.g. 22AAAAA0000A1Z5)"
                  className="w-full p-2 border rounded-md text-sm uppercase"
                  onChange={(e) => { e.target.value = e.target.value.toUpperCase(); }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">PAN Number</label>
                <input
                  name="panNumber"
                  defaultValue={client.panNumber || ""}
                  placeholder="AAAAA9999A"
                  maxLength={10}
                  pattern="^[A-Z]{5}[0-9]{4}[A-Z]{1}$"
                  title="Enter valid PAN number (e.g. ABCDE1234F)"
                  className="w-full p-2 border rounded-md text-sm uppercase"
                  onChange={(e) => { e.target.value = e.target.value.toUpperCase(); }}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Address</label>
              <textarea name="address" defaultValue={client.address || ""} rows={2} className="w-full p-2 border rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Auditor</label>
              <select name="auditorId" defaultValue={client.auditorId || ""} className="w-full p-2 border rounded-md text-sm">
                <option value="">Select...</option>
                {staff.filter(u => u.role === 'ADMIN' || u.role === 'SENIOR_STAFF').map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Group</label>
              <select name="groupId" defaultValue={client.groupId || ""} className="w-full p-2 border rounded-md text-sm">
                <option value="">None</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Labels <span className="text-xs text-muted-foreground">(comma-separated)</span></label>
              <input name="labels" defaultValue={client.labels || ""} placeholder="VIP, Tech, Priority" className="w-full p-2 border rounded-md text-sm" />
            </div>
          </form>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={() => setIsEditOpen(false)} className="px-4 py-2 border rounded-md text-sm font-medium">Cancel</button>
          <button form="edit-client-form" type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium">Save Changes</button>
        </div>
      </SlideOver>

      {/* Record Payment SlideOver */}
      <SlideOver open={!!paymentTarget} onClose={() => setPaymentTarget(null)} title="Record Payment">
        {paymentTarget && (
          <form onSubmit={handleRecordPayment} className="space-y-5">
            <div className="bg-muted/40 rounded-xl p-4 space-y-1 text-sm">
              <div className="font-semibold">{paymentTarget.invoiceNumber}</div>
              <div className="flex justify-between mt-2">
                <span className="text-muted-foreground">Invoice Total</span>
                <span className="font-semibold">{fmtCurrency(paymentTarget.totalAmount)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-medium">Balance Due</span>
                <span className="font-bold text-red-600">{fmtCurrency(paymentTarget.totalAmount - paymentTarget.paidAmount)}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Amount (₹) *</label>
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
              <label className="text-sm font-medium">Method</label>
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
                className="flex-1 py-2.5 rounded-xl border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
              <button type="submit"
                className="flex-1 py-2.5 rounded-xl bg-[#1b4d3e] text-white text-sm font-semibold hover:bg-[#163d31] transition-colors">Record Payment</button>
            </div>
          </form>
        )}
      </SlideOver>

      {/* Invoice Detail SlideOver */}
      <SlideOver open={!!viewInvoice} onClose={() => setViewInvoice(null)} title={viewInvoice?.invoiceNumber || "Invoice Detail"}>
        {viewInvoice && (
          <div className="space-y-5 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Status</div>
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${invStatusColors[viewInvoice.status] || ""}`}>{viewInvoice.status}</span>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Issue Date</div>
                <div>{new Date(viewInvoice.issueDate).toLocaleDateString("en-IN")}</div>
              </div>
            </div>
            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left">Description</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Rate</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {viewInvoice.lineItems?.map((li: any) => (
                    <tr key={li.id} className="border-t">
                      <td className="px-3 py-2">{li.description}</td>
                      <td className="px-3 py-2 text-right">{li.quantity}</td>
                      <td className="px-3 py-2 text-right">{fmtCurrency(li.unitPrice)}</td>
                      <td className="px-3 py-2 text-right font-medium">{fmtCurrency(li.totalPrice * (1 + li.taxRate / 100))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-muted/40 rounded-xl p-4 space-y-1">
              <div className="flex justify-between text-muted-foreground"><span>Taxable</span><span>{fmtCurrency(viewInvoice.taxableAmount)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>GST</span><span>{fmtCurrency(viewInvoice.taxAmount)}</span></div>
              <div className="flex justify-between font-bold text-base border-t pt-2"><span>Total</span><span>{fmtCurrency(viewInvoice.totalAmount)}</span></div>
            </div>
            {viewInvoice.payments?.length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground uppercase font-semibold mb-2">Payments</div>
                {viewInvoice.payments.map((p: any) => (
                  <div key={p.id} className="flex justify-between p-3 border rounded-lg mb-2 text-xs">
                    <div><div className="font-medium">{fmtCurrency(p.amount)}</div><div className="text-muted-foreground">{new Date(p.paymentDate).toLocaleDateString("en-IN")} · {p.method}</div></div>
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  </div>
                ))}
              </div>
            )}
            {viewInvoice.notes && <p className="text-xs text-muted-foreground whitespace-pre-line">{viewInvoice.notes}</p>}
          </div>
        )}
      </SlideOver>
    </div>
  );
}
