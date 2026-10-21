import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  DollarSign,
  Lock,
  ArrowRight,
  Info
} from 'lucide-react';
import { getAccounts, updateAccountOverdraft, resetSandboxData } from '../services/api';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToast } from '../components/Toast';
import { useRole } from '../hooks/useRole';
import { formatCurrency } from '../utils/formatters';

export default function AdminSettings() {
  const { isAdmin, setRole } = useRole();
  const { showToast } = useToast();

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  // Overdraft edit state
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [overdraftEnabled, setOverdraftEnabled] = useState(false);
  const [overdraftLimit, setOverdraftLimit] = useState('0');

  // Reset modal state
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const res = await getAccounts();
      const list = res.data?.data || res.data || [];
      setAccounts(list);
    } catch {
      showToast('Failed to load accounts for administration', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleOpenOverdraftModal = (acc) => {
    setSelectedAccount(acc);
    setOverdraftEnabled(Boolean(acc.overdraftEnabled));
    setOverdraftLimit(String(acc.overdraftLimit || 0));
  };

  const handleSaveOverdraft = async (e) => {
    e.preventDefault();
    if (!selectedAccount) return;

    setUpdatingId(selectedAccount.id);
    try {
      await updateAccountOverdraft(selectedAccount.id, {
        overdraftEnabled,
        overdraftLimit: parseFloat(overdraftLimit) || 0
      });
      showToast(
        `Overdraft settings updated for ${selectedAccount.accountNumber}`,
        'success'
      );
      setSelectedAccount(null);
      await loadAccounts();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update overdraft', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleResetSandbox = async () => {
    setResetting(true);
    try {
      await resetSandboxData();
      showToast('Sandbox successfully reset to documented sample data!', 'success');
      setIsResetModalOpen(false);
      await loadAccounts();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to reset sandbox data', 'error');
    } finally {
      setResetting(false);
    }
  };

  // Role Guard Check
  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Admin Privileges Required</h2>
        <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
          You are currently in <strong>Developer Mode</strong>. Overdraft configuration and sample data resets are restricted to the <strong>Admin View</strong> (US-09).
        </p>
        <button
          onClick={() => setRole('ADMIN')}
          className="mt-6 inline-flex items-center space-x-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-medium text-sm rounded-lg shadow-sm transition-colors"
        >
          <span>Switch to Admin Mode</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Admin Settings & Rule Management"
        subtitle="Manage account overdraft permissions, credit limits, and restore demo datasets"
      />

      {/* Overdraft Rule Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-semibold text-slate-800">
              Account Overdraft Configuration (US-05)
            </h2>
          </div>
          <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-md font-medium">
            Strict FinTech Invariant
          </span>
        </div>

        <div className="p-6">
          <p className="text-sm text-slate-600 mb-6">
            Balances can never go negative unless an account has an active overdraft flag.
            When enabled, transfers and withdrawals may dip negative up to the configured limit.
          </p>

          {loading ? (
            <LoadingSpinner text="Loading accounts..." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-600">
                  <tr>
                    <th className="py-3 px-4">Account Number</th>
                    <th className="py-3 px-4">Customer Name</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4 text-right">Current Balance</th>
                    <th className="py-3 px-4 text-center">Overdraft Flag</th>
                    <th className="py-3 px-4 text-right">Overdraft Limit</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {accounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                        {acc.accountNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {acc.customerName || (acc.customer ? `${acc.customer.firstName} ${acc.customer.lastName}` : 'Customer')}
                      </td>
                      <td className="py-3 px-4 uppercase text-xs font-semibold text-slate-500">
                        {acc.accountType}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800">
                        {formatCurrency(acc.balance)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {acc.overdraftEnabled ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Enabled
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-600">
                            Disabled
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        {acc.overdraftEnabled ? formatCurrency(acc.overdraftLimit || 0) : '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleOpenOverdraftModal(acc)}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium transition-colors"
                        >
                          Configure
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Sandbox Reset Card (US-08) */}
      <div className="bg-white rounded-xl shadow-sm border border-rose-200 overflow-hidden">
        <div className="px-6 py-4 bg-rose-50/50 border-b border-rose-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
            <h2 className="text-base font-semibold text-rose-900">
              Reset Sandbox Sample Data (US-08)
            </h2>
          </div>
          <span className="text-xs bg-rose-100 text-rose-800 font-semibold px-2 py-0.5 rounded">
            Admin Only
          </span>
        </div>

        <div className="p-6">
          <p className="text-sm text-slate-600 mb-4 leading-relaxed">
            Restores all initial documented sample customers, accounts, and ledger transactions.
            All mock transfers, accounts created during testing, or modified balances will be wiped clean.
          </p>

          <button
            onClick={() => setIsResetModalOpen(true)}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset to Clean Demo State</span>
          </button>
        </div>
      </div>

      {/* Overdraft Config Modal */}
      {selectedAccount && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedAccount(null)}
          title={`Configure Overdraft - ${selectedAccount.accountNumber}`}
        >
          <form onSubmit={handleSaveOverdraft} className="space-y-4">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
              <div><strong>Account:</strong> {selectedAccount.accountNumber} ({selectedAccount.accountType})</div>
              <div><strong>Current Balance:</strong> {formatCurrency(selectedAccount.balance)}</div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <label htmlFor="overdraft-toggle" className="text-sm font-medium text-slate-800 cursor-pointer">
                Enable Overdraft Protection
              </label>
              <input
                id="overdraft-toggle"
                type="checkbox"
                checked={overdraftEnabled}
                onChange={(e) => setOverdraftEnabled(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
              />
            </div>

            {overdraftEnabled && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Overdraft Limit (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={overdraftLimit}
                  onChange={(e) => setOverdraftLimit(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. 50000"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Balance can dip down to -₹{parseFloat(overdraftLimit || 0).toLocaleString('en-IN')}.
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedAccount(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updatingId !== null}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold"
              >
                {updatingId ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Confirmation Modal for Reset */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="Confirm Sandbox Reset"
      >
        <div className="space-y-4">
          <div className="flex items-start space-x-3 text-rose-600">
            <AlertTriangle className="w-6 h-6 flex-shrink-0" />
            <p className="text-sm text-slate-700">
              Are you sure you want to reset the CoreBanking Sandbox? This will wipe all newly created accounts and revert the ledger back to the 4 seed accounts and 8 sample transactions.
            </p>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
            <button
              onClick={() => setIsResetModalOpen(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleResetSandbox}
              disabled={resetting}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold"
            >
              {resetting ? 'Resetting...' : 'Yes, Reset Sandbox'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
