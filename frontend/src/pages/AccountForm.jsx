import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CreditCard, User, IndianRupee, Save, X, PlusCircle } from 'lucide-react';
import { getCustomers, createAccount } from '../services/api';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToast } from '../components/Toast';

export default function AccountForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCustomerId = searchParams.get('customerId') || '';
  const { showToast } = useToast();

  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    customerId: initialCustomerId,
    accountType: 'Savings',
    initialDeposit: '0',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const res = await getCustomers();
        const list = res.data?.data || res.data || [];
        setCustomers(Array.isArray(list) ? list : []);
        if (initialCustomerId) {
          setFormData((prev) => ({ ...prev, customerId: initialCustomerId }));
        }
      } catch (err) {
        showToast('Failed to load customers for account opening', 'error');
      } finally {
        setLoadingCustomers(false);
      }
    };

    loadCustomers();
  }, [initialCustomerId, showToast]);

  const validate = () => {
    const newErrors = {};

    if (!formData.customerId) {
      newErrors.customerId = 'Please select a customer';
    }

    const depositNum = parseFloat(formData.initialDeposit);
    if (isNaN(depositNum) || depositNum < 0) {
      newErrors.initialDeposit = 'Initial deposit must be 0 or a positive number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const depositVal = parseFloat(formData.initialDeposit) || 0;
      const payload = {
        customerId: formData.customerId,
        accountType: formData.accountType,
        type: formData.accountType,
        initialDeposit: depositVal,
        balance: depositVal,
      };

      const response = await createAccount(payload);
      showToast('Bank account created successfully', 'success');

      const createdAcc = response.data?.data || response.data;
      const accId = createdAcc?.accountNumber || createdAcc?.id || createdAcc?._id;

      if (accId) {
        navigate(`/accounts/${accId}`);
      } else {
        navigate('/accounts');
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to open account. Please check the inputs.';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="Open New Bank Account"
        subtitle="Provision a savings or current ledger account for an active customer"
        showBackButton={true}
        backTo="/accounts"
      />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loadingCustomers ? (
          <LoadingSpinner message="Loading customer directory..." />
        ) : (
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
            {/* Customer Selection */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                <User className="w-4 h-4 text-[#1e3a5f]" />
                Select Customer <span className="text-rose-500">*</span>
              </label>
              <select
                name="customerId"
                value={formData.customerId}
                onChange={handleChange}
                className={`w-full px-3.5 py-2.5 text-sm rounded-lg border ${
                  errors.customerId
                    ? 'border-rose-400 bg-rose-50/20'
                    : 'border-slate-200'
                } bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] transition-all`}
              >
                <option value="">-- Choose Account Holder --</option>
                {customers.map((c) => {
                  const id = c.id || c._id;
                  const name =
                    c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Customer';
                  return (
                    <option key={id} value={id}>
                      {name} (ID: {id}) - {c.phone || c.email}
                    </option>
                  );
                })}
              </select>
              {errors.customerId && (
                <p className="text-xs text-rose-500 mt-1 font-medium">
                  {errors.customerId}
                </p>
              )}
              {customers.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  No customers found.{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/customers/new')}
                    className="underline font-semibold"
                  >
                    Create a customer first
                  </button>
                  .
                </p>
              )}
            </div>

            {/* Account Type Selection */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-[#1e3a5f]" />
                Account Type <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={`flex items-start p-3.5 rounded-lg border cursor-pointer transition-all ${
                    formData.accountType === 'Savings'
                      ? 'border-[#1e3a5f] bg-blue-50/30 ring-1 ring-[#1e3a5f]'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="accountType"
                    value="Savings"
                    checked={formData.accountType === 'Savings'}
                    onChange={handleChange}
                    className="mt-0.5 text-[#1e3a5f] focus:ring-[#1e3a5f]"
                  />
                  <div className="ml-3">
                    <span className="text-sm font-bold text-slate-800">Savings Account</span>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Earn interest (3.5% p.a.), ideal for individuals and personal savings.
                    </p>
                  </div>
                </label>

                <label
                  className={`flex items-start p-3.5 rounded-lg border cursor-pointer transition-all ${
                    formData.accountType === 'Current'
                      ? 'border-[#1e3a5f] bg-blue-50/30 ring-1 ring-[#1e3a5f]'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="accountType"
                    value="Current"
                    checked={formData.accountType === 'Current'}
                    onChange={handleChange}
                    className="mt-0.5 text-[#1e3a5f] focus:ring-[#1e3a5f]"
                  />
                  <div className="ml-3">
                    <span className="text-sm font-bold text-slate-800">Current Account</span>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Zero minimum balance, higher transaction volumes for businesses.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Initial Deposit */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                <IndianRupee className="w-4 h-4 text-[#1e3a5f]" />
                Initial Deposit Amount (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                  ₹
                </span>
                <input
                  type="number"
                  name="initialDeposit"
                  step="0.01"
                  min="0"
                  value={formData.initialDeposit}
                  onChange={handleChange}
                  placeholder="0.00"
                  className={`w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border ${
                    errors.initialDeposit
                      ? 'border-rose-400 bg-rose-50/20'
                      : 'border-slate-200'
                  } focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] transition-all`}
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Optional. You may open an account with ₹0.00 and deposit funds later.
              </p>
              {errors.initialDeposit && (
                <p className="text-xs text-rose-500 mt-1 font-medium">
                  {errors.initialDeposit}
                </p>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                disabled={submitting}
                onClick={() => navigate('/accounts')}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>
              <button
                type="submit"
                disabled={submitting || customers.length === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1e3a5f] hover:bg-[#2c5282] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-60"
              >
                <PlusCircle className="w-4 h-4 text-teal-400" />
                <span>{submitting ? 'Creating Account...' : 'Open Account'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
