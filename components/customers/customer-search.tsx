"use client"

import { useTransition, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { useDebounce } from "use-debounce"

export function CustomerSearch() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [_isPending, startTransition] = useTransition()
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") ?? "")
  
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300)
  
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    
    if (debouncedSearchTerm) {
      params.set("search", debouncedSearchTerm)
    } else {
      params.delete("search")
    }
    
    // Reset to first page
    params.delete("page")
    
    startTransition(() => {
      router.push(`?${params.toString()}`)
    })
  }, [debouncedSearchTerm, router, searchParams])
  
  return (
    <div className="w-full max-w-sm">
      <Input
        placeholder="Search customers..."
        onChange={(e) => setSearchTerm(e.target.value)}
        value={searchTerm}
        className="h-8 w-[150px] lg:w-[250px]"
      />
    </div>
  )
} 