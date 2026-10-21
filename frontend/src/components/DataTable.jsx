import React from 'react';

export default function DataTable({
  columns = [],
  data = [],
  onRowClick,
  emptyMessage = 'No records found',
  keyField = 'id',
  className = '',
}) {
  return (
    <div className={`w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
              {columns.map((col, idx) => (
                <th
                  key={col.key || idx}
                  className={`px-6 py-3.5 ${
                    col.align === 'right'
                      ? 'text-right'
                      : col.align === 'center'
                      ? 'text-center'
                      : 'text-left'
                  } ${col.className || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {data && data.length > 0 ? (
              data.map((row, rowIdx) => {
                const rowKey = row[keyField] || rowIdx;
                const isClickable = Boolean(onRowClick);

                return (
                  <tr
                    key={rowKey}
                    onClick={() => isClickable && onRowClick(row)}
                    className={`transition-colors duration-150 ${
                      rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                    } ${
                      isClickable
                        ? 'cursor-pointer hover:bg-blue-50/50'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    {columns.map((col, colIdx) => (
                      <td
                        key={col.key || colIdx}
                        className={`px-6 py-4 whitespace-nowrap text-slate-700 ${
                          col.align === 'right'
                            ? 'text-right'
                            : col.align === 'center'
                            ? 'text-center'
                            : 'text-left'
                        } ${col.className || ''}`}
                      >
                        {col.render
                          ? col.render(row, rowIdx)
                          : col.key
                          ? row[col.key] !== undefined && row[col.key] !== null
                            ? String(row[col.key])
                            : '-'
                          : '-'}
                      </td>
                    ))}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center text-slate-400 font-medium"
                >
                  <div className="flex flex-col items-center justify-center">
                    <p className="text-sm">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
