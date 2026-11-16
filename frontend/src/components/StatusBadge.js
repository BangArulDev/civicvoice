export default function StatusBadge({ status }) {
  const statusConfig = {
    baru: {
      label: 'Baru',
      classes: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    diverifikasi: {
      label: 'Diverifikasi',
      classes: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    ditolak: {
      label: 'Ditolak',
      classes: 'bg-red-50 text-red-700 border-red-200',
    },
    didisposisi: {
      label: 'Didisposisi',
      classes: 'bg-purple-50 text-purple-700 border-purple-200',
    },
    diterima: {
      label: 'Diterima',
      classes: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    },
    diproses: {
      label: 'Diproses',
      classes: 'bg-sky-50 text-sky-700 border-sky-200',
    },
    selesai: {
      label: 'Selesai',
      classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
  };

  const current = statusConfig[status] || {
    label: status || 'Tidak Diketahui',
    classes: 'bg-gray-100 text-gray-700 border-gray-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${current.classes}`}
    >
      {current.label}
    </span>
  );
}
