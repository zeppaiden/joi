import { Suspense } from "react"
import { CustomerTableParams } from "@/types/customers"
import { getCustomers } from "@/lib/supabase/customers"
// @ts-ignore
import { CustomerTableContent } from "./customer-table-content"
// @ts-ignore
import { CustomerTableSkeleton } from "./customer-table-skeleton"

interface CustomerTableProps {
  searchParams: Promise<Partial<CustomerTableParams>>
}

export async function CustomerTable({ searchParams }: CustomerTableProps) {
  const data = await getCustomers(await searchParams)

  return (
    <div className="space-y-4">
      <Suspense fallback={<CustomerTableSkeleton />}>
        <CustomerTableContent data={data} />
      </Suspense>
    </div>
  )
} 