import { Suspense } from "react"
import { CustomerTableParams } from "@/types/customers"
import { getCustomers } from "@/lib/supabase/customers"
import { CustomerTableContent } from "./customer-table-content"
import { CustomerTableSkeleton } from "./customer-table-skeleton"

interface CustomerTableProps {
  searchParams: Partial<CustomerTableParams>
}

export async function CustomerTable({ searchParams }: CustomerTableProps) {
  const data = await getCustomers(searchParams)

  return (
    <div className="space-y-4">
      <Suspense fallback={<CustomerTableSkeleton />}>
        <CustomerTableContent data={data} />
      </Suspense>
    </div>
  )
} 