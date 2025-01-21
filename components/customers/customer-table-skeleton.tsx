"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export function CustomerTableSkeleton() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <div className="h-8 w-24 animate-pulse rounded bg-muted" />
            </TableHead>
            <TableHead>
              <div className="h-8 w-24 animate-pulse rounded bg-muted" />
            </TableHead>
            <TableHead>
              <div className="h-8 w-24 animate-pulse rounded bg-muted" />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <div className="h-6 w-48 animate-pulse rounded bg-muted" />
              </TableCell>
              <TableCell>
                <div className="h-6 w-32 animate-pulse rounded bg-muted" />
              </TableCell>
              <TableCell>
                <div className="h-6 w-32 animate-pulse rounded bg-muted" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
} 