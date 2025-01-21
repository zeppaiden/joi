"use client"

import { useRouter, useSearchParams } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"

interface CustomerPaginationProps {
  total: number
  page: number
  perPage: number
}

export function CustomerPagination({
  total,
  page,
  perPage,
}: CustomerPaginationProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const totalPages = Math.ceil(total / perPage)
  const canPreviousPage = page > 1
  const canNextPage = page < totalPages

  const createPageURL = (pageNumber: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", pageNumber.toString())
    return `?${params.toString()}`
  }

  const handlePerPageChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("perPage", value)
    params.delete("page") // Reset to first page
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="flex items-center justify-between px-2">
      <div className="flex items-center space-x-6 text-sm">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Rows per page</p>
          <Select
            value={perPage.toString()}
            onValueChange={handlePerPageChange}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={perPage} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 40, 50].map((value) => (
                <SelectItem key={value} value={value.toString()}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          Page {page} of {totalPages}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          className="h-8 w-8 p-0"
          onClick={() => router.push(createPageURL(page - 1))}
          disabled={!canPreviousPage}
        >
          ←
        </Button>
        <Button
          variant="outline"
          className="h-8 w-8 p-0"
          onClick={() => router.push(createPageURL(page + 1))}
          disabled={!canNextPage}
        >
          →
        </Button>
      </div>
    </div>
  )
} 