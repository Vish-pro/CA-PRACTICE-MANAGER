"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Inbox, Upload, Search, Filter, FileText, ArrowDownLeft, ArrowUpRight,
  CheckCircle, Trash2, Download, RotateCcw, Eye
} from "lucide-react";
import { SlideOver } from "@/components/ui/slide-over";
import { Avatar } from "@/components/ui/avatar";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

interface InboxDocument {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize?: number | null;
  direction: "INWARD" | "OUTWARD";
  status: "PENDING_REVIEW" | "REVIEWED" | "RETURNED";
  category?: string | null;
  notes?: string | null;
  createdAt: string;
  client?: { id: string; companyName: string; legalName?: string | null; clientCode?: string | null };
  uploadedBy?: { id: string; name: string } | null;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING_REVIEW: "Pending Review",
  REVIEWED: "Reviewed",
  RETURNED: "Returned",
};

function formatSize(bytes?: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentInboxPage() {
  const [documents, setDocuments] = useState<InboxDocument[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [directionFilter, setDirectionFilter] = useState("");

  // Upload drawer
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL("/api/documents", window.location.origin);
      if (search) url.searchParams.append("search", search);
      if (statusFilter) url.searchParams.append("status", statusFilter);
      if (directionFilter) url.searchParams.append("direction", directionFilter);
      const res = await fetch(url.toString());
      const json = await res.json();
      if (json.data) {
        setDocuments(json.data);
        setStats(json.stats || {});
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, directionFilter]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  useEffect(() => {
    fetch("/api/clients?limit=500")
      .then(r => r.json())
      .then(d => setClients(d.data || []));
  }, []);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) {
      toast.error("Please choose a file to upload");
      return;
    }
    setUploading(true);
    try {
      const res = await fetch("/api/documents", { method: "POST", body: formData });
      if (res.ok) {
        toast.success("Document added to inbox");
        setIsUploadOpen(false);
        form.reset();
        fetchDocuments();
      } else {
        const json = await res.json().catch(() => ({}));
        toast.error(json.error || "Upload failed");
      }
    } finally {
      setUploading(false);
    }
  };

  const updateDocument = async (id: string, data: Record<string, string>) => {
    const res = await fetch(`/api/documents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) fetchDocuments();
    return res.ok;
  };

  const handleDelete = async (doc: InboxDocument) => {
    if (!confirm(`Delete "${doc.fileName}"? The stored file will also be removed.`)) return;
    const res = await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Document deleted");
      fetchDocuments();
    } else {
      toast.error("Failed to delete document");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-primary">Document Inbox</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Inward / outward register for client documents — receive, review, and return with a full trail.
          </p>
        </div>
        <button
          onClick={() => setIsUploadOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#1b4d3e] text-white hover:bg-emerald-950 rounded-lg text-xs font-bold transition-all uppercase w-fit"
        >
          <Upload className="w-4 h-4" />
          Add Document
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Documents</span>
            <h3 className="text-2xl font-bold tracking-tight mt-1">{stats.total ?? 0}</h3>
          </div>
          <div className="p-3 bg-[#1b4d3e]/5 text-[#1b4d3e] rounded-lg"><Inbox className="w-5 h-5" /></div>
        </div>
        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Pending Review</span>
            <h3 className="text-2xl font-bold tracking-tight mt-1 text-amber-600">{stats.pendingReview ?? 0}</h3>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg"><Eye className="w-5 h-5" /></div>
        </div>
        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Inward</span>
            <h3 className="text-2xl font-bold tracking-tight mt-1">{stats.inward ?? 0}</h3>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><ArrowDownLeft className="w-5 h-5" /></div>
        </div>
        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Outward</span>
            <h3 className="text-2xl font-bold tracking-tight mt-1">{stats.outward ?? 0}</h3>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg"><ArrowUpRight className="w-5 h-5" /></div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 bg-muted/40 p-4 rounded-xl border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by file name, category, notes or client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-xs bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={directionFilter}
            onChange={(e) => setDirectionFilter(e.target.value)}
            className="bg-background text-foreground border rounded px-3 py-1.5 text-xs font-bold focus:outline-none cursor-pointer uppercase"
          >
            <option value="">All Directions</option>
            <option value="INWARD">Inward</option>
            <option value="OUTWARD">Outward</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-background text-foreground border rounded px-3 py-1.5 text-xs font-bold focus:outline-none cursor-pointer uppercase"
          >
            <option value="">All Statuses</option>
            <option value="PENDING_REVIEW">Pending Review</option>
            <option value="REVIEWED">Reviewed</option>
            <option value="RETURNED">Returned</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-muted/60 uppercase text-muted-foreground font-bold border-b">
              <tr>
                <th className="px-4 py-3.5">Document</th>
                <th className="px-4 py-3.5">Client</th>
                <th className="px-4 py-3.5">Direction</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Size</th>
                <th className="px-4 py-3.5">Received / Sent</th>
                <th className="px-4 py-3.5">Logged By</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {documents.map(doc => (
                <tr key={doc.id} className="hover:bg-muted/10 transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-muted rounded-lg shrink-0"><FileText className="w-4 h-4 text-[#1b4d3e]" /></div>
                      <div className="min-w-0">
                        <div className="font-bold text-foreground truncate max-w-[220px]" title={doc.fileName}>{doc.fileName}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {doc.category || "Uncategorised"}
                          {doc.notes ? <span className="italic"> — {doc.notes}</span> : null}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {doc.client ? (
                      <div className="flex items-center gap-2">
                        <Avatar name={doc.client.companyName} size="sm" />
                        <div>
                          <div className="font-semibold">{doc.client.legalName || doc.client.companyName}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{doc.client.clientCode}</div>
                        </div>
                      </div>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-4">
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border",
                      doc.direction === "INWARD"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-purple-50 text-purple-700 border-purple-200"
                    )}>
                      {doc.direction === "INWARD" ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                      {doc.direction}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border",
                      doc.status === "PENDING_REVIEW" && "bg-amber-100 text-amber-800 border-amber-200",
                      doc.status === "REVIEWED" && "bg-green-100 text-green-800 border-green-200",
                      doc.status === "RETURNED" && "bg-slate-100 text-slate-700 border-slate-200"
                    )}>
                      {STATUS_LABEL[doc.status] || doc.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-mono text-muted-foreground">{formatSize(doc.fileSize)}</td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {new Date(doc.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">{doc.uploadedBy?.name || "—"}</td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <a
                        href={doc.fileUrl}
                        download={doc.fileName}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                      {doc.status === "PENDING_REVIEW" && (
                        <button
                          onClick={async () => {
                            const ok = await updateDocument(doc.id, { status: "REVIEWED" });
                            if (ok) toast.success("Marked as reviewed");
                          }}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Mark Reviewed"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      {doc.status === "REVIEWED" && doc.direction === "INWARD" && (
                        <button
                          onClick={async () => {
                            const ok = await updateDocument(doc.id, { status: "RETURNED", direction: "OUTWARD" });
                            if (ok) toast.success("Marked as returned to client");
                          }}
                          className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                          title="Mark Returned to Client"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(doc)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!loading && documents.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-12 text-center">
                    <Inbox className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                    <div className="text-sm font-semibold text-foreground">No documents found</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Use &ldquo;Add Document&rdquo; to log incoming or outgoing client documents.
                    </div>
                  </td>
                </tr>
              )}
              {loading && documents.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-muted-foreground text-sm">Loading documents…</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload SlideOver */}
      <SlideOver open={isUploadOpen} onClose={() => setIsUploadOpen(false)} title="Add Document to Inbox">
        <form onSubmit={handleUpload} className="space-y-4 pt-2">
          <div>
            <label className="block text-sm font-medium mb-1">File <span className="text-red-500">*</span></label>
            <input
              type="file"
              name="file"
              required
              className="w-full p-2 border rounded-md text-sm file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:bg-[#1b4d3e] file:text-white file:text-xs file:font-semibold cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Client <span className="text-red-500">*</span></label>
            <select name="clientId" required className="w-full p-2 border rounded-md text-sm">
              <option value="">Select client...</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.legalName || c.companyName} ({c.clientCode})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Direction</label>
              <select name="direction" className="w-full p-2 border rounded-md text-sm">
                <option value="INWARD">Inward (received from client)</option>
                <option value="OUTWARD">Outward (sent to client)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select name="category" className="w-full p-2 border rounded-md text-sm">
                <option value="">Select...</option>
                <option value="PAN Card">PAN Card</option>
                <option value="Aadhaar">Aadhaar</option>
                <option value="Bank Statement">Bank Statement</option>
                <option value="Invoice Bills">Invoice Bills</option>
                <option value="Signed Form">Signed Form</option>
                <option value="Financial Statements">Financial Statements</option>
                <option value="GST Documents">GST Documents</option>
                <option value="Agreement / Deed">Agreement / Deed</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea name="notes" rows={2} placeholder="e.g. Originals received by courier, to be returned after audit" className="w-full p-2 border rounded-md text-sm" />
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={() => setIsUploadOpen(false)} className="px-4 py-2 border rounded-md text-sm font-medium">Cancel</button>
            <button
              type="submit"
              disabled={uploading}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-60"
            >
              {uploading ? "Uploading…" : "Add to Inbox"}
            </button>
          </div>
        </form>
      </SlideOver>
    </div>
  );
}
