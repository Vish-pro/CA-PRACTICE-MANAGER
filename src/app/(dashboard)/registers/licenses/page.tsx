import { FileCheck } from 'lucide-react';
import React from 'react';

export default function LicensesRegisterPage() {
  return (
    <div className="flex-1 p-8 pt-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Licenses Register</h2>
          <p className="text-sm text-slate-500 mt-1">
            Track and manage client licenses and renewals.
          </p>
        </div>
      </div>

      <div className="border border-slate-200 rounded-lg p-8 bg-slate-50 min-h-[400px] flex flex-col items-center justify-center text-center">
        <FileCheck className="w-12 h-12 text-slate-400 mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-1">No licenses found</h3>
        <p className="text-sm text-slate-500 max-w-sm">
          Add licenses to begin tracking renewals and compliance status.
        </p>
      </div>
    </div>
  );
}
