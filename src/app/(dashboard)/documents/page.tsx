import { Inbox } from 'lucide-react';
import React from 'react';

export default function DocumentInboxPage() {
  return (
    <div className="flex-1 p-8 pt-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Document Inbox</h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage and review incoming client documents.
          </p>
        </div>
      </div>

      <div className="border border-slate-200 rounded-lg p-8 bg-slate-50 min-h-[400px] flex flex-col items-center justify-center text-center">
        <Inbox className="w-12 h-12 text-slate-400 mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-1">No new documents</h3>
        <p className="text-sm text-slate-500 max-w-sm">
          Documents uploaded by clients will appear here for review.
        </p>
      </div>
    </div>
  );
}
