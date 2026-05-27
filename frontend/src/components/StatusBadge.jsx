export default function StatusBadge({ status }) {
  const map = {
    approved: 'bg-green-100 text-green-800 ring-green-200',
    rejected: 'bg-red-100 text-red-800 ring-red-200',
    pending: 'bg-yellow-100 text-yellow-800 ring-yellow-200',
    submitted: 'bg-yellow-100 text-yellow-800 ring-yellow-200',
    draft: 'bg-gray-100 text-gray-700 ring-gray-200',
    processing: 'bg-blue-100 text-blue-700 ring-blue-200',
    paid: 'bg-blue-100 text-blue-800 ring-blue-200',
    locked: 'bg-purple-100 text-purple-800 ring-purple-200',
    cancelled: 'bg-orange-100 text-orange-800 ring-orange-200',
    revoked: 'bg-orange-100 text-orange-800 ring-orange-200',
    active: 'bg-green-100 text-green-800 ring-green-200',
    inactive: 'bg-gray-100 text-gray-600 ring-gray-200',
    closed: 'bg-gray-100 text-gray-700 ring-gray-200',
    foreclosed: 'bg-purple-100 text-purple-700 ring-purple-200',
  }

  const cls = map[status?.toLowerCase()] || 'bg-gray-100 text-gray-700 ring-gray-200'

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset capitalize ${cls}`}
    >
      {status}
    </span>
  )
}
