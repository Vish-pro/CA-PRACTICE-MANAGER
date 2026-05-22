"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import { Phone, Mail, Building2, MapPin, Hash, Users, Activity } from "lucide-react";

export default function ClientDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Overview");

  const tabs = [
    "Overview", "Tasks", "Services", "Documents", "DSC", "Licenses", "Passwords", "Invoices", "Notes"
  ];

  useEffect(() => {
    fetchClient();
  }, [id]);

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

        <button className="w-full py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm">
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

          {["Services", "Documents", "DSC", "Licenses", "Passwords", "Invoices", "Notes"].includes(activeTab) && (
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
    </div>
  );
}
