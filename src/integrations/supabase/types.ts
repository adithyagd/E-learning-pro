export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      academy_modules: {
        Row: {
          created_at: string
          description: string
          id: string
          learning_objectives: string[]
          module_number: number
          pass_mark: number
          requires_assessment: boolean
          sort_order: number
          status: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          learning_objectives?: string[]
          module_number: number
          pass_mark?: number
          requires_assessment?: boolean
          sort_order: number
          status?: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          learning_objectives?: string[]
          module_number?: number
          pass_mark?: number
          requires_assessment?: boolean
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      activity_logs: {
        Row: {
          action: Database["public"]["Enums"]["activity_action"]
          assessment_id: string | null
          created_at: string
          id: string
          lesson_id: string | null
          metadata: Json
          module_id: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          score: number | null
          status: string | null
          target_user_id: string | null
          user_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["activity_action"]
          assessment_id?: string | null
          created_at?: string
          id?: string
          lesson_id?: string | null
          metadata?: Json
          module_id?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          score?: number | null
          status?: string | null
          target_user_id?: string | null
          user_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["activity_action"]
          assessment_id?: string | null
          created_at?: string
          id?: string
          lesson_id?: string | null
          metadata?: Json
          module_id?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          score?: number | null
          status?: string | null
          target_user_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      assessment_attempt_questions: {
        Row: {
          answered_at: string | null
          attempt_id: string
          correct_option_ids: string[]
          difficulty: Database["public"]["Enums"]["question_difficulty"]
          explanation: string
          id: string
          is_correct: boolean | null
          objective_index: number
          options: Json
          position: number
          question_id: string
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          scenario_text: string | null
          selected_option_ids: string[]
          variant_group: string
          variant_number: number
        }
        Insert: {
          answered_at?: string | null
          attempt_id: string
          correct_option_ids: string[]
          difficulty: Database["public"]["Enums"]["question_difficulty"]
          explanation: string
          id?: string
          is_correct?: boolean | null
          objective_index: number
          options: Json
          position: number
          question_id: string
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          scenario_text?: string | null
          selected_option_ids?: string[]
          variant_group: string
          variant_number: number
        }
        Update: {
          answered_at?: string | null
          attempt_id?: string
          correct_option_ids?: string[]
          difficulty?: Database["public"]["Enums"]["question_difficulty"]
          explanation?: string
          id?: string
          is_correct?: boolean | null
          objective_index?: number
          options?: Json
          position?: number
          question_id?: string
          question_text?: string
          question_type?: Database["public"]["Enums"]["question_type"]
          scenario_text?: string | null
          selected_option_ids?: string[]
          variant_group?: string
          variant_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessment_attempt_questions_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "assessment_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_attempt_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "assessment_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_attempts: {
        Row: {
          attempt_number: number
          candidate_id: string
          config_id: string
          correct_count: number | null
          created_at: string
          current_position: number
          duration_seconds: number | null
          expires_at: string
          id: string
          module_id: string | null
          pass_mark: number
          passed: boolean | null
          question_count: number
          score_percent: number | null
          started_at: string
          status: Database["public"]["Enums"]["attempt_status"]
          submitted_at: string | null
          time_limit_seconds: number
          updated_at: string
        }
        Insert: {
          attempt_number: number
          candidate_id: string
          config_id: string
          correct_count?: number | null
          created_at?: string
          current_position?: number
          duration_seconds?: number | null
          expires_at: string
          id?: string
          module_id?: string | null
          pass_mark: number
          passed?: boolean | null
          question_count: number
          score_percent?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["attempt_status"]
          submitted_at?: string | null
          time_limit_seconds: number
          updated_at?: string
        }
        Update: {
          attempt_number?: number
          candidate_id?: string
          config_id?: string
          correct_count?: number | null
          created_at?: string
          current_position?: number
          duration_seconds?: number | null
          expires_at?: string
          id?: string
          module_id?: string | null
          pass_mark?: number
          passed?: boolean | null
          question_count?: number
          score_percent?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["attempt_status"]
          submitted_at?: string | null
          time_limit_seconds?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_attempts_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_attempts_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "assessment_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_attempts_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "academy_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_configs: {
        Row: {
          allow_retries: boolean
          created_at: string
          easy_pct: number
          hard_pct: number
          id: string
          max_attempts: number | null
          medium_pct: number
          module_id: string | null
          pass_mark: number
          question_count: number
          randomize_options: boolean
          randomize_questions: boolean
          scope: string
          status: Database["public"]["Enums"]["content_status"]
          time_limit_seconds: number
          title: string
          updated_at: string
        }
        Insert: {
          allow_retries?: boolean
          created_at?: string
          easy_pct?: number
          hard_pct?: number
          id?: string
          max_attempts?: number | null
          medium_pct?: number
          module_id?: string | null
          pass_mark?: number
          question_count?: number
          randomize_options?: boolean
          randomize_questions?: boolean
          scope?: string
          status?: Database["public"]["Enums"]["content_status"]
          time_limit_seconds?: number
          title: string
          updated_at?: string
        }
        Update: {
          allow_retries?: boolean
          created_at?: string
          easy_pct?: number
          hard_pct?: number
          id?: string
          max_attempts?: number | null
          medium_pct?: number
          module_id?: string | null
          pass_mark?: number
          question_count?: number
          randomize_options?: boolean
          randomize_questions?: boolean
          scope?: string
          status?: Database["public"]["Enums"]["content_status"]
          time_limit_seconds?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_configs_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: true
            referencedRelation: "academy_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_question_options: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean
          option_text: string
          question_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct?: boolean
          option_text: string
          question_id: string
          sort_order: number
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean
          option_text?: string
          question_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessment_question_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "assessment_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_questions: {
        Row: {
          code: string
          created_at: string
          difficulty: Database["public"]["Enums"]["question_difficulty"]
          explanation: string
          id: string
          module_id: string
          objective_index: number
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          scenario_text: string | null
          scope: string
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
          variant_group: string
          variant_number: number
        }
        Insert: {
          code: string
          created_at?: string
          difficulty: Database["public"]["Enums"]["question_difficulty"]
          explanation: string
          id?: string
          module_id: string
          objective_index: number
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          scenario_text?: string | null
          scope?: string
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          variant_group: string
          variant_number?: number
        }
        Update: {
          code?: string
          created_at?: string
          difficulty?: Database["public"]["Enums"]["question_difficulty"]
          explanation?: string
          id?: string
          module_id?: string
          objective_index?: number
          question_text?: string
          question_type?: Database["public"]["Enums"]["question_type"]
          scenario_text?: string | null
          scope?: string
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          variant_group?: string
          variant_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessment_questions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "academy_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_profiles: {
        Row: {
          academy_status: Database["public"]["Enums"]["academy_status"]
          assigned_trainer_id: string | null
          created_at: string
          department: string | null
          designation: string | null
          employee_id: string
          hr_employee_id: string | null
          joining_date: string | null
          location: string | null
          progress_percent: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          academy_status?: Database["public"]["Enums"]["academy_status"]
          assigned_trainer_id?: string | null
          created_at?: string
          department?: string | null
          designation?: string | null
          employee_id: string
          hr_employee_id?: string | null
          joining_date?: string | null
          location?: string | null
          progress_percent?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          academy_status?: Database["public"]["Enums"]["academy_status"]
          assigned_trainer_id?: string | null
          created_at?: string
          department?: string | null
          designation?: string | null
          employee_id?: string
          hr_employee_id?: string | null
          joining_date?: string | null
          location?: string | null
          progress_percent?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_profiles_assigned_trainer_id_fkey"
            columns: ["assigned_trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          approved_at: string | null
          candidate_id: string
          certificate_number: string
          created_at: string
          evidence: Json
          final_attempt_id: string | null
          final_score: number | null
          id: string
          issued_at: string | null
          issuer_name: string | null
          pdf_path: string | null
          program: string
          rejected_at: string | null
          rejection_reason: string | null
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          revocation_reason: string | null
          revoked_at: string | null
          status: Database["public"]["Enums"]["certificate_status"]
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          candidate_id: string
          certificate_number?: string
          created_at?: string
          evidence?: Json
          final_attempt_id?: string | null
          final_score?: number | null
          id?: string
          issued_at?: string | null
          issuer_name?: string | null
          pdf_path?: string | null
          program?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          revocation_reason?: string | null
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["certificate_status"]
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          candidate_id?: string
          certificate_number?: string
          created_at?: string
          evidence?: Json
          final_attempt_id?: string | null
          final_score?: number | null
          id?: string
          issued_at?: string | null
          issuer_name?: string | null
          pdf_path?: string | null
          program?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          revocation_reason?: string | null
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["certificate_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_final_attempt_id_fkey"
            columns: ["final_attempt_id"]
            isOneToOne: false
            referencedRelation: "assessment_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_notes: {
        Row: {
          candidate_id: string
          content: string
          created_at: string
          follow_up_date: string | null
          id: string
          status: Database["public"]["Enums"]["coaching_status"]
          trainer_id: string
          updated_at: string
        }
        Insert: {
          candidate_id: string
          content: string
          created_at?: string
          follow_up_date?: string | null
          id?: string
          status?: Database["public"]["Enums"]["coaching_status"]
          trainer_id: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          content?: string
          created_at?: string
          follow_up_date?: string | null
          id?: string
          status?: Database["public"]["Enums"]["coaching_status"]
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_notes_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_notes_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_requirements: {
        Row: {
          assigned_recruiter_id: string | null
          client_name: string | null
          created_at: string
          created_by: string | null
          description: string | null
          details_verified: boolean
          experience: string | null
          id: string
          location: string | null
          openings: number | null
          priority: Database["public"]["Enums"]["requirement_priority"]
          required_skills: string[]
          requirement_code: string
          status: Database["public"]["Enums"]["requirement_status"]
          team_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_recruiter_id?: string | null
          client_name?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          details_verified?: boolean
          experience?: string | null
          id?: string
          location?: string | null
          openings?: number | null
          priority?: Database["public"]["Enums"]["requirement_priority"]
          required_skills?: string[]
          requirement_code?: string
          status?: Database["public"]["Enums"]["requirement_status"]
          team_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_recruiter_id?: string | null
          client_name?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          details_verified?: boolean
          experience?: string | null
          id?: string
          location?: string | null
          openings?: number | null
          priority?: Database["public"]["Enums"]["requirement_priority"]
          required_skills?: string[]
          requirement_code?: string
          status?: Database["public"]["Enums"]["requirement_status"]
          team_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_requirements_assigned_recruiter_id_fkey"
            columns: ["assigned_recruiter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_requirements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_requirements_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          candidate_id: string
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          lesson_id: string
          module_id: string
          started: boolean
          started_at: string
          time_spent_seconds: number
          updated_at: string
        }
        Insert: {
          candidate_id: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id: string
          module_id: string
          started?: boolean
          started_at?: string
          time_spent_seconds?: number
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id?: string
          module_id?: string
          started?: boolean
          started_at?: string
          time_spent_seconds?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "academy_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          content: Json
          content_type: Database["public"]["Enums"]["lesson_content_type"]
          created_at: string
          description: string
          estimated_minutes: number | null
          id: string
          is_required: boolean
          module_id: string
          sort_order: number
          status: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at: string
        }
        Insert: {
          content?: Json
          content_type?: Database["public"]["Enums"]["lesson_content_type"]
          created_at?: string
          description?: string
          estimated_minutes?: number | null
          id?: string
          is_required?: boolean
          module_id: string
          sort_order: number
          status?: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at?: string
        }
        Update: {
          content?: Json
          content_type?: Database["public"]["Enums"]["lesson_content_type"]
          created_at?: string
          description?: string
          estimated_minutes?: number | null
          id?: string
          is_required?: boolean
          module_id?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "academy_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      module_progress: {
        Row: {
          assessment_passed: boolean
          candidate_id: string
          completed_at: string | null
          completed_lessons: number
          created_at: string
          id: string
          last_activity_at: string | null
          lessons_completed: boolean
          module_id: string
          percentage: number
          started_at: string | null
          status: Database["public"]["Enums"]["module_progress_status"]
          total_lessons: number
          updated_at: string
        }
        Insert: {
          assessment_passed?: boolean
          candidate_id: string
          completed_at?: string | null
          completed_lessons?: number
          created_at?: string
          id?: string
          last_activity_at?: string | null
          lessons_completed?: boolean
          module_id: string
          percentage?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["module_progress_status"]
          total_lessons?: number
          updated_at?: string
        }
        Update: {
          assessment_passed?: boolean
          candidate_id?: string
          completed_at?: string | null
          completed_lessons?: number
          created_at?: string
          id?: string
          last_activity_at?: string | null
          lessons_completed?: boolean
          module_id?: string
          percentage?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["module_progress_status"]
          total_lessons?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_progress_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "academy_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"]
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
          last_login_at: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"]
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
          last_login_at?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"]
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      recruitment_activities: {
        Row: {
          activity_type: Database["public"]["Enums"]["recruitment_activity_type"]
          candidate_id: string
          created_at: string
          id: string
          notes: string | null
          occurred_at: string
          recorded_by: string | null
          requirement_id: string | null
        }
        Insert: {
          activity_type: Database["public"]["Enums"]["recruitment_activity_type"]
          candidate_id: string
          created_at?: string
          id?: string
          notes?: string | null
          occurred_at: string
          recorded_by?: string | null
          requirement_id?: string | null
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["recruitment_activity_type"]
          candidate_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          occurred_at?: string
          recorded_by?: string | null
          requirement_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_activities_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "recruitment_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_activities_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_activities_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "job_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_candidates: {
        Row: {
          candidate_code: string
          contact_verified: boolean
          created_at: string
          created_by: string | null
          details_verified: boolean
          email: string | null
          experience: string | null
          full_name: string
          id: string
          location: string | null
          phone: string | null
          recruiter_id: string | null
          requirement_id: string | null
          resume_path: string | null
          skills: string[]
          source: string
          stage: Database["public"]["Enums"]["recruitment_stage"]
          stage_changed_at: string
          updated_at: string
        }
        Insert: {
          candidate_code?: string
          contact_verified?: boolean
          created_at?: string
          created_by?: string | null
          details_verified?: boolean
          email?: string | null
          experience?: string | null
          full_name: string
          id?: string
          location?: string | null
          phone?: string | null
          recruiter_id?: string | null
          requirement_id?: string | null
          resume_path?: string | null
          skills?: string[]
          source: string
          stage?: Database["public"]["Enums"]["recruitment_stage"]
          stage_changed_at?: string
          updated_at?: string
        }
        Update: {
          candidate_code?: string
          contact_verified?: boolean
          created_at?: string
          created_by?: string | null
          details_verified?: boolean
          email?: string | null
          experience?: string | null
          full_name?: string
          id?: string
          location?: string | null
          phone?: string | null
          recruiter_id?: string | null
          requirement_id?: string | null
          resume_path?: string | null
          skills?: string[]
          source?: string
          stage?: Database["public"]["Enums"]["recruitment_stage"]
          stage_changed_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_candidates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_candidates_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_candidates_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "job_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_interview_events: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          interview_id: string
          new_scheduled_at: string
          new_status: Database["public"]["Enums"]["interview_status"]
          note: string | null
          previous_scheduled_at: string | null
          previous_status:
            | Database["public"]["Enums"]["interview_status"]
            | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          interview_id: string
          new_scheduled_at: string
          new_status: Database["public"]["Enums"]["interview_status"]
          note?: string | null
          previous_scheduled_at?: string | null
          previous_status?:
            | Database["public"]["Enums"]["interview_status"]
            | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          interview_id?: string
          new_scheduled_at?: string
          new_status?: Database["public"]["Enums"]["interview_status"]
          note?: string | null
          previous_scheduled_at?: string | null
          previous_status?:
            | Database["public"]["Enums"]["interview_status"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_interview_events_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_interview_events_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "recruitment_interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_interviews: {
        Row: {
          candidate_id: string
          created_at: string
          created_by: string | null
          id: string
          interviewer: string | null
          notes: string | null
          outcome: string | null
          requirement_id: string | null
          round: string
          scheduled_at: string
          status: Database["public"]["Enums"]["interview_status"]
          updated_at: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          interviewer?: string | null
          notes?: string | null
          outcome?: string | null
          requirement_id?: string | null
          round: string
          scheduled_at: string
          status?: Database["public"]["Enums"]["interview_status"]
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          interviewer?: string | null
          notes?: string | null
          outcome?: string | null
          requirement_id?: string | null
          round?: string
          scheduled_at?: string
          status?: Database["public"]["Enums"]["interview_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_interviews_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "recruitment_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_interviews_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_interviews_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "job_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_stage_history: {
        Row: {
          candidate_id: string
          changed_at: string
          changed_by: string | null
          from_stage: Database["public"]["Enums"]["recruitment_stage"] | null
          id: string
          note: string | null
          requirement_id: string | null
          to_stage: Database["public"]["Enums"]["recruitment_stage"]
        }
        Insert: {
          candidate_id: string
          changed_at?: string
          changed_by?: string | null
          from_stage?: Database["public"]["Enums"]["recruitment_stage"] | null
          id?: string
          note?: string | null
          requirement_id?: string | null
          to_stage: Database["public"]["Enums"]["recruitment_stage"]
        }
        Update: {
          candidate_id?: string
          changed_at?: string
          changed_by?: string | null
          from_stage?: Database["public"]["Enums"]["recruitment_stage"] | null
          id?: string
          note?: string | null
          requirement_id?: string | null
          to_stage?: Database["public"]["Enums"]["recruitment_stage"]
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_stage_history_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "recruitment_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_stage_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_stage_history_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "job_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_profiles: {
        Row: {
          created_at: string
          department: string | null
          job_title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          job_title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          department?: string | null
          job_title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_managers: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          manager_id: string
          team_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          manager_id: string
          team_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          manager_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_managers_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_managers_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trainee_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          candidate_id: string
          ended_at: string | null
          ended_by: string | null
          id: string
          status: Database["public"]["Enums"]["assignment_status"]
          team_id: string | null
          trainer_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          candidate_id: string
          ended_at?: string | null
          ended_by?: string | null
          id?: string
          status?: Database["public"]["Enums"]["assignment_status"]
          team_id?: string | null
          trainer_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          candidate_id?: string
          ended_at?: string | null
          ended_by?: string | null
          id?: string
          status?: Database["public"]["Enums"]["assignment_status"]
          team_id?: string | null
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainee_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainee_assignments_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainee_assignments_ended_by_fkey"
            columns: ["ended_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainee_assignments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainee_assignments_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      candidate_directory: {
        Row: {
          academy_status: Database["public"]["Enums"]["academy_status"] | null
          account_status: Database["public"]["Enums"]["account_status"] | null
          assigned_trainer_id: string | null
          candidate_id: string | null
          created_at: string | null
          department: string | null
          designation: string | null
          email: string | null
          full_name: string | null
          hr_employee_id: string | null
          joining_date: string | null
          last_login_at: string | null
          location: string | null
          phone: string | null
          progress_percent: number | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_profiles_assigned_trainer_id_fkey"
            columns: ["assigned_trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      certificate_directory: {
        Row: {
          approved_at: string | null
          candidate_id: string | null
          certificate_number: string | null
          completed_modules: number | null
          email: string | null
          employee_id: string | null
          final_passed: boolean | null
          final_score: number | null
          full_name: string | null
          id: string | null
          issued_at: string | null
          issuer_name: string | null
          pass_mark: number | null
          pdf_path: string | null
          program: string | null
          rejected_at: string | null
          rejection_reason: string | null
          requested_at: string | null
          reviewed_at: string | null
          revocation_reason: string | null
          revoked_at: string | null
          status: Database["public"]["Enums"]["certificate_status"] | null
          total_modules: number | null
        }
        Relationships: [
          {
            foreignKeyName: "certificates_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _cert_log: {
        Args: {
          _action: string
          _c: Database["public"]["Tables"]["certificates"]["Row"]
          _extra: Json
        }
        Returns: undefined
      }
      _rec_actor: { Args: never; Returns: string }
      _rec_clean: { Args: { _t: string }; Returns: string }
      _rec_log: {
        Args: {
          _action: Database["public"]["Enums"]["activity_action"]
          _actor: string
          _meta: Json
        }
        Returns: undefined
      }
      _require_admin: { Args: never; Returns: undefined }
      academy_overview: {
        Args: { _candidate: string }
        Returns: {
          assessment_passed: boolean
          completed_at: string
          completed_lessons: number
          description: string
          last_activity_at: string
          learning_objectives: string[]
          lessons_completed: boolean
          module_id: string
          module_number: number
          pass_mark: number
          percentage: number
          requires_assessment: boolean
          started_at: string
          state: string
          title: string
          total_lessons: number
        }[]
      }
      add_coaching_note: {
        Args: {
          _candidate: string
          _content: string
          _follow_up: string
          _status: Database["public"]["Enums"]["coaching_status"]
        }
        Returns: string
      }
      admin_assign_trainer: {
        Args: { _candidate: string; _team: string; _trainer: string }
        Returns: undefined
      }
      admin_create_team: { Args: { _name: string }; Returns: string }
      admin_end_assignment: { Args: { _candidate: string }; Returns: undefined }
      admin_set_team_manager: {
        Args: { _assign: boolean; _manager: string; _team: string }
        Returns: undefined
      }
      approve_certificate: {
        Args: { _cert: string }
        Returns: {
          approved_at: string | null
          candidate_id: string
          certificate_number: string
          created_at: string
          evidence: Json
          final_attempt_id: string | null
          final_score: number | null
          id: string
          issued_at: string | null
          issuer_name: string | null
          pdf_path: string | null
          program: string
          rejected_at: string | null
          rejection_reason: string | null
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          revocation_reason: string | null
          revoked_at: string | null
          status: Database["public"]["Enums"]["certificate_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "certificates"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      can_access_recruitment_candidate: {
        Args: { _c: string; _u: string }
        Returns: boolean
      }
      can_access_requirement: {
        Args: { _req: string; _u: string }
        Returns: boolean
      }
      can_edit_recruitment_candidate: {
        Args: { _c: string; _u: string }
        Returns: boolean
      }
      can_view_candidate: {
        Args: { _candidate: string; _viewer: string }
        Returns: boolean
      }
      change_recruitment_stage: {
        Args: {
          _candidate: string
          _note: string
          _to: Database["public"]["Enums"]["recruitment_stage"]
        }
        Returns: undefined
      }
      complete_lesson: {
        Args: { _lesson: string; _time_spent_seconds?: number }
        Returns: {
          candidate_id: string
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          lesson_id: string
          module_id: string
          started: boolean
          started_at: string
          time_spent_seconds: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "lesson_progress"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      final_assessment_overview: {
        Args: { _candidate: string; _log_open?: boolean }
        Returns: Json
      }
      finalize_assessment_attempt: {
        Args: { _attempt: string; _timed_out: boolean }
        Returns: {
          attempt_number: number
          candidate_id: string
          config_id: string
          correct_count: number | null
          created_at: string
          current_position: number
          duration_seconds: number | null
          expires_at: string
          id: string
          module_id: string | null
          pass_mark: number
          passed: boolean | null
          question_count: number
          score_percent: number | null
          started_at: string
          status: Database["public"]["Enums"]["attempt_status"]
          submitted_at: string | null
          time_limit_seconds: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "assessment_attempts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_assessment_attempt: { Args: { _attempt: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_assigned_trainer: {
        Args: { _candidate: string; _trainer: string }
        Returns: boolean
      }
      is_final_assessment_eligible: {
        Args: { _user: string }
        Returns: boolean
      }
      is_module_unlocked: {
        Args: { _module: string; _user: string }
        Returns: boolean
      }
      manages_candidate: {
        Args: { _candidate: string; _manager: string }
        Returns: boolean
      }
      mark_certificate_issued: {
        Args: { _cert: string; _path: string }
        Returns: {
          approved_at: string | null
          candidate_id: string
          certificate_number: string
          created_at: string
          evidence: Json
          final_attempt_id: string | null
          final_score: number | null
          id: string
          issued_at: string | null
          issuer_name: string | null
          pdf_path: string | null
          program: string
          rejected_at: string | null
          rejection_reason: string | null
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          revocation_reason: string | null
          revoked_at: string | null
          status: Database["public"]["Enums"]["certificate_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "certificates"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      recalc_module_progress: {
        Args: { _module: string; _user: string }
        Returns: {
          assessment_passed: boolean
          candidate_id: string
          completed_at: string | null
          completed_lessons: number
          created_at: string
          id: string
          last_activity_at: string | null
          lessons_completed: boolean
          module_id: string
          percentage: number
          started_at: string | null
          status: Database["public"]["Enums"]["module_progress_status"]
          total_lessons: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "module_progress"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_recruitment_activity: {
        Args: {
          _candidate: string
          _notes: string
          _occurred: string
          _type: Database["public"]["Enums"]["recruitment_activity_type"]
        }
        Returns: string
      }
      recruitment_assignable_staff: {
        Args: never
        Returns: {
          full_name: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }[]
      }
      recruitment_people: {
        Args: { _ids: string[] }
        Returns: {
          full_name: string
          id: string
        }[]
      }
      recruitment_transition_allowed: {
        Args: {
          _from: Database["public"]["Enums"]["recruitment_stage"]
          _to: Database["public"]["Enums"]["recruitment_stage"]
        }
        Returns: boolean
      }
      reject_certificate: {
        Args: { _cert: string; _reason: string }
        Returns: {
          approved_at: string | null
          candidate_id: string
          certificate_number: string
          created_at: string
          evidence: Json
          final_attempt_id: string | null
          final_score: number | null
          id: string
          issued_at: string | null
          issuer_name: string | null
          pdf_path: string | null
          program: string
          rejected_at: string | null
          rejection_reason: string | null
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          revocation_reason: string | null
          revoked_at: string | null
          status: Database["public"]["Enums"]["certificate_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "certificates"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rereview_certificate: {
        Args: { _cert: string }
        Returns: {
          approved_at: string | null
          candidate_id: string
          certificate_number: string
          created_at: string
          evidence: Json
          final_attempt_id: string | null
          final_score: number | null
          id: string
          issued_at: string | null
          issuer_name: string | null
          pdf_path: string | null
          program: string
          rejected_at: string | null
          rejection_reason: string | null
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          revocation_reason: string | null
          revoked_at: string | null
          status: Database["public"]["Enums"]["certificate_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "certificates"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      revoke_certificate: {
        Args: { _cert: string; _reason: string }
        Returns: {
          approved_at: string | null
          candidate_id: string
          certificate_number: string
          created_at: string
          evidence: Json
          final_attempt_id: string | null
          final_score: number | null
          id: string
          issued_at: string | null
          issuer_name: string | null
          pdf_path: string | null
          program: string
          rejected_at: string | null
          rejection_reason: string | null
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          revocation_reason: string | null
          revoked_at: string | null
          status: Database["public"]["Enums"]["certificate_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "certificates"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_assessment_answer: {
        Args: {
          _attempt: string
          _current?: number
          _position: number
          _selected: string[]
        }
        Returns: Json
      }
      save_job_requirement: {
        Args: {
          _client: string
          _description: string
          _experience: string
          _id: string
          _location: string
          _openings: number
          _priority: Database["public"]["Enums"]["requirement_priority"]
          _recruiter: string
          _skills: string[]
          _status: Database["public"]["Enums"]["requirement_status"]
          _team: string
          _title: string
          _verified: boolean
        }
        Returns: string
      }
      save_recruitment_candidate: {
        Args: {
          _contact_verified: boolean
          _details_verified: boolean
          _email: string
          _experience: string
          _id: string
          _location: string
          _name: string
          _phone: string
          _recruiter: string
          _requirement: string
          _skills: string[]
          _source: string
        }
        Returns: string
      }
      save_recruitment_interview: {
        Args: {
          _candidate: string
          _id: string
          _interviewer: string
          _notes: string
          _outcome: string
          _round: string
          _scheduled: string
          _status: Database["public"]["Enums"]["interview_status"]
        }
        Returns: string
      }
      set_recruitment_resume: {
        Args: { _candidate: string; _path: string }
        Returns: undefined
      }
      staff_trainee_overview: { Args: never; Returns: Json }
      start_final_assessment: { Args: never; Returns: string }
      start_lesson: {
        Args: { _lesson: string }
        Returns: {
          candidate_id: string
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          lesson_id: string
          module_id: string
          started: boolean
          started_at: string
          time_spent_seconds: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "lesson_progress"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      start_module_assessment: { Args: { _module: string }; Returns: string }
      submit_assessment: { Args: { _attempt: string }; Returns: Json }
      update_coaching_note: {
        Args: {
          _content: string
          _follow_up: string
          _note: string
          _status: Database["public"]["Enums"]["coaching_status"]
        }
        Returns: undefined
      }
      verify_certificate: { Args: { _number: string }; Returns: Json }
    }
    Enums: {
      academy_status: "not_started" | "in_progress" | "completed" | "certified"
      account_status: "active" | "invited" | "suspended" | "disabled"
      activity_action:
        | "login"
        | "logout"
        | "module_opened"
        | "lesson_started"
        | "lesson_completed"
        | "assessment_started"
        | "assessment_submitted"
        | "assessment_passed"
        | "assessment_failed"
        | "assessment_retried"
        | "learning_time"
        | "final_assessment_completed"
        | "final_assessment_passed"
        | "certificate_approved"
        | "certificate_issued"
        | "login_failed"
        | "password_reset_requested"
        | "password_changed"
        | "access_denied"
        | "candidate_created"
        | "candidate_updated"
        | "candidate_activated"
        | "candidate_suspended"
        | "candidate_disabled"
        | "candidate_reenabled"
        | "candidate_invited"
        | "candidate_viewed"
        | "lesson_opened"
        | "module_started"
        | "module_completed"
        | "assessment_resumed"
        | "assessment_timed_out"
        | "final_assessment_opened"
        | "final_assessment_started"
        | "final_assessment_submitted"
        | "final_assessment_failed"
        | "final_assessment_retried"
        | "final_assessment_timed_out"
        | "final_assessment_resumed"
        | "certificate_requested"
        | "certificate_rejected"
        | "certificate_rereviewed"
        | "certificate_revoked"
        | "certificate_downloaded"
        | "coaching_note_created"
        | "coaching_note_updated"
        | "trainer_assigned"
        | "trainer_unassigned"
        | "team_created"
        | "team_manager_assigned"
        | "team_manager_removed"
        | "recruitment_requirement_created"
        | "recruitment_requirement_updated"
        | "recruitment_candidate_created"
        | "recruitment_candidate_updated"
        | "recruitment_stage_changed"
        | "recruitment_activity_recorded"
        | "recruitment_interview_saved"
      app_role: "admin" | "trainer" | "manager" | "candidate"
      assignment_status: "active" | "ended"
      attempt_status:
        | "in_progress"
        | "passed"
        | "failed"
        | "timed_out"
        | "abandoned"
      certificate_status:
        | "pending_approval"
        | "approved"
        | "rejected"
        | "issued"
        | "revoked"
      coaching_status: "open" | "in_progress" | "resolved"
      content_status: "active" | "inactive"
      interview_status:
        | "scheduled"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "rescheduled"
        | "no_show"
      lesson_content_type:
        | "text"
        | "video"
        | "document"
        | "scenario"
        | "practice"
        | "quiz"
      module_progress_status: "not_started" | "in_progress" | "completed"
      question_difficulty: "easy" | "medium" | "hard"
      question_type:
        | "single_choice"
        | "multiple_choice"
        | "true_false"
        | "scenario"
        | "decision"
      recruitment_activity_type:
        | "sourced"
        | "contacted"
        | "screening_completed"
        | "interview_scheduled"
        | "interview_outcome"
        | "shortlisted"
        | "rejected"
        | "offer_issued"
        | "offer_accepted"
        | "joined"
        | "on_hold"
        | "withdrawn"
        | "note"
      recruitment_stage:
        | "sourced"
        | "contacted"
        | "interested"
        | "screened"
        | "shortlisted"
        | "interview_scheduled"
        | "interview_attended"
        | "selected"
        | "offered"
        | "offer_accepted"
        | "joined"
        | "rejected"
        | "not_interested"
        | "no_response"
        | "on_hold"
        | "dropout"
        | "absconded"
      requirement_priority: "low" | "normal" | "high" | "urgent"
      requirement_status: "draft" | "open" | "on_hold" | "closed" | "cancelled"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      academy_status: ["not_started", "in_progress", "completed", "certified"],
      account_status: ["active", "invited", "suspended", "disabled"],
      activity_action: [
        "login",
        "logout",
        "module_opened",
        "lesson_started",
        "lesson_completed",
        "assessment_started",
        "assessment_submitted",
        "assessment_passed",
        "assessment_failed",
        "assessment_retried",
        "learning_time",
        "final_assessment_completed",
        "final_assessment_passed",
        "certificate_approved",
        "certificate_issued",
        "login_failed",
        "password_reset_requested",
        "password_changed",
        "access_denied",
        "candidate_created",
        "candidate_updated",
        "candidate_activated",
        "candidate_suspended",
        "candidate_disabled",
        "candidate_reenabled",
        "candidate_invited",
        "candidate_viewed",
        "lesson_opened",
        "module_started",
        "module_completed",
        "assessment_resumed",
        "assessment_timed_out",
        "final_assessment_opened",
        "final_assessment_started",
        "final_assessment_submitted",
        "final_assessment_failed",
        "final_assessment_retried",
        "final_assessment_timed_out",
        "final_assessment_resumed",
        "certificate_requested",
        "certificate_rejected",
        "certificate_rereviewed",
        "certificate_revoked",
        "certificate_downloaded",
        "coaching_note_created",
        "coaching_note_updated",
        "trainer_assigned",
        "trainer_unassigned",
        "team_created",
        "team_manager_assigned",
        "team_manager_removed",
        "recruitment_requirement_created",
        "recruitment_requirement_updated",
        "recruitment_candidate_created",
        "recruitment_candidate_updated",
        "recruitment_stage_changed",
        "recruitment_activity_recorded",
        "recruitment_interview_saved",
      ],
      app_role: ["admin", "trainer", "manager", "candidate"],
      assignment_status: ["active", "ended"],
      attempt_status: [
        "in_progress",
        "passed",
        "failed",
        "timed_out",
        "abandoned",
      ],
      certificate_status: [
        "pending_approval",
        "approved",
        "rejected",
        "issued",
        "revoked",
      ],
      coaching_status: ["open", "in_progress", "resolved"],
      content_status: ["active", "inactive"],
      interview_status: [
        "scheduled",
        "confirmed",
        "completed",
        "cancelled",
        "rescheduled",
        "no_show",
      ],
      lesson_content_type: [
        "text",
        "video",
        "document",
        "scenario",
        "practice",
        "quiz",
      ],
      module_progress_status: ["not_started", "in_progress", "completed"],
      question_difficulty: ["easy", "medium", "hard"],
      question_type: [
        "single_choice",
        "multiple_choice",
        "true_false",
        "scenario",
        "decision",
      ],
      recruitment_activity_type: [
        "sourced",
        "contacted",
        "screening_completed",
        "interview_scheduled",
        "interview_outcome",
        "shortlisted",
        "rejected",
        "offer_issued",
        "offer_accepted",
        "joined",
        "on_hold",
        "withdrawn",
        "note",
      ],
      recruitment_stage: [
        "sourced",
        "contacted",
        "interested",
        "screened",
        "shortlisted",
        "interview_scheduled",
        "interview_attended",
        "selected",
        "offered",
        "offer_accepted",
        "joined",
        "rejected",
        "not_interested",
        "no_response",
        "on_hold",
        "dropout",
        "absconded",
      ],
      requirement_priority: ["low", "normal", "high", "urgent"],
      requirement_status: ["draft", "open", "on_hold", "closed", "cancelled"],
    },
  },
} as const
