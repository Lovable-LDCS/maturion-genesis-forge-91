export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
          updated_at: string
          owner_id: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
          owner_id: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_owner_id_fkey"
            columns: ["owner_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      branches: {
        Row: {
          id: string
          name: string
          description: string | null
          organization_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          organization_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          organization_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_organization_id_fkey"
            columns: ["organization_id"]
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_organization_roles: {
        Row: {
          id: string
          user_id: string
          organization_id: string
          role: 'owner' | 'admin' | 'assessor' | 'viewer'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          organization_id: string
          role: 'owner' | 'admin' | 'assessor' | 'viewer'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          organization_id?: string
          role?: 'owner' | 'admin' | 'assessor' | 'viewer'
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_organization_roles_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_organization_roles_organization_id_fkey"
            columns: ["organization_id"]
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      domains: {
        Row: {
          id: string
          name: string
          description: string | null
          intent: string | null
          organization_id: string
          order_index: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          intent?: string | null
          organization_id: string
          order_index: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          intent?: string | null
          organization_id?: string
          order_index?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "domains_organization_id_fkey"
            columns: ["organization_id"]
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      maturity_practice_statements: {
        Row: {
          id: string
          name: string
          description: string | null
          domain_id: string
          order_index: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          domain_id: string
          order_index: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          domain_id?: string
          order_index?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maturity_practice_statements_domain_id_fkey"
            columns: ["domain_id"]
            referencedRelation: "domains"
            referencedColumns: ["id"]
          }
        ]
      }
      criteria: {
        Row: {
          id: string
          statement: string
          mps_id: string
          order_index: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          statement: string
          mps_id: string
          order_index: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          statement?: string
          mps_id?: string
          order_index?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "criteria_mps_id_fkey"
            columns: ["mps_id"]
            referencedRelation: "maturity_practice_statements"
            referencedColumns: ["id"]
          }
        ]
      }
      maturity_levels: {
        Row: {
          id: string
          level: number
          name: string
          description: string
          criteria_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          level: number
          name: string
          description: string
          criteria_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          level?: number
          name?: string
          description?: string
          criteria_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maturity_levels_criteria_id_fkey"
            columns: ["criteria_id"]
            referencedRelation: "criteria"
            referencedColumns: ["id"]
          }
        ]
      }
      assessments: {
        Row: {
          id: string
          name: string
          description: string | null
          organization_id: string
          branch_id: string | null
          status: 'draft' | 'in_progress' | 'completed' | 'reviewed'
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          organization_id: string
          branch_id?: string | null
          status?: 'draft' | 'in_progress' | 'completed' | 'reviewed'
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          organization_id?: string
          branch_id?: string | null
          status?: 'draft' | 'in_progress' | 'completed' | 'reviewed'
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_organization_id_fkey"
            columns: ["organization_id"]
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_branch_id_fkey"
            columns: ["branch_id"]
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      evidence: {
        Row: {
          id: string
          type: 'document' | 'photo' | 'log' | 'database_extract' | 'site_visit'
          file_url: string | null
          file_name: string | null
          file_size: number | null
          metadata: Json | null
          assessment_id: string
          criteria_id: string
          uploaded_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          type: 'document' | 'photo' | 'log' | 'database_extract' | 'site_visit'
          file_url?: string | null
          file_name?: string | null
          file_size?: number | null
          metadata?: Json | null
          assessment_id: string
          criteria_id: string
          uploaded_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          type?: 'document' | 'photo' | 'log' | 'database_extract' | 'site_visit'
          file_url?: string | null
          file_name?: string | null
          file_size?: number | null
          metadata?: Json | null
          assessment_id?: string
          criteria_id?: string
          uploaded_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_assessment_id_fkey"
            columns: ["assessment_id"]
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_criteria_id_fkey"
            columns: ["criteria_id"]
            referencedRelation: "criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_uploaded_by_fkey"
            columns: ["uploaded_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      assessment_scores: {
        Row: {
          id: string
          assessment_id: string
          criteria_id: string
          maturity_level: number
          score: number
          evidence_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          assessment_id: string
          criteria_id: string
          maturity_level: number
          score: number
          evidence_count: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          assessment_id?: string
          criteria_id?: string
          maturity_level?: number
          score?: number
          evidence_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_scores_assessment_id_fkey"
            columns: ["assessment_id"]
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_scores_criteria_id_fkey"
            columns: ["criteria_id"]
            referencedRelation: "criteria"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']