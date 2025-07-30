export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admin_activity_log: {
        Row: {
          action_type: string
          admin_user_id: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown | null
          user_agent: string | null
        }
        Insert: {
          action_type: string
          admin_user_id: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
        }
        Update: {
          action_type?: string
          admin_user_id?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
        }
        Relationships: []
      }
      admin_approval_requests: {
        Row: {
          approved_by: string | null
          created_at: string
          entity_id: string
          entity_type: string
          expires_at: string
          id: string
          rejection_reason: string | null
          request_type: string
          requested_by: string
          requested_changes: Json
          status: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          expires_at?: string
          id?: string
          rejection_reason?: string | null
          request_type: string
          requested_by: string
          requested_changes: Json
          status?: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          expires_at?: string
          id?: string
          rejection_reason?: string | null
          request_type?: string
          requested_by?: string
          requested_changes?: Json
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string
          email: string
          granted_at: string
          granted_by: string | null
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_document_chunks: {
        Row: {
          chunk_index: number
          content: string
          content_hash: string
          created_at: string
          document_id: string
          embedding: string | null
          id: string
          metadata: Json | null
          organization_id: string
        }
        Insert: {
          chunk_index: number
          content: string
          content_hash: string
          created_at?: string
          document_id: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          organization_id: string
        }
        Update: {
          chunk_index?: number
          content?: string
          content_hash?: string
          created_at?: string
          document_id?: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "ai_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_document_versions: {
        Row: {
          change_reason: string | null
          created_at: string
          created_by: string
          document_id: string
          document_type: string
          domain: string | null
          file_name: string
          file_path: string
          file_size: number
          id: string
          metadata: Json | null
          mime_type: string
          organization_id: string
          tags: string | null
          title: string
          upload_notes: string | null
          version_number: number
        }
        Insert: {
          change_reason?: string | null
          created_at?: string
          created_by: string
          document_id: string
          document_type: string
          domain?: string | null
          file_name: string
          file_path: string
          file_size: number
          id?: string
          metadata?: Json | null
          mime_type: string
          organization_id: string
          tags?: string | null
          title: string
          upload_notes?: string | null
          version_number: number
        }
        Update: {
          change_reason?: string | null
          created_at?: string
          created_by?: string
          document_id?: string
          document_type?: string
          domain?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          metadata?: Json | null
          mime_type?: string
          organization_id?: string
          tags?: string | null
          title?: string
          upload_notes?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "ai_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_documents: {
        Row: {
          created_at: string
          document_type: string
          domain: string | null
          file_name: string
          file_path: string
          file_size: number
          id: string
          metadata: Json | null
          mime_type: string
          organization_id: string
          processed_at: string | null
          processing_status: string
          tags: string | null
          title: string | null
          total_chunks: number | null
          updated_at: string
          updated_by: string
          upload_notes: string | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          document_type: string
          domain?: string | null
          file_name: string
          file_path: string
          file_size: number
          id?: string
          metadata?: Json | null
          mime_type: string
          organization_id: string
          processed_at?: string | null
          processing_status?: string
          tags?: string | null
          title?: string | null
          total_chunks?: number | null
          updated_at?: string
          updated_by: string
          upload_notes?: string | null
          uploaded_by: string
        }
        Update: {
          created_at?: string
          document_type?: string
          domain?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          metadata?: Json | null
          mime_type?: string
          organization_id?: string
          processed_at?: string | null
          processing_status?: string
          tags?: string | null
          title?: string | null
          total_chunks?: number | null
          updated_at?: string
          updated_by?: string
          upload_notes?: string | null
          uploaded_by?: string
        }
        Relationships: []
      }
      ai_feedback_log: {
        Row: {
          created_at: string
          domain_id: string | null
          feedback_type: string
          id: string
          metadata: Json | null
          organization_id: string
          reason: string
          rejected_text: string
          replacement_text: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          domain_id?: string | null
          feedback_type: string
          id?: string
          metadata?: Json | null
          organization_id: string
          reason: string
          rejected_text: string
          replacement_text?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          domain_id?: string | null
          feedback_type?: string
          id?: string
          metadata?: Json | null
          organization_id?: string
          reason?: string
          rejected_text?: string
          replacement_text?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_upload_audit: {
        Row: {
          action: string
          created_at: string
          document_id: string | null
          id: string
          ip_address: unknown | null
          metadata: Json | null
          organization_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          document_id?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          organization_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          document_id?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          organization_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_upload_audit_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "ai_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_requests: {
        Row: {
          approver_id: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision: Database["public"]["Enums"]["approval_decision"]
          decision_reason: string | null
          entity_id: string
          entity_type: string
          id: string
          organization_id: string
          request_details: Json | null
          request_type: string
          requester_id: string
          updated_at: string
        }
        Insert: {
          approver_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision?: Database["public"]["Enums"]["approval_decision"]
          decision_reason?: string | null
          entity_id: string
          entity_type: string
          id?: string
          organization_id: string
          request_details?: Json | null
          request_type: string
          requester_id: string
          updated_at?: string
        }
        Update: {
          approver_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision?: Database["public"]["Enums"]["approval_decision"]
          decision_reason?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          organization_id?: string
          request_details?: Json | null
          request_type?: string
          requester_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      assessment_scores: {
        Row: {
          ai_confidence_score: number | null
          ai_suggested_level:
            | Database["public"]["Enums"]["maturity_level"]
            | null
          approved_at: string | null
          approved_by: string | null
          assessment_id: string
          created_at: string
          created_by: string
          criteria_id: string
          current_maturity_level:
            | Database["public"]["Enums"]["maturity_level"]
            | null
          evidence_completeness_score: number | null
          id: string
          organization_id: string
          overall_score: number | null
          status: Database["public"]["Enums"]["assessment_status"]
          target_maturity_level:
            | Database["public"]["Enums"]["maturity_level"]
            | null
          updated_at: string
          updated_by: string
        }
        Insert: {
          ai_confidence_score?: number | null
          ai_suggested_level?:
            | Database["public"]["Enums"]["maturity_level"]
            | null
          approved_at?: string | null
          approved_by?: string | null
          assessment_id: string
          created_at?: string
          created_by: string
          criteria_id: string
          current_maturity_level?:
            | Database["public"]["Enums"]["maturity_level"]
            | null
          evidence_completeness_score?: number | null
          id?: string
          organization_id: string
          overall_score?: number | null
          status?: Database["public"]["Enums"]["assessment_status"]
          target_maturity_level?:
            | Database["public"]["Enums"]["maturity_level"]
            | null
          updated_at?: string
          updated_by: string
        }
        Update: {
          ai_confidence_score?: number | null
          ai_suggested_level?:
            | Database["public"]["Enums"]["maturity_level"]
            | null
          approved_at?: string | null
          approved_by?: string | null
          assessment_id?: string
          created_at?: string
          created_by?: string
          criteria_id?: string
          current_maturity_level?:
            | Database["public"]["Enums"]["maturity_level"]
            | null
          evidence_completeness_score?: number | null
          id?: string
          organization_id?: string
          overall_score?: number | null
          status?: Database["public"]["Enums"]["assessment_status"]
          target_maturity_level?:
            | Database["public"]["Enums"]["maturity_level"]
            | null
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_scores_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_scores_criteria_id_fkey"
            columns: ["criteria_id"]
            isOneToOne: false
            referencedRelation: "criteria"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          ai_confidence_score: number | null
          ai_evaluation_result: Json | null
          ai_feedback_summary: string | null
          assessment_period_end: string | null
          assessment_period_start: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          organization_id: string
          overall_completion_percentage: number | null
          status: Database["public"]["Enums"]["assessment_status"]
          updated_at: string
          updated_by: string
          user_acceptance_status: string | null
        }
        Insert: {
          ai_confidence_score?: number | null
          ai_evaluation_result?: Json | null
          ai_feedback_summary?: string | null
          assessment_period_end?: string | null
          assessment_period_start?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
          overall_completion_percentage?: number | null
          status?: Database["public"]["Enums"]["assessment_status"]
          updated_at?: string
          updated_by: string
          user_acceptance_status?: string | null
        }
        Update: {
          ai_confidence_score?: number | null
          ai_evaluation_result?: Json | null
          ai_feedback_summary?: string | null
          assessment_period_end?: string | null
          assessment_period_start?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          overall_completion_percentage?: number | null
          status?: Database["public"]["Enums"]["assessment_status"]
          updated_at?: string
          updated_by?: string
          user_acceptance_status?: string | null
        }
        Relationships: []
      }
      audit_trail: {
        Row: {
          action: string
          change_reason: string | null
          changed_at: string
          changed_by: string
          field_name: string | null
          id: string
          ip_address: unknown | null
          new_value: string | null
          old_value: string | null
          organization_id: string
          record_id: string
          session_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          change_reason?: string | null
          changed_at?: string
          changed_by: string
          field_name?: string | null
          id?: string
          ip_address?: unknown | null
          new_value?: string | null
          old_value?: string | null
          organization_id: string
          record_id: string
          session_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          change_reason?: string | null
          changed_at?: string
          changed_by?: string
          field_name?: string | null
          id?: string
          ip_address?: unknown | null
          new_value?: string | null
          old_value?: string | null
          organization_id?: string
          record_id?: string
          session_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      auditor_assignments: {
        Row: {
          assessment_id: string
          assigned_at: string
          assigned_by: string
          auditor_id: string
          completion_date: string | null
          created_at: string
          id: string
          notes: string | null
          organization_id: string
          site_visit_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assessment_id: string
          assigned_at?: string
          assigned_by: string
          auditor_id: string
          completion_date?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          organization_id: string
          site_visit_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          assigned_at?: string
          assigned_by?: string
          auditor_id?: string
          completion_date?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string
          site_visit_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "auditor_assignments_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      criteria: {
        Row: {
          ai_suggested_statement: string | null
          ai_suggested_summary: string | null
          created_at: string
          created_by: string
          criteria_number: string
          deferral_status: string | null
          id: string
          mps_id: string
          organization_id: string
          statement: string
          statement_approved_at: string | null
          statement_approved_by: string | null
          status: Database["public"]["Enums"]["assessment_status"]
          summary: string | null
          updated_at: string
          updated_by: string
        }
        Insert: {
          ai_suggested_statement?: string | null
          ai_suggested_summary?: string | null
          created_at?: string
          created_by: string
          criteria_number: string
          deferral_status?: string | null
          id?: string
          mps_id: string
          organization_id: string
          statement: string
          statement_approved_at?: string | null
          statement_approved_by?: string | null
          status?: Database["public"]["Enums"]["assessment_status"]
          summary?: string | null
          updated_at?: string
          updated_by: string
        }
        Update: {
          ai_suggested_statement?: string | null
          ai_suggested_summary?: string | null
          created_at?: string
          created_by?: string
          criteria_number?: string
          deferral_status?: string | null
          id?: string
          mps_id?: string
          organization_id?: string
          statement?: string
          statement_approved_at?: string | null
          statement_approved_by?: string | null
          status?: Database["public"]["Enums"]["assessment_status"]
          summary?: string | null
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "criteria_mps_id_fkey"
            columns: ["mps_id"]
            isOneToOne: false
            referencedRelation: "maturity_practice_statements"
            referencedColumns: ["id"]
          },
        ]
      }
      criteria_deferrals: {
        Row: {
          approved: boolean
          created_at: string
          deferred_at: string
          id: string
          organization_id: string
          original_mps_id: string | null
          proposed_criteria_id: string
          reason: string | null
          suggested_domain: string
          suggested_mps_number: number
          suggested_mps_title: string | null
          user_id: string
        }
        Insert: {
          approved?: boolean
          created_at?: string
          deferred_at?: string
          id?: string
          organization_id: string
          original_mps_id?: string | null
          proposed_criteria_id: string
          reason?: string | null
          suggested_domain: string
          suggested_mps_number: number
          suggested_mps_title?: string | null
          user_id: string
        }
        Update: {
          approved?: boolean
          created_at?: string
          deferred_at?: string
          id?: string
          organization_id?: string
          original_mps_id?: string | null
          proposed_criteria_id?: string
          reason?: string | null
          suggested_domain?: string
          suggested_mps_number?: number
          suggested_mps_title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "criteria_deferrals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "criteria_deferrals_original_mps_id_fkey"
            columns: ["original_mps_id"]
            isOneToOne: false
            referencedRelation: "maturity_practice_statements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "criteria_deferrals_proposed_criteria_id_fkey"
            columns: ["proposed_criteria_id"]
            isOneToOne: false
            referencedRelation: "criteria"
            referencedColumns: ["id"]
          },
        ]
      }
      criteria_edit_history: {
        Row: {
          change_reason: string | null
          created_at: string
          criteria_id: string
          edited_at: string
          edited_by: string
          field_name: string
          id: string
          new_value: string | null
          old_value: string | null
          organization_id: string
        }
        Insert: {
          change_reason?: string | null
          created_at?: string
          criteria_id: string
          edited_at?: string
          edited_by: string
          field_name: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          organization_id: string
        }
        Update: {
          change_reason?: string | null
          created_at?: string
          criteria_id?: string
          edited_at?: string
          edited_by?: string
          field_name?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "criteria_edit_history_criteria_id_fkey"
            columns: ["criteria_id"]
            isOneToOne: false
            referencedRelation: "criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "criteria_edit_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      criteria_rejections: {
        Row: {
          created_at: string
          criteria_id: string
          id: string
          organization_id: string
          rejected_at: string
          rejected_by: string
          rejection_reason: string | null
        }
        Insert: {
          created_at?: string
          criteria_id: string
          id?: string
          organization_id: string
          rejected_at?: string
          rejected_by: string
          rejection_reason?: string | null
        }
        Update: {
          created_at?: string
          criteria_id?: string
          id?: string
          organization_id?: string
          rejected_at?: string
          rejected_by?: string
          rejection_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "criteria_rejections_criteria_id_fkey"
            columns: ["criteria_id"]
            isOneToOne: false
            referencedRelation: "criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "criteria_rejections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_codes: {
        Row: {
          applicable_modules: string[] | null
          code: string
          created_at: string
          created_by: string
          current_usage: number
          expiry_date: string | null
          id: string
          status: string
          type: string
          updated_at: string
          updated_by: string
          usage_limit: number | null
          value: number
        }
        Insert: {
          applicable_modules?: string[] | null
          code: string
          created_at?: string
          created_by: string
          current_usage?: number
          expiry_date?: string | null
          id?: string
          status?: string
          type: string
          updated_at?: string
          updated_by: string
          usage_limit?: number | null
          value: number
        }
        Update: {
          applicable_modules?: string[] | null
          code?: string
          created_at?: string
          created_by?: string
          current_usage?: number
          expiry_date?: string | null
          id?: string
          status?: string
          type?: string
          updated_at?: string
          updated_by?: string
          usage_limit?: number | null
          value?: number
        }
        Relationships: []
      }
      domains: {
        Row: {
          ai_suggested_intent: string | null
          created_at: string
          created_by: string
          display_order: number
          id: string
          intent_approved_at: string | null
          intent_approved_by: string | null
          intent_statement: string | null
          name: string
          order_index: number | null
          organization_id: string
          status: Database["public"]["Enums"]["assessment_status"]
          updated_at: string
          updated_by: string
        }
        Insert: {
          ai_suggested_intent?: string | null
          created_at?: string
          created_by: string
          display_order?: number
          id?: string
          intent_approved_at?: string | null
          intent_approved_by?: string | null
          intent_statement?: string | null
          name: string
          order_index?: number | null
          organization_id: string
          status?: Database["public"]["Enums"]["assessment_status"]
          updated_at?: string
          updated_by: string
        }
        Update: {
          ai_suggested_intent?: string | null
          created_at?: string
          created_by?: string
          display_order?: number
          id?: string
          intent_approved_at?: string | null
          intent_approved_by?: string | null
          intent_statement?: string | null
          name?: string
          order_index?: number | null
          organization_id?: string
          status?: Database["public"]["Enums"]["assessment_status"]
          updated_at?: string
          updated_by?: string
        }
        Relationships: []
      }
      evidence: {
        Row: {
          ai_compliance_score: number | null
          ai_suggested_findings: string | null
          ai_suggested_recommendations: string | null
          assessment_id: string
          compliance_score: number | null
          created_at: string
          created_by: string
          criteria_id: string
          description: string | null
          evidence_type: Database["public"]["Enums"]["evidence_type"]
          file_name: string | null
          file_path: string | null
          file_size: number | null
          findings: string | null
          findings_approved_at: string | null
          findings_approved_by: string | null
          id: string
          mime_type: string | null
          organization_id: string
          recommendations: string | null
          status: Database["public"]["Enums"]["assessment_status"]
          title: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          ai_compliance_score?: number | null
          ai_suggested_findings?: string | null
          ai_suggested_recommendations?: string | null
          assessment_id: string
          compliance_score?: number | null
          created_at?: string
          created_by: string
          criteria_id: string
          description?: string | null
          evidence_type: Database["public"]["Enums"]["evidence_type"]
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          findings?: string | null
          findings_approved_at?: string | null
          findings_approved_by?: string | null
          id?: string
          mime_type?: string | null
          organization_id: string
          recommendations?: string | null
          status?: Database["public"]["Enums"]["assessment_status"]
          title: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          ai_compliance_score?: number | null
          ai_suggested_findings?: string | null
          ai_suggested_recommendations?: string | null
          assessment_id?: string
          compliance_score?: number | null
          created_at?: string
          created_by?: string
          criteria_id?: string
          description?: string | null
          evidence_type?: Database["public"]["Enums"]["evidence_type"]
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          findings?: string | null
          findings_approved_at?: string | null
          findings_approved_by?: string | null
          id?: string
          mime_type?: string | null
          organization_id?: string
          recommendations?: string | null
          status?: Database["public"]["Enums"]["assessment_status"]
          title?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_criteria_id_fkey"
            columns: ["criteria_id"]
            isOneToOne: false
            referencedRelation: "criteria"
            referencedColumns: ["id"]
          },
        ]
      }
      external_insights: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          industry_tags: string[] | null
          is_verified: boolean
          matched_orgs: string[] | null
          published_at: string | null
          region_tags: string[] | null
          retrieved_at: string
          risk_level: Database["public"]["Enums"]["risk_level"] | null
          source_type: Database["public"]["Enums"]["source_type"]
          source_url: string | null
          summary: string | null
          threat_tags: string[] | null
          title: string
          updated_at: string
          updated_by: string | null
          visibility_scope: Database["public"]["Enums"]["visibility_scope"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          industry_tags?: string[] | null
          is_verified?: boolean
          matched_orgs?: string[] | null
          published_at?: string | null
          region_tags?: string[] | null
          retrieved_at?: string
          risk_level?: Database["public"]["Enums"]["risk_level"] | null
          source_type?: Database["public"]["Enums"]["source_type"]
          source_url?: string | null
          summary?: string | null
          threat_tags?: string[] | null
          title: string
          updated_at?: string
          updated_by?: string | null
          visibility_scope?: Database["public"]["Enums"]["visibility_scope"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          industry_tags?: string[] | null
          is_verified?: boolean
          matched_orgs?: string[] | null
          published_at?: string | null
          region_tags?: string[] | null
          retrieved_at?: string
          risk_level?: Database["public"]["Enums"]["risk_level"] | null
          source_type?: Database["public"]["Enums"]["source_type"]
          source_url?: string | null
          summary?: string | null
          threat_tags?: string[] | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          visibility_scope?: Database["public"]["Enums"]["visibility_scope"]
        }
        Relationships: []
      }
      maturity_levels: {
        Row: {
          ai_suggested_descriptor: string | null
          created_at: string
          created_by: string
          criteria_id: string
          descriptor: string
          descriptor_approved_at: string | null
          descriptor_approved_by: string | null
          id: string
          level: Database["public"]["Enums"]["maturity_level"]
          organization_id: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          ai_suggested_descriptor?: string | null
          created_at?: string
          created_by: string
          criteria_id: string
          descriptor: string
          descriptor_approved_at?: string | null
          descriptor_approved_by?: string | null
          id?: string
          level: Database["public"]["Enums"]["maturity_level"]
          organization_id: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          ai_suggested_descriptor?: string | null
          created_at?: string
          created_by?: string
          criteria_id?: string
          descriptor?: string
          descriptor_approved_at?: string | null
          descriptor_approved_by?: string | null
          id?: string
          level?: Database["public"]["Enums"]["maturity_level"]
          organization_id?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "maturity_levels_criteria_id_fkey"
            columns: ["criteria_id"]
            isOneToOne: false
            referencedRelation: "criteria"
            referencedColumns: ["id"]
          },
        ]
      }
      maturity_practice_statements: {
        Row: {
          ai_suggested_intent: string | null
          created_at: string
          created_by: string
          domain_id: string
          id: string
          intent_approved_at: string | null
          intent_approved_by: string | null
          intent_statement: string | null
          mps_number: number
          name: string
          organization_id: string
          status: Database["public"]["Enums"]["assessment_status"]
          summary: string | null
          updated_at: string
          updated_by: string
        }
        Insert: {
          ai_suggested_intent?: string | null
          created_at?: string
          created_by: string
          domain_id: string
          id?: string
          intent_approved_at?: string | null
          intent_approved_by?: string | null
          intent_statement?: string | null
          mps_number: number
          name: string
          organization_id: string
          status?: Database["public"]["Enums"]["assessment_status"]
          summary?: string | null
          updated_at?: string
          updated_by: string
        }
        Update: {
          ai_suggested_intent?: string | null
          created_at?: string
          created_by?: string
          domain_id?: string
          id?: string
          intent_approved_at?: string | null
          intent_approved_by?: string | null
          intent_statement?: string | null
          mps_number?: number
          name?: string
          organization_id?: string
          status?: Database["public"]["Enums"]["assessment_status"]
          summary?: string | null
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "maturity_practice_statements_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
        ]
      }
      milestone_status_history: {
        Row: {
          change_reason: string | null
          changed_at: string
          changed_by: string
          entity_id: string
          entity_type: string
          id: string
          new_status: Database["public"]["Enums"]["milestone_status"]
          old_status: Database["public"]["Enums"]["milestone_status"] | null
          organization_id: string
        }
        Insert: {
          change_reason?: string | null
          changed_at?: string
          changed_by: string
          entity_id: string
          entity_type: string
          id?: string
          new_status: Database["public"]["Enums"]["milestone_status"]
          old_status?: Database["public"]["Enums"]["milestone_status"] | null
          organization_id: string
        }
        Update: {
          change_reason?: string | null
          changed_at?: string
          changed_by?: string
          entity_id?: string
          entity_type?: string
          id?: string
          new_status?: Database["public"]["Enums"]["milestone_status"]
          old_status?: Database["public"]["Enums"]["milestone_status"] | null
          organization_id?: string
        }
        Relationships: []
      }
      milestone_tasks: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          display_order: number
          id: string
          milestone_id: string
          name: string
          organization_id: string
          status: Database["public"]["Enums"]["milestone_status"]
          updated_at: string
          updated_by: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          display_order?: number
          id?: string
          milestone_id: string
          name: string
          organization_id: string
          status?: Database["public"]["Enums"]["milestone_status"]
          updated_at?: string
          updated_by: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          display_order?: number
          id?: string
          milestone_id?: string
          name?: string
          organization_id?: string
          status?: Database["public"]["Enums"]["milestone_status"]
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestone_tasks_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      milestone_test_notes: {
        Row: {
          created_at: string
          created_by: string
          id: string
          milestone_task_id: string
          note_content: string
          organization_id: string
          status_at_time: Database["public"]["Enums"]["milestone_status"]
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          milestone_task_id: string
          note_content: string
          organization_id: string
          status_at_time: Database["public"]["Enums"]["milestone_status"]
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          milestone_task_id?: string
          note_content?: string
          organization_id?: string
          status_at_time?: Database["public"]["Enums"]["milestone_status"]
        }
        Relationships: [
          {
            foreignKeyName: "milestone_test_notes_milestone_task_id_fkey"
            columns: ["milestone_task_id"]
            isOneToOne: false
            referencedRelation: "milestone_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          display_order: number
          id: string
          name: string
          organization_id: string
          phase: string | null
          priority: Database["public"]["Enums"]["milestone_priority"]
          status: Database["public"]["Enums"]["milestone_status"]
          updated_at: string
          updated_by: string
          week: number | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          display_order?: number
          id?: string
          name: string
          organization_id: string
          phase?: string | null
          priority?: Database["public"]["Enums"]["milestone_priority"]
          status?: Database["public"]["Enums"]["milestone_status"]
          updated_at?: string
          updated_by: string
          week?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          display_order?: number
          id?: string
          name?: string
          organization_id?: string
          phase?: string | null
          priority?: Database["public"]["Enums"]["milestone_priority"]
          status?: Database["public"]["Enums"]["milestone_status"]
          updated_at?: string
          updated_by?: string
          week?: number | null
        }
        Relationships: []
      }
      organization_invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invitation_token: string
          invited_by: string
          organization_id: string
          role: string
          status: Database["public"]["Enums"]["invitation_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invitation_token?: string
          invited_by: string
          organization_id: string
          role: string
          status?: Database["public"]["Enums"]["invitation_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invitation_token?: string
          invited_by?: string
          organization_id?: string
          role?: string
          status?: Database["public"]["Enums"]["invitation_status"]
          updated_at?: string
        }
        Relationships: []
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          compliance_commitments: string[] | null
          created_at: string
          created_by: string
          custom_industry: string | null
          description: string | null
          email_webhook_url: string | null
          id: string
          industry_tags: string[] | null
          linked_domains: string[] | null
          logo_url: string | null
          name: string
          organization_type: string | null
          owner_id: string
          primary_color: string | null
          primary_website_url: string | null
          region_operating: string | null
          risk_concerns: string[] | null
          secondary_color: string | null
          slack_webhook_url: string | null
          text_color: string | null
          threat_sensitivity_level:
            | Database["public"]["Enums"]["threat_sensitivity_level"]
            | null
          updated_at: string
          updated_by: string
          zapier_webhook_url: string | null
        }
        Insert: {
          compliance_commitments?: string[] | null
          created_at?: string
          created_by?: string
          custom_industry?: string | null
          description?: string | null
          email_webhook_url?: string | null
          id?: string
          industry_tags?: string[] | null
          linked_domains?: string[] | null
          logo_url?: string | null
          name: string
          organization_type?: string | null
          owner_id?: string
          primary_color?: string | null
          primary_website_url?: string | null
          region_operating?: string | null
          risk_concerns?: string[] | null
          secondary_color?: string | null
          slack_webhook_url?: string | null
          text_color?: string | null
          threat_sensitivity_level?:
            | Database["public"]["Enums"]["threat_sensitivity_level"]
            | null
          updated_at?: string
          updated_by?: string
          zapier_webhook_url?: string | null
        }
        Update: {
          compliance_commitments?: string[] | null
          created_at?: string
          created_by?: string
          custom_industry?: string | null
          description?: string | null
          email_webhook_url?: string | null
          id?: string
          industry_tags?: string[] | null
          linked_domains?: string[] | null
          logo_url?: string | null
          name?: string
          organization_type?: string | null
          owner_id?: string
          primary_color?: string | null
          primary_website_url?: string | null
          region_operating?: string | null
          risk_concerns?: string[] | null
          secondary_color?: string | null
          slack_webhook_url?: string | null
          text_color?: string | null
          threat_sensitivity_level?:
            | Database["public"]["Enums"]["threat_sensitivity_level"]
            | null
          updated_at?: string
          updated_by?: string
          zapier_webhook_url?: string | null
        }
        Relationships: []
      }
      override_approvals: {
        Row: {
          approved_at: string
          approved_by: string
          audit_notes: string | null
          created_at: string
          entity_id: string
          entity_type: string
          evidence_completeness_score: number
          id: string
          organization_id: string
          override_reason: string
        }
        Insert: {
          approved_at?: string
          approved_by: string
          audit_notes?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          evidence_completeness_score: number
          id?: string
          organization_id: string
          override_reason: string
        }
        Update: {
          approved_at?: string
          approved_by?: string
          audit_notes?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          evidence_completeness_score?: number
          id?: string
          organization_id?: string
          override_reason?: string
        }
        Relationships: []
      }
      policy_change_log: {
        Row: {
          created_at: string
          domain_scope: string
          id: string
          linked_document_id: string | null
          logged_by: string
          metadata: Json | null
          organization_id: string | null
          summary: string
          tags: string[] | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          domain_scope: string
          id?: string
          linked_document_id?: string | null
          logged_by: string
          metadata?: Json | null
          organization_id?: string | null
          summary: string
          tags?: string[] | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          domain_scope?: string
          id?: string
          linked_document_id?: string | null
          logged_by?: string
          metadata?: Json | null
          organization_id?: string | null
          summary?: string
          tags?: string[] | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_change_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      qa_test_log: {
        Row: {
          created_at: string | null
          criteria_generated: number | null
          drift_detected: boolean | null
          id: string
          mps_number: number
          mps_title: string
          notes: string | null
          organization_id: string
          result: string
          run_at: string | null
          test_type: string
        }
        Insert: {
          created_at?: string | null
          criteria_generated?: number | null
          drift_detected?: boolean | null
          id?: string
          mps_number: number
          mps_title: string
          notes?: string | null
          organization_id: string
          result: string
          run_at?: string | null
          test_type: string
        }
        Update: {
          created_at?: string | null
          criteria_generated?: number | null
          drift_detected?: boolean | null
          id?: string
          mps_number?: number
          mps_title?: string
          notes?: string | null
          organization_id?: string
          result?: string
          run_at?: string | null
          test_type?: string
        }
        Relationships: []
      }
      security_configuration: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          setting_name: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          setting_name: string
          setting_value: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          setting_name?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      security_exceptions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          description: string
          exception_type: string
          id: string
          rationale: string
          review_date: string | null
          status: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          description: string
          exception_type: string
          id?: string
          rationale: string
          review_date?: string | null
          status?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          description?: string
          exception_type?: string
          id?: string
          rationale?: string
          review_date?: string | null
          status?: string | null
        }
        Relationships: []
      }
      security_monitoring: {
        Row: {
          id: string
          metadata: Json | null
          metric_type: string
          metric_value: number
          organization_id: string | null
          recorded_at: string
        }
        Insert: {
          id?: string
          metadata?: Json | null
          metric_type: string
          metric_value?: number
          organization_id?: string | null
          recorded_at?: string
        }
        Update: {
          id?: string
          metadata?: Json | null
          metric_type?: string
          metric_value?: number
          organization_id?: string | null
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_monitoring_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      security_rate_limits: {
        Row: {
          attempt_count: number
          blocked_until: string | null
          created_at: string
          id: string
          operation_type: string
          user_id: string
          window_start: string
        }
        Insert: {
          attempt_count?: number
          blocked_until?: string | null
          created_at?: string
          id?: string
          operation_type: string
          user_id: string
          window_start?: string
        }
        Update: {
          attempt_count?: number
          blocked_until?: string | null
          created_at?: string
          id?: string
          operation_type?: string
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      subscription_modules: {
        Row: {
          bundle_discount_percentage: number
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          monthly_price: number
          name: string
          slug: string
          updated_at: string
          updated_by: string
          yearly_discount_percentage: number
        }
        Insert: {
          bundle_discount_percentage?: number
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          monthly_price: number
          name: string
          slug: string
          updated_at?: string
          updated_by: string
          yearly_discount_percentage?: number
        }
        Update: {
          bundle_discount_percentage?: number
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          monthly_price?: number
          name?: string
          slug?: string
          updated_at?: string
          updated_by?: string
          yearly_discount_percentage?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation: {
        Args: { invitation_token_param: string }
        Returns: Json
      }
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      calculate_assessment_progress: {
        Args: { assessment_uuid: string }
        Returns: {
          total_criteria: number
          completed_criteria: number
          completion_percentage: number
        }[]
      }
      expire_approval_requests: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_security_setting: {
        Args: { setting_name_param: string }
        Returns: Json
      }
      get_user_primary_organization: {
        Args: { user_uuid?: string }
        Returns: string
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      is_primary_organization: {
        Args: { org_uuid: string }
        Returns: boolean
      }
      is_user_admin: {
        Args: { user_uuid?: string }
        Returns: boolean
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: unknown
      }
      log_policy_change: {
        Args: {
          title_param: string
          type_param: string
          domain_scope_param: string
          summary_param: string
          linked_document_id_param?: string
          tags_param?: string[]
          logged_by_param?: string
          organization_id_param?: string
          metadata_param?: Json
        }
        Returns: string
      }
      log_security_event: {
        Args: { event_type: string; details?: Json }
        Returns: undefined
      }
      log_security_metric: {
        Args: {
          metric_type_param: string
          metric_value_param: number
          metadata_param?: Json
          organization_id_param?: string
        }
        Returns: undefined
      }
      reset_failed_document: {
        Args: { doc_id: string }
        Returns: boolean
      }
      reset_mps_documents_for_reprocessing: {
        Args: { target_organization_id: string }
        Returns: Json
      }
      reset_my_mps_documents: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      user_can_manage_org_invitations: {
        Args: { org_id: string }
        Returns: boolean
      }
      user_can_view_organization: {
        Args: { org_id: string }
        Returns: boolean
      }
      user_has_role: {
        Args: { user_uuid: string; required_role?: string }
        Returns: boolean
      }
      validate_admin_operation: {
        Args: { operation_type: string }
        Returns: boolean
      }
      validate_input_security: {
        Args: { input_text: string }
        Returns: boolean
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      approval_decision: "pending" | "approved" | "rejected" | "escalated"
      assessment_status:
        | "not_started"
        | "in_progress"
        | "ai_evaluated"
        | "submitted_for_approval"
        | "approved_locked"
        | "rejected"
        | "escalated"
        | "alternative_proposal"
      evidence_type: "document" | "photo" | "log" | "comment"
      invitation_status: "pending" | "accepted" | "expired" | "cancelled"
      maturity_level:
        | "basic"
        | "reactive"
        | "compliant"
        | "proactive"
        | "resilient"
      milestone_priority: "critical" | "high" | "medium" | "low"
      milestone_status:
        | "not_started"
        | "in_progress"
        | "ready_for_test"
        | "signed_off"
        | "failed"
        | "rejected"
        | "escalated"
        | "alternative_proposal"
      risk_level: "Low" | "Medium" | "High"
      source_type: "RSS" | "API" | "Manual"
      threat_sensitivity_level: "Basic" | "Moderate" | "Advanced"
      visibility_scope: "global" | "region" | "industry-specific" | "private"
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
  public: {
    Enums: {
      approval_decision: ["pending", "approved", "rejected", "escalated"],
      assessment_status: [
        "not_started",
        "in_progress",
        "ai_evaluated",
        "submitted_for_approval",
        "approved_locked",
        "rejected",
        "escalated",
        "alternative_proposal",
      ],
      evidence_type: ["document", "photo", "log", "comment"],
      invitation_status: ["pending", "accepted", "expired", "cancelled"],
      maturity_level: [
        "basic",
        "reactive",
        "compliant",
        "proactive",
        "resilient",
      ],
      milestone_priority: ["critical", "high", "medium", "low"],
      milestone_status: [
        "not_started",
        "in_progress",
        "ready_for_test",
        "signed_off",
        "failed",
        "rejected",
        "escalated",
        "alternative_proposal",
      ],
      risk_level: ["Low", "Medium", "High"],
      source_type: ["RSS", "API", "Manual"],
      threat_sensitivity_level: ["Basic", "Moderate", "Advanced"],
      visibility_scope: ["global", "region", "industry-specific", "private"],
    },
  },
} as const
