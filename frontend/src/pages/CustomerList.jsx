import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Search, Users, ExternalLink } from 'lucide-react';
import { getCustomers } from '../services/api';
import useFetch from '../hooks/useFetch';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { formatDate } from '../utils/formatters';

export default function CustomerList() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: rawCustomers, loading, error, refetch } = useFetch(getCustomers);

  const customerList = useMemo(() => {
    if (!rawCustomers) return [];
    if (Array.isArray(rawCustomers)) return rawCustomers;
    if (Array.isArray(rawCustomers.data)) return rawCustomers.data;
    if (Array.isArray(rawCustomers.customers)) return rawCustomers.customers;
    return [];
  }, [rawCustomers]);

  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return customerList;
    const term = searchTerm.toLowerCase();
    return customerList.filter((c) => {
      const fullName = `${c.firstName || ''} ${c.lastName || ''} ${c.name || ''}`.toLowerCase();
      const email = (c.email || '').toLowerCase();
      const phone = (c.phone || '').toLowerCase();
      const id = String(c.id || c._id || '').toLowerCase();
      return (
        fullName.includes(term) ||
        email.includes(term) ||
        phone.includes(term) ||
        id.includes(term)
      );
    });
  }, [customerList, searchTerm]);

  const columns = [
    {
      header: 'Customer ID',
      key: 'id',
      render: (c) => (
        <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">
          {c.id || c._id || '-'}
        </span>
      ),
    },
    {
      header: 'Name',
      key: 'name',
      render: (c) => {
        const displayName =
          c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Unnamed';
        return (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-[#1e3a5f]/10 text-[#1e3a5f] font-semibold flex items-center justify-center text-xs">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-slate-800">{displayName}</p>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Email Address',
      key: 'email',
      render: (c) => <span className="text-slate-600">{c.email || '-'}</span>,
    },
    {
      header: 'Phone Number',
      key: 'phone',
      render: (c) => <span className="text-slate-600 font-mono text-xs">{c.phone || '-'}</span>,
    },
    {
      header: 'Created Date',
      key: 'createdAt',
      render: (c) => (
        <span className="text-slate-500 text-xs">
          {formatDate(c.createdAt || c.createdDate || c.date)}
        </span>
      ),
    },
    {
      header: 'Action',
      key: 'action',
      align: 'right',
      render: (c) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/customers/${c.id || c._id}`);
          }}
          className="text-teal-600 hover:text-teal-800 inline-flex items-center gap-1 text-xs font-semibold"
        >
          <span>View</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Management"
        subtitle="View registered retail and corporate banking clientele"
        action={
          <Link
            to="/customers/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1e3a5f] hover:bg-[#2c5282] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Customer</span>
          </Link>
        }
      />

      {/* Search and Filters Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by customer name, email, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] transition-all"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Users className="w-4 h-4 text-slate-400" />
          <span>
            Total Customers: <strong className="text-slate-800">{filteredCustomers.length}</strong>
          </span>
        </div>
      </div>

      {/* Main Table or Loading/Error States */}
      {loading ? (
        <LoadingSpinner message="Retrieving customer records..." />
      ) : error ? (
        <ErrorMessage
          title="Could Not Load Customers"
          message={error}
          onRetry={refetch}
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredCustomers}
          emptyMessage={
            searchTerm
              ? `No customers found matching "${searchTerm}".`
              : 'No customers found in database. Create your first customer!'
          }
          onRowClick={(c) => navigate(`/customers/${c.id || c._id}`)}
        />
      )}
    </div>
  );
}
