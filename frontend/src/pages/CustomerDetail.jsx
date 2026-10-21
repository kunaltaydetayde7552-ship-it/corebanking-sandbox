import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  Edit2,
  Trash2,
  PlusCircle,
  AlertTriangle,
  Building,
} from 'lucide-react';
import { getCustomer, getCustomerAccounts, getAccounts, deleteCustomer } from '../services/api';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { useToast } from '../components/Toast';
import { formatCurrency, formatDate, capitalize } from '../utils/formatters';

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [customer, setCustomer] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCustomerData = async () => {
    setLoading(true);
    setError(null);
    try {
      const custRes = await getCustomer(id);
      const custData = custRes.data?.data || custRes.data;
      setCustomer(custData);

      // Attempt to load customer accounts
      try {
        const accRes = await getCustomerAccounts(id);
        const accData = accRes.data?.data || accRes.data || [];
        setAccounts(Array.isArray(accData) ? accData : []);
      } catch {
        // Fallback: fetch all accounts and filter by customerId
        try {
          const allAccRes = await getAccounts();
          const allAcc = allAccRes.data?.data || allAccRes.data || [];
          if (Array.isArray(allAcc)) {
            const filtered = allAcc.filter(
              (a) =>
                String(a.customerId) === String(id) ||
                String(a.customer?._id) === String(id) ||
                String(a.customer?.id) === String(id)
            );
            setAccounts(filtered);
          }
        } catch {
          setAccounts([]);
        }
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Failed to load customer profile details.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchCustomerData();
    }
  }, [id]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteCustomer(id);
      showToast('Customer record successfully removed', 'success');
      navigate('/customers');
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to delete customer. Ensure no active accounts are linked.';
      showToast(msg, 'error');
      setIsDeleteModalOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading customer profile & accounts..." />;
  }

  if (error || !customer) {
    return (
      <ErrorMessage
        title="Customer Not Found"
        message={error || 'Unable to retrieve information for this customer ID.'}
        onRetry={fetchCustomerData}
      />
    );
  }

  const displayName =
    customer.name ||
    `${customer.firstName || ''} ${customer.lastName || ''}`.trim() ||
    'Customer Details';

  const accountColumns = [
    {
      header: 'Account Number',
      key: 'accountNumber',
      render: (a) => (
        <span className="font-mono font-semibold text-slate-800">
          {a.accountNumber || a.id || a._id}
        </span>
      ),
    },
    {
      header: 'Account Type',
      key: 'type',
      render: (a) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
          {capitalize(a.accountType || a.type || 'Savings')}
        </span>
      ),
    },
    {
      header: 'Balance',
      key: 'balance',
      align: 'right',
      render: (a) => (
        <span className="font-bold text-slate-900">
          {formatCurrency(a.balance)}
        </span>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      render: (a) => <StatusBadge status={a.status || 'Active'} />,
    },
    {
      header: 'Created Date',
      key: 'createdAt',
      render: (a) => (
        <span className="text-slate-500 text-xs">
          {formatDate(a.createdAt || a.createdDate)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={displayName}
        subtitle={`Customer ID: ${customer.id || customer._id || id}`}
        showBackButton={true}
        backTo="/customers"
        action={
          <div className="flex items-center space-x-2">
            <Link
              to={`/customers/${id}/edit`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </Link>
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        }
      />

      {/* Customer Info Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5 text-[#1e3a5f]" />
            <h3 className="font-bold text-slate-800">Profile Information</h3>
          </div>
          <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-medium">
            Verified KYC
          </span>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="flex items-start space-x-3">
            <Mail className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</p>
              <p className="text-sm font-medium text-slate-800 mt-0.5">
                {customer.email || 'Not provided'}
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Phone className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Phone</p>
              <p className="text-sm font-medium text-slate-800 font-mono mt-0.5">
                {customer.phone || 'Not provided'}
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Calendar className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Date of Birth</p>
              <p className="text-sm font-medium text-slate-800 mt-0.5">
                {formatDate(customer.dateOfBirth || customer.dob)}
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 md:col-span-2">
            <MapPin className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Residential Address</p>
              <p className="text-sm font-medium text-slate-800 mt-0.5">
                {customer.address || 'Not provided'}
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Building className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Joined Date</p>
              <p className="text-sm font-medium text-slate-800 mt-0.5">
                {formatDate(customer.createdAt || customer.createdDate)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Linked Accounts Table */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5 text-[#1e3a5f]" />
            <h3 className="font-bold text-slate-800">
              Linked Accounts ({accounts.length})
            </h3>
          </div>
          <Link
            to={`/accounts/new?customerId=${id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1e3a5f] hover:bg-[#2c5282] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <PlusCircle className="w-4 h-4 text-teal-400" />
            <span>Open Account for this Customer</span>
          </Link>
        </div>

        <DataTable
          columns={accountColumns}
          data={accounts}
          emptyMessage="No banking accounts linked to this customer yet."
          onRowClick={(a) => navigate(`/accounts/${a.accountNumber || a.id || a._id}`)}
        />
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => !isDeleting && setIsDeleteModalOpen(false)}
        title="Confirm Customer Deletion"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-center space-x-3 text-rose-600">
            <AlertTriangle className="w-8 h-8 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm text-slate-800">
                Are you sure you want to delete this customer?
              </p>
              <p className="text-xs text-slate-500 mt-1">
                This action cannot be undone. All personal records for{' '}
                <strong>{displayName}</strong> will be archived or removed.
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDelete}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              {isDeleting ? 'Deleting...' : 'Confirm Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
