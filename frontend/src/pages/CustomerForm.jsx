import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { User, Mail, Phone, MapPin, Calendar, Save, X } from 'lucide-react';
import { createCustomer, getCustomer, updateCustomer } from '../services/api';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { useToast } from '../components/Toast';

export default function CustomerForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    dateOfBirth: '',
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (isEdit) {
      const loadCustomerData = async () => {
        setLoading(true);
        setLoadError(null);
        try {
          const res = await getCustomer(id);
          const cust = res.data?.data || res.data || {};

          // In case customer has a single 'name' field
          let fName = cust.firstName || '';
          let lName = cust.lastName || '';
          if (!fName && cust.name) {
            const parts = cust.name.trim().split(' ');
            fName = parts[0] || '';
            lName = parts.slice(1).join(' ') || '';
          }

          // Format dateOfBirth for input[type="date"]
          let formattedDob = '';
          if (cust.dateOfBirth || cust.dob) {
            const d = new Date(cust.dateOfBirth || cust.dob);
            if (!isNaN(d.getTime())) {
              formattedDob = d.toISOString().split('T')[0];
            }
          }

          setFormData({
            firstName: fName,
            lastName: lName,
            email: cust.email || '',
            phone: cust.phone || '',
            address: cust.address || '',
            dateOfBirth: formattedDob,
          });
        } catch (err) {
          setLoadError(
            err.response?.data?.message ||
              err.message ||
              'Failed to retrieve customer data for editing.'
          );
        } finally {
          setLoading(false);
        }
      };

      loadCustomerData();
    }
  }, [id, isEdit]);

  const validate = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please provide a valid email address';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\+?[0-9\s-]{7,15}$/.test(formData.phone.trim())) {
      newErrors.phone = 'Please provide a valid phone number (e.g. +91 9876543210)';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Residential address is required';
    }

    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required';
    } else {
      const dobDate = new Date(formData.dateOfBirth);
      const today = new Date();
      if (dobDate >= today) {
        newErrors.dateOfBirth = 'Date of birth must be in the past';
      }
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
      // Backend may accept firstName & lastName or composite name
      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        dateOfBirth: formData.dateOfBirth,
        dob: formData.dateOfBirth,
      };

      if (isEdit) {
        await updateCustomer(id, payload);
        showToast('Customer record updated successfully', 'success');
        navigate(`/customers/${id}`);
      } else {
        const response = await createCustomer(payload);
        const createdId =
          response.data?.data?.id ||
          response.data?.data?._id ||
          response.data?.id ||
          response.data?._id;
        showToast('Customer registered successfully', 'success');
        if (createdId) {
          navigate(`/customers/${createdId}`);
        } else {
          navigate('/customers');
        }
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to save customer. Please check the inputs.';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading customer record..." />;
  }

  if (loadError) {
    return (
      <ErrorMessage
        title="Error Loading Customer"
        message={loadError}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title={isEdit ? 'Edit Customer Profile' : 'New Customer Registration'}
        subtitle={
          isEdit
            ? `Update personal details for Customer ID: ${id}`
            : 'Register a new customer account holder for KYC & banking facilities'
        }
        showBackButton={true}
        backTo={isEdit ? `/customers/${id}` : '/customers'}
      />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {/* Section 1: Personal Details */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <User className="w-4 h-4 text-[#1e3a5f]" />
              Personal Identification
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* First Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  First Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="e.g. Rahul"
                  className={`w-full px-3.5 py-2.5 text-sm rounded-lg border ${
                    errors.firstName
                      ? 'border-rose-400 bg-rose-50/20'
                      : 'border-slate-200'
                  } focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] transition-all`}
                />
                {errors.firstName && (
                  <p className="text-xs text-rose-500 mt-1 font-medium">{errors.firstName}</p>
                )}
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Last Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="e.g. Sharma"
                  className={`w-full px-3.5 py-2.5 text-sm rounded-lg border ${
                    errors.lastName
                      ? 'border-rose-400 bg-rose-50/20'
                      : 'border-slate-200'
                  } focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] transition-all`}
                />
                {errors.lastName && (
                  <p className="text-xs text-rose-500 mt-1 font-medium">{errors.lastName}</p>
                )}
              </div>

              {/* Date of Birth */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Date of Birth <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    className={`w-full px-3.5 py-2.5 text-sm rounded-lg border ${
                      errors.dateOfBirth
                        ? 'border-rose-400 bg-rose-50/20'
                        : 'border-slate-200'
                    } focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] transition-all`}
                  />
                </div>
                {errors.dateOfBirth && (
                  <p className="text-xs text-rose-500 mt-1 font-medium">{errors.dateOfBirth}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Contact Details */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#1e3a5f]" />
              Contact Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  className={`w-full px-3.5 py-2.5 text-sm rounded-lg border ${
                    errors.email
                      ? 'border-rose-400 bg-rose-50/20'
                      : 'border-slate-200'
                  } focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] transition-all`}
                />
                {errors.email && (
                  <p className="text-xs text-rose-500 mt-1 font-medium">{errors.email}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Phone Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+91 9876543210"
                  className={`w-full px-3.5 py-2.5 text-sm rounded-lg border ${
                    errors.phone
                      ? 'border-rose-400 bg-rose-50/20'
                      : 'border-slate-200'
                  } focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] transition-all`}
                />
                {errors.phone && (
                  <p className="text-xs text-rose-500 mt-1 font-medium">{errors.phone}</p>
                )}
              </div>

              {/* Address */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Residential Address <span className="text-rose-500">*</span>
                </label>
                <textarea
                  name="address"
                  rows={3}
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Flat/House No, Building, Street, Area, City, Pincode"
                  className={`w-full px-3.5 py-2.5 text-sm rounded-lg border ${
                    errors.address
                      ? 'border-rose-400 bg-rose-50/20'
                      : 'border-slate-200'
                  } focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] transition-all`}
                />
                {errors.address && (
                  <p className="text-xs text-rose-500 mt-1 font-medium">{errors.address}</p>
                )}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              disabled={submitting}
              onClick={() => navigate(isEdit ? `/customers/${id}` : '/customers')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <X className="w-4 h-4" />
              <span>Cancel</span>
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1e3a5f] hover:bg-[#2c5282] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-70"
            >
              <Save className="w-4 h-4" />
              <span>{submitting ? 'Saving...' : isEdit ? 'Update Customer' : 'Create Customer'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
