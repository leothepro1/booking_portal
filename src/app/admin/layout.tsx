import { Toaster } from "@/components/ui/sonner"
import { AdminTopbar } from "@/components/admin/topbar"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}): React.ReactElement {
  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <AdminTopbar />
      <main className="mx-auto max-w-[1250px] px-4 py-6 md:px-8">
        {children}
      </main>
      <Toaster />
    </div>
  )
}
