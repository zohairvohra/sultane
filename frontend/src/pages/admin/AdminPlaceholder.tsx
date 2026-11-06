import AdminLayout from '../../components/admin/AdminLayout'

export default function AdminPlaceholder({ title, crumb, note }: { title: string; crumb: string; note: string }) {
  return (
    <AdminLayout title={title} crumb={crumb}>
      <h2 className="font-display text-4xl text-maroon mb-3">{title}</h2>
      <p className="text-stone max-w-xl">{note}</p>
      <div className="bg-cream-dark p-6 mt-8 max-w-xl">
        <p className="text-sm text-stone">
          Not built in this concept pass — the Orders and Custom enquiries dashboards demonstrate the core admin
          patterns (filters, selected-record detail, status actions) this screen would reuse.
        </p>
      </div>
    </AdminLayout>
  )
}
