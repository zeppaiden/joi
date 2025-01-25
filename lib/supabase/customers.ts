import { createClient } from "@/utils/supabase/server"
import { CustomerTableParams, CustomerTableResponse, Customer } from "@/types/customers"

export class CustomerError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CustomerError"
  }
}

export async function getCustomers(params: Partial<CustomerTableParams>): Promise<CustomerTableResponse> {
  try {
    const supabase = await createClient()
    
    // Get current user and their role
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) throw new CustomerError("Unauthorized")

    // Get user's role and organization
    const { data: currentUser, error: roleError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()
    
    if (roleError) throw new CustomerError("Failed to get user role")
    
    // If user is not an agent or admin, they shouldn't see any customers
    if (!currentUser || (currentUser.role !== "agent" && currentUser.role !== "admin")) {
      return {
        data: [],
        total: 0,
        page: Number(params.page) || 1,
        perPage: Number(params.perPage) || 10
      }
    }

    // Get user's organization
    const { data: orgMember } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .single()

    // If user is not part of any organization, return empty list
    if (!orgMember?.organization_id) {
      return {
        data: [],
        total: 0,
        page: Number(params.page) || 1,
        perPage: Number(params.perPage) || 10
      }
    }

    const page = Number(params.page) || 1
    const perPage = Number(params.perPage) || 10
    const sortField = params.sortField
    const sortOrder = params.sortOrder
    const search = params.search
    
    // Get customers who have tickets in the user's organization
    let query = supabase
      .from("users")
      .select("*, tickets!inner(*)", { count: "exact" })
      .eq("role", "customer")
      .eq("tickets.organization_id", orgMember.organization_id)
      .is("deleted_at", null)
    
    // Apply search if provided
    if (search) {
      query = query.ilike("email", `%${search}%`)
    }
    
    // Apply sorting
    if (sortField) {
      query = query.order(sortField, { ascending: sortOrder === "asc" })
    } else {
      query = query.order("created_at", { ascending: false })
    }
    
    // Apply pagination
    const from = (page - 1) * perPage
    query = query.range(from, from + perPage - 1)
    
    // Execute query
    const { data, error, count } = await query
    
    if (error) throw new CustomerError(error.message)
    if (!data || count === null) throw new CustomerError("Failed to fetch customers")
    
    // Remove the tickets data from the response
    const customers = data.map(({ tickets, ...customer }) => customer)
    
    return {
      data: customers,
      total: count,
      page,
      perPage
    }
  } catch (error) {
    console.error('Customer fetch error:', error)
    if (error instanceof CustomerError) {
      throw error
    }
    throw new CustomerError("Failed to fetch customers")
  }
}

export async function getCustomerById(id: string): Promise<Customer> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("role", "customer")
      .eq("id", id)
      .is("deleted_at", null)
      .single()
    
    if (error) throw new CustomerError(error.message)
    if (!data) throw new CustomerError("Customer not found")
    
    return data
  } catch (error) {
    if (error instanceof CustomerError) {
      throw error
    }
    throw new CustomerError("Failed to fetch customer")
  }
}

export async function getCustomerCount(): Promise<number> {
  try {
    const supabase = await createClient()
    
    const { count, error } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "customer")
      .is("deleted_at", null)
    
    if (error) throw new CustomerError(error.message)
    if (count === null) throw new CustomerError("Failed to count customers")
    
    return count
  } catch (error) {
    if (error instanceof CustomerError) {
      throw error
    }
    throw new CustomerError("Failed to count customers")
  }
} 