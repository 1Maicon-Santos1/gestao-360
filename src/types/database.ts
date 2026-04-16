export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          default_currency: string
          timezone: string
          date_format: string
          theme: string
          system_name: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      companies: {
        Row: {
          id: string
          owner_id: string
          name: string
          trade_name: string | null
          document: string | null
          logo_url: string | null
          primary_color: string
          currency: string
          timezone: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['companies']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['companies']['Insert']>
      }
      financial_accounts: {
        Row: {
          id: string
          user_id: string
          company_id: string | null
          context_type: 'personal' | 'business'
          name: string
          account_type: 'checking' | 'savings' | 'cash' | 'digital' | 'investment' | 'other'
          institution: string | null
          initial_balance: number
          current_balance: number
          color: string
          icon: string | null
          is_active: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['financial_accounts']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['financial_accounts']['Insert']>
      }
      credit_cards: {
        Row: {
          id: string
          user_id: string
          company_id: string | null
          context_type: 'personal' | 'business'
          name: string
          institution: string | null
          credit_limit: number
          available_limit: number
          closing_day: number | null
          due_day: number | null
          best_purchase_day: number | null
          color: string
          icon: string | null
          is_active: boolean
          payment_account_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['credit_cards']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['credit_cards']['Insert']>
      }
      financial_categories: {
        Row: {
          id: string
          user_id: string
          name: string
          category_type: 'income' | 'expense'
          context_type: 'personal' | 'business' | 'both'
          color: string
          icon: string | null
          is_active: boolean
          is_fixed: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['financial_categories']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['financial_categories']['Insert']>
      }
      financial_subcategories: {
        Row: {
          id: string
          category_id: string
          user_id: string
          name: string
          color: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['financial_subcategories']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['financial_subcategories']['Insert']>
      }
      cost_centers: {
        Row: {
          id: string
          user_id: string
          company_id: string | null
          name: string
          description: string | null
          color: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['cost_centers']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['cost_centers']['Insert']>
      }
      people_responsible: {
        Row: {
          id: string
          user_id: string
          name: string
          person_type: 'partner' | 'employee' | 'family' | 'other'
          color: string
          avatar_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['people_responsible']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['people_responsible']['Insert']>
      }
      clients: {
        Row: {
          id: string
          user_id: string
          company_id: string | null
          name: string
          trade_name: string | null
          client_type: 'individual' | 'company'
          document: string | null
          phone: string | null
          email: string | null
          is_recurring: boolean
          default_amount: number | null
          due_day: number | null
          preferred_payment_method: string | null
          service_description: string | null
          origin: string | null
          status: 'active' | 'inactive'
          notes: string | null
          tags: string[] | null
          total_received: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['clients']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['clients']['Insert']>
      }
      suppliers: {
        Row: {
          id: string
          user_id: string
          company_id: string | null
          name: string
          document: string | null
          phone: string | null
          email: string | null
          status: 'active' | 'inactive'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['suppliers']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['suppliers']['Insert']>
      }
      financial_transactions: {
        Row: {
          id: string
          user_id: string
          company_id: string | null
          context_type: 'personal' | 'business'
          transaction_type: 'income' | 'expense' | 'transfer'
          status: 'pending' | 'paid' | 'received' | 'overdue' | 'cancelled'
          description: string
          amount: number
          competency_date: string
          settlement_date: string | null
          due_date: string | null
          account_id: string | null
          destination_account_id: string | null
          card_id: string | null
          category_id: string | null
          subcategory_id: string | null
          client_id: string | null
          supplier_id: string | null
          responsible_person_id: string | null
          cost_center_id: string | null
          recurring_rule_id: string | null
          installment_number: number | null
          installment_total: number | null
          payment_method: string | null
          notes: string | null
          tags: string[] | null
          attachment_count: number
          transfer_link_id: string | null
          is_deleted: boolean
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['financial_transactions']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['financial_transactions']['Insert']>
      }
      recurring_rules: {
        Row: {
          id: string
          user_id: string
          description: string
          amount: number
          transaction_type: 'income' | 'expense'
          context_type: 'personal' | 'business'
          frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'custom'
          custom_days: number | null
          start_date: string
          end_date: string | null
          account_id: string | null
          card_id: string | null
          category_id: string | null
          subcategory_id: string | null
          client_id: string | null
          supplier_id: string | null
          responsible_person_id: string | null
          cost_center_id: string | null
          payment_method: string | null
          notes: string | null
          tags: string[] | null
          is_active: boolean
          last_generated_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['recurring_rules']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['recurring_rules']['Insert']>
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Company = Database['public']['Tables']['companies']['Row']
export type FinancialAccount = Database['public']['Tables']['financial_accounts']['Row']
export type CreditCard = Database['public']['Tables']['credit_cards']['Row']
export type FinancialCategory = Database['public']['Tables']['financial_categories']['Row']
export type FinancialSubcategory = Database['public']['Tables']['financial_subcategories']['Row']
export type CostCenter = Database['public']['Tables']['cost_centers']['Row']
export type PersonResponsible = Database['public']['Tables']['people_responsible']['Row']
export type Client = Database['public']['Tables']['clients']['Row']
export type Supplier = Database['public']['Tables']['suppliers']['Row']
export type FinancialTransaction = Database['public']['Tables']['financial_transactions']['Row']
export type RecurringRule = Database['public']['Tables']['recurring_rules']['Row']
