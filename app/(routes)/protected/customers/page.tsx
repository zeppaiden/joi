import { Suspense } from "react"
import { CustomerTable } from "@/components/customers/customer-table"
import { CustomerSearch } from "@/components/customers/customer-search"
import { CustomerSearchSkeleton } from "@/components/customers/customer-search-skeleton"
import { CustomerTableSkeleton } from "@/components/customers/customer-table-skeleton"

/*
type CustomersPageProps = {
  searchParams: { [key: string]: string | string[] | undefined }
}
*/

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  return (
    <div className="flex flex-col space-y-6 p-6">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <Suspense fallback={<CustomerSearchSkeleton />}>
            <CustomerSearch />
          </Suspense>
        </div>
        <p className="text-muted-foreground">
          Manage and view all customer accounts.
        </p>
      </div>

      <Suspense fallback={<CustomerTableSkeleton />}>
        <CustomerTable searchParams={searchParams} />
      </Suspense>
    </div>
  )
} 