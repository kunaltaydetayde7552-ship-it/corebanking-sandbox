import React from 'react';
import { getStatusColor, getTransactionTypeColor, capitalize } from '../utils/formatters';

export default function StatusBadge({ status, type, label, size = 'sm' }) {
  const value = status || type || label || '';
  const isType = Boolean(type);

  const colorClass = isType ? getTransactionTypeColor(value) : getStatusColor(value);
  const sizeClass = size === 'md' ? 'px-3 py-1 text-xs' : 'px-2.5 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${sizeClass} ${colorClass}`}
    >
      <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-current opacity-70"></span>
      {capitalize(value)}
    </span>
  );
}
