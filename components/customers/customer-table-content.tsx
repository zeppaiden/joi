"use client"

import { Suspense, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { CustomerTableResponse, SortField, SortOrder } from "@/types/customers"
import { formatDate } from "@/utils/format"
import { CustomerPagination } from "./customer-pagination"
import { CustomerPaginationSkeleton } from "./customer-pagination-skeleton"

interface CustomerTableContentProps {
  data: CustomerTableResponse
}

export function CustomerTableContent({
  data: customers,
}: CustomerTableContentProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const createQueryString = useCallback(
    (params: Record<string, string | null>) => {
      const newSearchParams = new URLSearchParams(searchParams.toString())
      
      Object.entries(params).forEach(([key, value]) => {
        if (value === null) {
          newSearchParams.delete(key)
        } else {
          newSearchParams.set(key, value)
        }
      })
      
      return newSearchParams.toString()
    },
    [searchParams]
  )
  
  const sortColumn = (field: SortField) => {
    const currentSort = searchParams.get("sortField")
    const currentOrder = searchParams.get("sortOrder")
    
    let newOrder: SortOrder = "asc"
    if (currentSort === field && currentOrder === "asc") {
      newOrder = "desc"
    }
    
    const query = createQueryString({
      sortField: field,
      sortOrder: newOrder,
    })
    router.push(`?${query}`)
  }
  
  const getSortIcon = (field: SortField) => {
    const currentSort = searchParams.get("sortField")
    const currentOrder = searchParams.get("sortOrder")
    
    if (currentSort !== field) return "↕"
    return currentOrder === "asc" ? "↑" : "↓"
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => sortColumn("email")}
                  className="h-8 text-left font-medium"
                >
                  Email {getSortIcon("email")}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => sortColumn("created_at")}
                  className="h-8 text-left font-medium"
                >
                  Created {getSortIcon("created_at")}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => sortColumn("updated_at")}
                  className="h-8 text-left font-medium"
                >
                  Updated {getSortIcon("updated_at")}
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.data.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell>{customer.email}</TableCell>
                <TableCell>{formatDate(customer.created_at)}</TableCell>
                <TableCell>{formatDate(customer.updated_at)}</TableCell>
              </TableRow>
            ))}
            {customers.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
                  No customers found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      <Suspense fallback={<CustomerPaginationSkeleton />}>
        <CustomerPagination
          total={customers.total}
          page={customers.page}
          perPage={customers.perPage}
        />
      </Suspense>
    </div>
  )
} 