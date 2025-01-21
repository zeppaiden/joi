"use client"

import { useCallback, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { useDebounce } from "@/hooks/use-debounce"

export function CustomerSearch() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  
  const handleSearch = useDebounce((term: string) => {
    const params = new URLSearchParams(searchParams.toString())
    
    if (term) {
      params.set("search", term)
    } else {
      params.delete("search")
    }
    
    // Reset to first page
    params.delete("page")
    
    startTransition(() => {
      router.push(`?${params.toString()}`)
    })
  }, 300)
  
  return (
    <div className="w-full max-w-sm">
      <Input
        placeholder="Search customers..."
        onChange={(e) => handleSearch(e.target.value)}
        defaultValue={searchParams.get("search") ?? ""}
        className="h-8 w-[150px] lg:w-[250px]"
      />
    </div>
  )
} 