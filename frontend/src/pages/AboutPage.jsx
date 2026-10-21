import React from 'react';
import {
  HelpCircle,
  ShieldCheck,
  CheckCircle,
  AlertOctagon,
  FileText,
  Users,
  Terminal,
  BookOpen
} from 'lucide-react';
import PageHeader from '../components/PageHeader';

export default function AboutPage() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <PageHeader
        title="About CoreBanking Sandbox"
        subtitle="Educational toy core banking system specification, banking invariants, and demo limitations"
      />

      {/* Meta Box */}
      <div className="bg-gradient-to-r from-blue-900 to-[#1e3a5f] rounded-xl text-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold tracking-wider uppercase text-teal-300">
              Project ID: PST_PD_153
            </span>
            <h2 className="text-2xl font-bold mt-1">CoreBanking Sandbox (v0.1)</h2>
            <p className="text-sm text-slate-300 mt-1">
              One-month OJT reference implementation for FinTech Developers.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2.5 border border-white/20 text-xs space-y-1">
            <div><strong>Student Team:</strong> Kunal Tayde, Gajangi Nikhileshwar</div>
            <div><strong>Mentor / Reviewer:</strong> Madhushri Tangali</div>
            <div><strong>Batch / Level:</strong> 2026 Level 2 (Core)</div>
          </div>
        </div>
      </div>

      {/* Core Banking Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-blue-700 font-bold">
            <ShieldCheck className="w-5 h-5" />
            <h3 className="text-base">The Balance Invariant Rule</h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Balances can <strong>never go negative</strong> unless an account explicitly has an active overdraft flag enabled by an Administrator. Any transfer or withdrawal attempt that exceeds the available funds (Balance + Overdraft Limit) is immediately blocked with clear feedback.
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-indigo-700 font-bold">
            <CheckCircle className="w-5 h-5" />
            <h3 className="text-base">Atomic Double-Entry Accounting</h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Every inter-account transfer atomically records both a <strong>debit leg</strong> and a <strong>credit leg</strong> sharing a mutual transfer reference. Money cannot be created or destroyed in transit: the total sum of money in the sandbox remains constant before and after transfers.
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-amber-700 font-bold">
            <Users className="w-5 h-5" />
            <h3 className="text-base">Role Governance (Developer vs Admin)</h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Developers can create test accounts, simulate deposits and execute transfers. Dangerous operations such as granting overdraft credit lines or wiping the database are reserved strictly for <strong>Admin Mode</strong>.
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-emerald-700 font-bold">
            <FileText className="w-5 h-5" />
            <h3 className="text-base">Running-Balance Statements</h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Account statements provide clear Opening Balances, Debits, Credits, and a <strong>Running Balance</strong> per row. The final closing balance always reconciles with the current account balance. CSV export is supported.
          </p>
        </div>
      </div>

      {/* Demo Limitation Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-amber-900">
        <div className="flex items-start space-x-3">
          <AlertOctagon className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h4 className="font-bold text-sm">Demo Limitations & Synthetic Data Warning</h4>
            <p className="text-xs text-amber-800 leading-relaxed">
              All accounts, customers, bank balances, and amounts in this sandbox are <strong>100% synthetic</strong>. No real currency is transferred, and no real payment networks (UPI, NEFT, RTGS, IMPS, SWIFT) or payment gateways are accessed. This application is an educational simulation designed for FinTech developers to safely learn core banking rules without financial risk.
            </p>
          </div>
        </div>
      </div>

      {/* Python CLI Helper Notes */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-3">
        <div className="flex items-center space-x-2 text-slate-800 font-bold">
          <Terminal className="w-5 h-5 text-teal-600" />
          <h3 className="text-base">Python 3 CLI Companion Helper (`bank.py`)</h3>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">
          The project includes a standalone object-oriented Python 3 helper (`bank.py`) implementing the identical banking rules. You can run CLI commands directly from terminal:
        </p>
        <div className="bg-slate-900 text-slate-100 p-4 rounded-lg font-mono text-xs overflow-x-auto space-y-1">
          <div><span className="text-emerald-400"># Run Python CLI helper:</span></div>
          <div>python bank.py statement ACC-1001000001</div>
          <div>python bank.py transfer ACC-1001000001 ACC-1001000003 5000</div>
          <div>python bank.py accounts</div>
        </div>
      </div>
    </div>
  );
}
