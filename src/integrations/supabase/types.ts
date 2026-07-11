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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ad_placements: {
        Row: {
          enabled: boolean
          id: string
          label_ar: string
          script_html: string | null
          slot: string
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          id?: string
          label_ar: string
          script_html?: string | null
          slot: string
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          id?: string
          label_ar?: string
          script_html?: string | null
          slot?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: number
          ip: string | null
          meta: Json | null
          target_id: string | null
          target_type: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: number
          ip?: string | null
          meta?: Json | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: number
          ip?: string | null
          meta?: Json | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      author_applications: {
        Row: {
          admin_note: string | null
          bio: string
          created_at: string
          id: string
          pen_name: string
          reviewed_at: string | null
          reviewed_by: string | null
          sample_work: string | null
          social_links: Json
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          bio: string
          created_at?: string
          id?: string
          pen_name: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sample_work?: string | null
          social_links?: Json
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          bio?: string
          created_at?: string
          id?: string
          pen_name?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sample_work?: string | null
          social_links?: Json
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      author_follows: {
        Row: {
          author_id: string
          created_at: string
          follower_id: string
        }
        Insert: {
          author_id: string
          created_at?: string
          follower_id: string
        }
        Update: {
          author_id?: string
          created_at?: string
          follower_id?: string
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          chapter_id: string | null
          created_at: string
          id: string
          note: string | null
          novel_id: string
          paragraph_index: number | null
          user_id: string
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          novel_id: string
          paragraph_index?: number | null
          user_id: string
        }
        Update: {
          chapter_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          novel_id?: string
          paragraph_index?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_novel_id_fkey"
            columns: ["novel_id"]
            isOneToOne: false
            referencedRelation: "novels"
            referencedColumns: ["id"]
          },
        ]
      }
      chapters: {
        Row: {
          chapter_number: number
          content: string
          created_at: string
          id: string
          is_vip: boolean
          novel_id: string
          published_at: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["chapter_status"]
          title: string
          updated_at: string
          views_count: number
        }
        Insert: {
          chapter_number: number
          content: string
          created_at?: string
          id?: string
          is_vip?: boolean
          novel_id: string
          published_at?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["chapter_status"]
          title: string
          updated_at?: string
          views_count?: number
        }
        Update: {
          chapter_number?: number
          content?: string
          created_at?: string
          id?: string
          is_vip?: boolean
          novel_id?: string
          published_at?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["chapter_status"]
          title?: string
          updated_at?: string
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "chapters_novel_id_fkey"
            columns: ["novel_id"]
            isOneToOne: false
            referencedRelation: "novels"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_items: {
        Row: {
          added_at: string
          collection_id: string
          novel_id: string
        }
        Insert: {
          added_at?: string
          collection_id: string
          novel_id: string
        }
        Update: {
          added_at?: string
          collection_id?: string
          novel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_items_novel_id_fkey"
            columns: ["novel_id"]
            isOneToOne: false
            referencedRelation: "novels"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          chapter_id: string | null
          content: string
          created_at: string
          id: string
          is_pinned: boolean
          is_spoiler: boolean
          likes_count: number
          novel_id: string | null
          parent_id: string | null
          selection_hash: string | null
          selection_text: string | null
          user_id: string
        }
        Insert: {
          chapter_id?: string | null
          content: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          is_spoiler?: boolean
          likes_count?: number
          novel_id?: string | null
          parent_id?: string | null
          selection_hash?: string | null
          selection_text?: string | null
          user_id: string
        }
        Update: {
          chapter_id?: string | null
          content?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          is_spoiler?: boolean
          likes_count?: number
          novel_id?: string | null
          parent_id?: string | null
          selection_hash?: string | null
          selection_text?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_novel_id_fkey"
            columns: ["novel_id"]
            isOneToOne: false
            referencedRelation: "novels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          bonus_coins: number
          code: string
          created_at: string
          discount_percent: number
          expires_at: string | null
          id: string
          uses_left: number
        }
        Insert: {
          bonus_coins?: number
          code: string
          created_at?: string
          discount_percent?: number
          expires_at?: string | null
          id?: string
          uses_left?: number
        }
        Update: {
          bonus_coins?: number
          code?: string
          created_at?: string
          discount_percent?: number
          expires_at?: string | null
          id?: string
          uses_left?: number
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          novel_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          novel_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          novel_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_novel_id_fkey"
            columns: ["novel_id"]
            isOneToOne: false
            referencedRelation: "novels"
            referencedColumns: ["id"]
          },
        ]
      }
      genres: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name_ar: string
          name_en: string | null
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name_ar: string
          name_en?: string | null
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name_ar?: string
          name_en?: string | null
          slug?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          meta: Json
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          meta?: Json
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          meta?: Json
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      novel_genres: {
        Row: {
          genre_id: string
          novel_id: string
        }
        Insert: {
          genre_id: string
          novel_id: string
        }
        Update: {
          genre_id?: string
          novel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "novel_genres_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "genres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "novel_genres_novel_id_fkey"
            columns: ["novel_id"]
            isOneToOne: false
            referencedRelation: "novels"
            referencedColumns: ["id"]
          },
        ]
      }
      novel_tags: {
        Row: {
          novel_id: string
          tag_id: string
        }
        Insert: {
          novel_id: string
          tag_id: string
        }
        Update: {
          novel_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "novel_tags_novel_id_fkey"
            columns: ["novel_id"]
            isOneToOne: false
            referencedRelation: "novels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "novel_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      novels: {
        Row: {
          author: string
          cover_url: string | null
          created_at: string
          description: string
          id: string
          is_featured: boolean
          is_published: boolean
          is_upcoming: boolean
          original_title: string | null
          owner_id: string | null
          rating_avg: number
          rating_count: number
          release_date: string | null
          slug: string
          status: Database["public"]["Enums"]["novel_status"]
          title: string
          translator: string | null
          updated_at: string
          views_count: number
        }
        Insert: {
          author: string
          cover_url?: string | null
          created_at?: string
          description: string
          id?: string
          is_featured?: boolean
          is_published?: boolean
          is_upcoming?: boolean
          original_title?: string | null
          owner_id?: string | null
          rating_avg?: number
          rating_count?: number
          release_date?: string | null
          slug: string
          status?: Database["public"]["Enums"]["novel_status"]
          title: string
          translator?: string | null
          updated_at?: string
          views_count?: number
        }
        Update: {
          author?: string
          cover_url?: string | null
          created_at?: string
          description?: string
          id?: string
          is_featured?: boolean
          is_published?: boolean
          is_upcoming?: boolean
          original_title?: string | null
          owner_id?: string | null
          rating_avg?: number
          rating_count?: number
          release_date?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["novel_status"]
          title?: string
          translator?: string | null
          updated_at?: string
          views_count?: number
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          id: string
          provider: string
          provider_ref: string | null
          raw: Json | null
          status: string
          subscription_id: string | null
          user_id: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          id?: string
          provider: string
          provider_ref?: string | null
          raw?: Json | null
          status?: string
          subscription_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          provider?: string
          provider_ref?: string | null
          raw?: Json | null
          status?: string
          subscription_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "vip_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          author_bio: string | null
          avatar_url: string | null
          bio: string | null
          cover_url: string | null
          created_at: string
          display_name: string | null
          id: string
          is_verified: boolean
          is_vip: boolean
          social_links: Json
          updated_at: string
          username: string
          vip_expires_at: string | null
        }
        Insert: {
          author_bio?: string | null
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          is_verified?: boolean
          is_vip?: boolean
          social_links?: Json
          updated_at?: string
          username: string
          vip_expires_at?: string | null
        }
        Update: {
          author_bio?: string | null
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_verified?: boolean
          is_vip?: boolean
          social_links?: Json
          updated_at?: string
          username?: string
          vip_expires_at?: string | null
        }
        Relationships: []
      }
      ratings: {
        Row: {
          created_at: string
          id: string
          likes_count: number
          novel_id: string
          review_body: string | null
          review_title: string | null
          score: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          likes_count?: number
          novel_id: string
          review_body?: string | null
          review_title?: string | null
          score: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          likes_count?: number
          novel_id?: string
          review_body?: string | null
          review_title?: string | null
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_novel_id_fkey"
            columns: ["novel_id"]
            isOneToOne: false
            referencedRelation: "novels"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_history: {
        Row: {
          chapter_id: string
          last_read_at: string
          novel_id: string
          progress: number
          user_id: string
        }
        Insert: {
          chapter_id: string
          last_read_at?: string
          novel_id: string
          progress?: number
          user_id: string
        }
        Update: {
          chapter_id?: string
          last_read_at?: string
          novel_id?: string
          progress?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_history_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_history_novel_id_fkey"
            columns: ["novel_id"]
            isOneToOne: false
            referencedRelation: "novels"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_progress: {
        Row: {
          chapter_id: string
          novel_id: string
          scroll_pct: number
          updated_at: string
          user_id: string
        }
        Insert: {
          chapter_id: string
          novel_id: string
          scroll_pct?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          chapter_id?: string
          novel_id?: string
          scroll_pct?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_progress_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_progress_novel_id_fkey"
            columns: ["novel_id"]
            isOneToOne: false
            referencedRelation: "novels"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_stats: {
        Row: {
          achievements: Json
          current_streak: number
          last_read_date: string | null
          longest_streak: number
          total_chapters_read: number
          total_minutes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          achievements?: Json
          current_streak?: number
          last_read_date?: string | null
          longest_streak?: number
          total_chapters_read?: number
          total_minutes?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          achievements?: Json
          current_streak?: number
          last_read_date?: string | null
          longest_streak?: number
          total_chapters_read?: number
          total_minutes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          admin_notes: string | null
          content: string
          created_at: string
          id: string
          reporter_email: string | null
          reporter_id: string | null
          reporter_name: string | null
          status: string
          subject: string | null
          target_id: string | null
          target_url: string | null
          type: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          content: string
          created_at?: string
          id?: string
          reporter_email?: string | null
          reporter_id?: string | null
          reporter_name?: string | null
          status?: string
          subject?: string | null
          target_id?: string | null
          target_url?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          content?: string
          created_at?: string
          id?: string
          reporter_email?: string | null
          reporter_id?: string | null
          reporter_name?: string | null
          status?: string
          subject?: string | null
          target_id?: string | null
          target_url?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      review_likes: {
        Row: {
          created_at: string
          rating_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          rating_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          rating_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_likes_rating_id_fkey"
            columns: ["rating_id"]
            isOneToOne: false
            referencedRelation: "ratings"
            referencedColumns: ["id"]
          },
        ]
      }
      search_history: {
        Row: {
          created_at: string
          id: number
          query: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          query: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          query?: string
          user_id?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      tags: {
        Row: {
          created_at: string
          id: string
          name_ar: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name_ar: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name_ar?: string
          slug?: string
        }
        Relationships: []
      }
      text_reactions: {
        Row: {
          chapter_id: string
          created_at: string
          emoji: string
          id: string
          selection_hash: string
          selection_text: string
          user_id: string
        }
        Insert: {
          chapter_id: string
          created_at?: string
          emoji: string
          id?: string
          selection_hash: string
          selection_text: string
          user_id: string
        }
        Update: {
          chapter_id?: string
          created_at?: string
          emoji?: string
          id?: string
          selection_hash?: string
          selection_text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "text_reactions_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
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
      vip_plans: {
        Row: {
          code: string
          created_at: string
          currency: string
          description_ar: string | null
          duration_days: number
          features: Json
          id: string
          is_active: boolean
          name_ar: string
          name_en: string | null
          price_cents: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          currency?: string
          description_ar?: string | null
          duration_days: number
          features?: Json
          id?: string
          is_active?: boolean
          name_ar: string
          name_en?: string | null
          price_cents: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          currency?: string
          description_ar?: string | null
          duration_days?: number
          features?: Json
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string | null
          price_cents?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      vip_subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          plan_id: string
          provider: string | null
          provider_subscription_id: string | null
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan_id: string
          provider?: string | null
          provider_subscription_id?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan_id?: string
          provider?: string | null
          provider_subscription_id?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vip_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "vip_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          coins: number
          updated_at: string
          user_id: string
        }
        Insert: {
          coins?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          coins?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_author_application: {
        Args: { _app_id: string; _note?: string }
        Returns: undefined
      }
      has_any_admin_role: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_chapter_view: {
        Args: { _chapter_id: string }
        Returns: undefined
      }
      increment_novel_view: { Args: { _novel_id: string }; Returns: undefined }
      is_vip: { Args: { _user_id: string }; Returns: boolean }
      publish_due_chapters: { Args: never; Returns: number }
      reject_author_application: {
        Args: { _app_id: string; _note?: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "user" | "moderator" | "editor" | "author"
      chapter_status: "draft" | "scheduled" | "published"
      novel_status: "ongoing" | "completed" | "hiatus"
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
      app_role: ["admin", "user", "moderator", "editor", "author"],
      chapter_status: ["draft", "scheduled", "published"],
      novel_status: ["ongoing", "completed", "hiatus"],
    },
  },
} as const
