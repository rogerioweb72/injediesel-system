export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          ip: unknown
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          amount: number
          created_at: string
          id: string
          order_id: string | null
          paid: boolean
          seller_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          order_id?: string | null
          paid?: boolean
          seller_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          order_id?: string | null
          paid?: boolean
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          address: Json | null
          cnpj: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: Json | null
          cnpj?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: Json | null
          cnpj?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          document: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          origin: string | null
          phone: string | null
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          document?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          origin?: string | null
          phone?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          document?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          origin?: string | null
          phone?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "franchise_units"
            referencedColumns: ["id"]
          },
        ]
      }
      ecu_catalog: {
        Row: {
          ano: string | null
          aparelho: string | null
          arquivo_origem: string | null
          ativo: boolean
          ativo_ecommerce: boolean
          cabo: string | null
          categoria: string
          categoria_slug: string
          created_at: string | null
          cv_original: number | null
          cv_tuned: number | null
          foto_url: string | null
          ganho: string | null
          id: string
          kgfm_original: number | null
          kgfm_tuned: number | null
          marca: string | null
          modelo_descricao: string | null
          observacoes: string | null
          preco_cliente_final: number | null
          preco_franqueado: number | null
          protocolo: string | null
          secao_original: string | null
          tipo_registro: string | null
          updated_at: string | null
        }
        Insert: {
          ano?: string | null
          aparelho?: string | null
          arquivo_origem?: string | null
          ativo?: boolean
          ativo_ecommerce?: boolean
          cabo?: string | null
          categoria: string
          categoria_slug: string
          created_at?: string | null
          cv_original?: number | null
          cv_tuned?: number | null
          foto_url?: string | null
          ganho?: string | null
          id?: string
          kgfm_original?: number | null
          kgfm_tuned?: number | null
          marca?: string | null
          modelo_descricao?: string | null
          observacoes?: string | null
          preco_cliente_final?: number | null
          preco_franqueado?: number | null
          protocolo?: string | null
          secao_original?: string | null
          tipo_registro?: string | null
          updated_at?: string | null
        }
        Update: {
          ano?: string | null
          aparelho?: string | null
          arquivo_origem?: string | null
          ativo?: boolean
          ativo_ecommerce?: boolean
          cabo?: string | null
          categoria?: string
          categoria_slug?: string
          created_at?: string | null
          cv_original?: number | null
          cv_tuned?: number | null
          foto_url?: string | null
          ganho?: string | null
          id?: string
          kgfm_original?: number | null
          kgfm_tuned?: number | null
          marca?: string | null
          modelo_descricao?: string | null
          observacoes?: string | null
          preco_cliente_final?: number | null
          preco_franqueado?: number | null
          protocolo?: string | null
          secao_original?: string | null
          tipo_registro?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ecu_categories: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          label: string
          ordem: number
          slug: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          label: string
          ordem?: number
          slug: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          label?: string
          ordem?: number
          slug?: string
        }
        Relationships: []
      }
      ecu_job_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          id: string
          job_id: string
          payload: Json
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          job_id: string
          payload?: Json
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          job_id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "ecu_job_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecu_job_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "ecu_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      ecu_job_files: {
        Row: {
          created_at: string
          file_name: string
          file_type: string
          id: string
          job_id: string
          mime_type: string
          r2_key: string
          size_bytes: number
        }
        Insert: {
          created_at?: string
          file_name: string
          file_type: string
          id?: string
          job_id: string
          mime_type: string
          r2_key: string
          size_bytes: number
        }
        Update: {
          created_at?: string
          file_name?: string
          file_type?: string
          id?: string
          job_id?: string
          mime_type?: string
          r2_key?: string
          size_bytes?: number
        }
        Relationships: [
          {
            foreignKeyName: "ecu_job_files_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "ecu_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      ecu_jobs: {
        Row: {
          amount_charged_by_matrix: number | null
          amount_charged_to_customer: number | null
          assigned_to: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          due_at: string | null
          franchise_margin_amount: number | null
          franchise_margin_percentage: number | null
          id: string
          priority: Database["public"]["Enums"]["priority_level"]
          problem_description: string | null
          service_tags: string[] | null
          service_type: string
          status: Database["public"]["Enums"]["file_status"]
          unit_id: string | null
          updated_at: string
          vehicle_id: string | null
          vehicle_info: Json | null
        }
        Insert: {
          amount_charged_by_matrix?: number | null
          amount_charged_to_customer?: number | null
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          due_at?: string | null
          franchise_margin_amount?: number | null
          franchise_margin_percentage?: number | null
          id?: string
          priority?: Database["public"]["Enums"]["priority_level"]
          problem_description?: string | null
          service_tags?: string[] | null
          service_type: string
          status?: Database["public"]["Enums"]["file_status"]
          unit_id?: string | null
          updated_at?: string
          vehicle_id?: string | null
          vehicle_info?: Json | null
        }
        Update: {
          amount_charged_by_matrix?: number | null
          amount_charged_to_customer?: number | null
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          due_at?: string | null
          franchise_margin_amount?: number | null
          franchise_margin_percentage?: number | null
          id?: string
          priority?: Database["public"]["Enums"]["priority_level"]
          problem_description?: string | null
          service_tags?: string[] | null
          service_type?: string
          status?: Database["public"]["Enums"]["file_status"]
          unit_id?: string | null
          updated_at?: string
          vehicle_id?: string | null
          vehicle_info?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ecu_jobs_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecu_jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecu_jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecu_jobs_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "franchise_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecu_jobs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_categories: {
        Row: {
          id: string
          name: string
          type: string
        }
        Insert: {
          id?: string
          name: string
          type: string
        }
        Update: {
          id?: string
          name?: string
          type?: string
        }
        Relationships: []
      }
      financial_entries: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          period_month: number
          period_year: number
          reference_id: string | null
          type: string
          unit_id: string | null
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          period_month: number
          period_year: number
          reference_id?: string | null
          type: string
          unit_id?: string | null
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          period_month?: number
          period_year?: number
          reference_id?: string | null
          type?: string
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_entries_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "franchise_units"
            referencedColumns: ["id"]
          },
        ]
      }
      franchise_levels: {
        Row: {
          contract_type: Database["public"]["Enums"]["contract_type"]
          description: string | null
          id: string
          price_tier: Database["public"]["Enums"]["price_tier"]
        }
        Insert: {
          contract_type: Database["public"]["Enums"]["contract_type"]
          description?: string | null
          id?: string
          price_tier: Database["public"]["Enums"]["price_tier"]
        }
        Update: {
          contract_type?: Database["public"]["Enums"]["contract_type"]
          description?: string | null
          id?: string
          price_tier?: Database["public"]["Enums"]["price_tier"]
        }
        Relationships: []
      }
      franchise_units: {
        Row: {
          active: boolean
          address: Json | null
          business_hours: string | null
          city: string | null
          cnpj: string | null
          commercial_email: string | null
          commercial_phone: string | null
          commission_rate: number
          contract_start_date: string | null
          contract_type: Database["public"]["Enums"]["contract_type"]
          created_at: string
          data_abertura: string | null
          deleted_at: string | null
          document: string | null
          email: string | null
          file_limit: number | null
          financial_status: string | null
          id: string
          inscricao_estadual: string | null
          main_technician: { name: string; contact: string } | null
          manager_id: string | null
          name: string
          phone: string | null
          plan: string | null
          razao_social: string | null
          state: string | null
        }
        Insert: {
          active?: boolean
          address?: Json | null
          business_hours?: string | null
          city?: string | null
          cnpj?: string | null
          commercial_email?: string | null
          commercial_phone?: string | null
          commission_rate?: number
          contract_start_date?: string | null
          contract_type: Database["public"]["Enums"]["contract_type"]
          created_at?: string
          data_abertura?: string | null
          deleted_at?: string | null
          document?: string | null
          email?: string | null
          file_limit?: number | null
          financial_status?: string | null
          id?: string
          inscricao_estadual?: string | null
          main_technician?: { name: string; contact: string } | null
          manager_id?: string | null
          name: string
          phone?: string | null
          plan?: string | null
          razao_social?: string | null
          state?: string | null
        }
        Update: {
          active?: boolean
          address?: Json | null
          business_hours?: string | null
          city?: string | null
          cnpj?: string | null
          commercial_email?: string | null
          commercial_phone?: string | null
          commission_rate?: number
          contract_start_date?: string | null
          contract_type?: Database["public"]["Enums"]["contract_type"]
          created_at?: string
          data_abertura?: string | null
          deleted_at?: string | null
          document?: string | null
          email?: string | null
          file_limit?: number | null
          financial_status?: string | null
          id?: string
          inscricao_estadual?: string | null
          main_technician?: { name: string; contact: string } | null
          manager_id?: string | null
          name?: string
          phone?: string | null
          plan?: string | null
          razao_social?: string | null
          state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "franchise_units_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      impersonation_sessions: {
        Row: {
          actor_id: string
          ended_at: string | null
          id: string
          reason: string | null
          started_at: string
          target_id: string
        }
        Insert: {
          actor_id: string
          ended_at?: string | null
          id?: string
          reason?: string | null
          started_at?: string
          target_id: string
        }
        Update: {
          actor_id?: string
          ended_at?: string | null
          id?: string
          reason?: string | null
          started_at?: string
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "impersonation_sessions_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impersonation_sessions_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_closings: {
        Row: {
          closed: boolean
          closed_at: string | null
          closed_by: string | null
          id: string
          month: number
          unit_id: string | null
          year: number
        }
        Insert: {
          closed?: boolean
          closed_at?: string | null
          closed_by?: string | null
          id?: string
          month: number
          unit_id?: string | null
          year: number
        }
        Update: {
          closed?: boolean
          closed_at?: string | null
          closed_by?: string | null
          id?: string
          month?: number
          unit_id?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_closings_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_closings_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "franchise_units"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          description: string
          id: string
          order_id: string
          product_id: string | null
          quantity: number
          total: number | null
          unit_price: number
        }
        Insert: {
          description: string
          id?: string
          order_id: string
          product_id?: string | null
          quantity?: number
          total?: number | null
          unit_price: number
        }
        Update: {
          description?: string
          id?: string
          order_id?: string
          product_id?: string | null
          quantity?: number
          total?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string | null
          id: string
          payment_status: string
          price_tier: Database["public"]["Enums"]["price_tier"]
          status: string
          total: number
          unit_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          payment_status?: string
          price_tier: Database["public"]["Enums"]["price_tier"]
          status?: string
          total?: number
          unit_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          payment_status?: string
          price_tier?: Database["public"]["Enums"]["price_tier"]
          status?: string
          total?: number
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "franchise_units"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_entries: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_edit: boolean
          can_view: boolean
          id: string
          module: string
          permission_profile_id: string
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          id?: string
          module: string
          permission_profile_id: string
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          id?: string
          module?: string
          permission_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permission_entries_permission_profile_id_fkey"
            columns: ["permission_profile_id"]
            isOneToOne: false
            referencedRelation: "permission_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_profiles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          scope: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          scope: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          scope?: string
        }
        Relationships: []
      }
      pos_sale_items: {
        Row: {
          description: string
          id: string
          product_id: string | null
          quantity: number
          sale_id: string
          total: number | null
          unit_price: number
        }
        Insert: {
          description: string
          id?: string
          product_id?: string | null
          quantity?: number
          sale_id: string
          total?: number | null
          unit_price: number
        }
        Update: {
          description?: string
          id?: string
          product_id?: string | null
          quantity?: number
          sale_id?: string
          total?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "pos_sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "pos_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_sales: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string | null
          id: string
          payment_method: string
          price_tier: Database["public"]["Enums"]["price_tier"]
          total: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          payment_method: string
          price_tier: Database["public"]["Enums"]["price_tier"]
          total: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          payment_method?: string
          price_tier?: Database["public"]["Enums"]["price_tier"]
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "pos_sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_prices: {
        Row: {
          id: string
          price: number
          product_id: string
          tier: Database["public"]["Enums"]["price_tier"]
          updated_at: string
        }
        Insert: {
          id?: string
          price: number
          product_id: string
          tier: Database["public"]["Enums"]["price_tier"]
          updated_at?: string
        }
        Update: {
          id?: string
          price?: number
          product_id?: string
          tier?: Database["public"]["Enums"]["price_tier"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          category: string
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          name: string
          sku: string | null
          stock: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          category: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          name: string
          sku?: string | null
          stock?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          name?: string
          sku?: string | null
          stock?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean
          address_number: string | null
          avatar_url: string | null
          birth_date: string | null
          cep: string | null
          city: string | null
          complement: string | null
          created_at: string
          id: string
          name: string
          neighborhood: string | null
          permission_profile_id: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          state: string | null
          street: string | null
          unit_id: string | null
        }
        Insert: {
          active?: boolean
          address_number?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          cep?: string | null
          city?: string | null
          complement?: string | null
          created_at?: string
          id: string
          name: string
          neighborhood?: string | null
          permission_profile_id?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          state?: string | null
          street?: string | null
          unit_id?: string | null
        }
        Update: {
          active?: boolean
          address_number?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          cep?: string | null
          city?: string | null
          complement?: string | null
          created_at?: string
          id?: string
          name?: string
          neighborhood?: string | null
          permission_profile_id?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          state?: string | null
          street?: string | null
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_permission_profile"
            columns: ["permission_profile_id"]
            isOneToOne: false
            referencedRelation: "permission_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "franchise_units"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          ticket_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          ticket_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          ecu_job_id: string | null
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          protocol: string
          sla_due_at: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          ecu_job_id?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          protocol: string
          sla_due_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          ecu_job_id?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          protocol?: string
          sla_due_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_ecu_job_id_fkey"
            columns: ["ecu_job_id"]
            isOneToOne: false
            referencedRelation: "ecu_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "franchise_units"
            referencedColumns: ["id"]
          },
        ]
      }
      user_unit_roles: {
        Row: {
          role: Database["public"]["Enums"]["user_role"]
          unit_id: string
          user_id: string
        }
        Insert: {
          role: Database["public"]["Enums"]["user_role"]
          unit_id: string
          user_id: string
        }
        Update: {
          role?: Database["public"]["Enums"]["user_role"]
          unit_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_unit_roles_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "franchise_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_unit_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          brand: string | null
          created_at: string
          customer_id: string
          deleted_at: string | null
          engine: string | null
          id: string
          model: string | null
          notes: string | null
          plate: string | null
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
          year: number | null
        }
        Insert: {
          brand?: string | null
          created_at?: string
          customer_id: string
          deleted_at?: string | null
          engine?: string | null
          id?: string
          model?: string | null
          notes?: string | null
          plate?: string | null
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
          year?: number | null
        }
        Update: {
          brand?: string | null
          created_at?: string
          customer_id?: string
          deleted_at?: string | null
          engine?: string | null
          id?: string
          model?: string | null
          notes?: string | null
          plate?: string | null
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      ecu_catalog_franqueado: {
        Row: {
          ano: string | null
          aparelho: string | null
          ativo: boolean | null
          ativo_ecommerce: boolean | null
          categoria: string | null
          categoria_slug: string | null
          created_at: string | null
          cv_original: number | null
          cv_tuned: number | null
          ganho: string | null
          id: string | null
          kgfm_original: number | null
          kgfm_tuned: number | null
          marca: string | null
          modelo_descricao: string | null
          observacoes: string | null
          preco_franqueado: number | null
          protocolo: string | null
          secao_original: string | null
          tipo_registro: string | null
          updated_at: string | null
        }
        Insert: {
          ano?: string | null
          aparelho?: string | null
          ativo?: boolean | null
          ativo_ecommerce?: boolean | null
          categoria?: string | null
          categoria_slug?: string | null
          created_at?: string | null
          cv_original?: number | null
          cv_tuned?: number | null
          ganho?: string | null
          id?: string | null
          kgfm_original?: number | null
          kgfm_tuned?: number | null
          marca?: string | null
          modelo_descricao?: string | null
          observacoes?: string | null
          preco_franqueado?: number | null
          protocolo?: string | null
          secao_original?: string | null
          tipo_registro?: string | null
          updated_at?: string | null
        }
        Update: {
          ano?: string | null
          aparelho?: string | null
          ativo?: boolean | null
          ativo_ecommerce?: boolean | null
          categoria?: string | null
          categoria_slug?: string | null
          created_at?: string | null
          cv_original?: number | null
          cv_tuned?: number | null
          ganho?: string | null
          id?: string | null
          kgfm_original?: number | null
          kgfm_tuned?: number | null
          marca?: string | null
          modelo_descricao?: string | null
          observacoes?: string | null
          preco_franqueado?: number | null
          protocolo?: string | null
          secao_original?: string | null
          tipo_registro?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ecu_catalog_public: {
        Row: {
          ano: string | null
          categoria: string | null
          categoria_slug: string | null
          cv_original: number | null
          cv_tuned: number | null
          ganho: string | null
          id: string | null
          kgfm_original: number | null
          kgfm_tuned: number | null
          marca: string | null
          modelo_descricao: string | null
          preco_cliente_final: number | null
          secao_original: string | null
        }
        Insert: {
          ano?: string | null
          categoria?: string | null
          categoria_slug?: string | null
          cv_original?: number | null
          cv_tuned?: number | null
          ganho?: string | null
          id?: string | null
          kgfm_original?: number | null
          kgfm_tuned?: number | null
          marca?: string | null
          modelo_descricao?: string | null
          preco_cliente_final?: number | null
          secao_original?: string | null
        }
        Update: {
          ano?: string | null
          categoria?: string | null
          categoria_slug?: string | null
          cv_original?: number | null
          cv_tuned?: number | null
          ganho?: string | null
          id?: string | null
          kgfm_original?: number | null
          kgfm_tuned?: number | null
          marca?: string | null
          modelo_descricao?: string | null
          preco_cliente_final?: number | null
          secao_original?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_franchise_admin_of: { Args: { p_unit_id: string }; Returns: boolean }
      is_matrix_admin: { Args: never; Returns: boolean }
      is_matrix_user: { Args: never; Returns: boolean }
      is_system_ti: { Args: never; Returns: boolean }
      my_unit_ids: { Args: never; Returns: string[] }
    }
    Enums: {
      contract_type: "full" | "linha_leve"
      file_status:
        | "recebido"
        | "em_triagem"
        | "em_processamento"
        | "aguardando_cliente"
        | "concluido"
        | "cancelado"
      price_tier: "franqueado_full" | "franqueado_linha_leve" | "cliente_final"
      priority_level: "normal" | "alta" | "critica"
      ticket_priority: "baixa" | "media" | "alta" | "critica"
      ticket_status:
        | "aberto"
        | "em_atendimento"
        | "aguardando_cliente"
        | "resolvido"
        | "fechado"
      user_role:
        | "system_ti"
        | "company_admin"
        | "operations_admin"
        | "finance_admin"
        | "support_agent"
        | "seller"
        | "franchise_manager"
        | "unit_operator"
        | "auditor"
      vehicle_type:
        | "automotivo"
        | "maquina_agricola"
        | "maquina_pesada"
        | "nautica"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      contract_type: ["full", "linha_leve"],
      file_status: [
        "recebido",
        "em_triagem",
        "em_processamento",
        "aguardando_cliente",
        "concluido",
        "cancelado",
      ],
      price_tier: ["franqueado_full", "franqueado_linha_leve", "cliente_final"],
      priority_level: ["normal", "alta", "critica"],
      ticket_priority: ["baixa", "media", "alta", "critica"],
      ticket_status: [
        "aberto",
        "em_atendimento",
        "aguardando_cliente",
        "resolvido",
        "fechado",
      ],
      user_role: [
        "system_ti",
        "company_admin",
        "operations_admin",
        "finance_admin",
        "support_agent",
        "seller",
        "franchise_manager",
        "unit_operator",
        "auditor",
      ],
      vehicle_type: [
        "automotivo",
        "maquina_agricola",
        "maquina_pesada",
        "nautica",
      ],
    },
  },
} as const

