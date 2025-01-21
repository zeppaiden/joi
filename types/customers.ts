import { Database } from "./supabase"

// Base user type from Supabase
export type UserRow = Database["public"]["Tables"]["users"]["Row"]

// Customer specific type
export type Customer = UserRow

// View specific types for the data table
export type CustomerTableItem = Customer

// Table sorting options
export type SortField = "email" | "created_at" | "updated_at"
export type SortOrder = "asc" | "desc"

// Table filter/search params
export interface CustomerTableParams {
  page: number
  perPage: number
  sortField?: SortField
  sortOrder?: SortOrder
  search?: string
}

// Server response type
export interface CustomerTableResponse {
  data: CustomerTableItem[]
  total: number
  page: number
  perPage: number
} 