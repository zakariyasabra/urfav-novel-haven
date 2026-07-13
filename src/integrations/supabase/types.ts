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
      activity_feed: {
        Row: {
          actor_id: string
          created_at: string
          id: string
          kind: string
          meta: Json
          ref_chapter_id: string | null
          ref_novel_id: string | null
          ref_user_id: string | null
        }
        Insert: {
          actor_id: string
          created_at?: string
          id?: string
          kind: string
          meta?: Json
          ref_chapter_id?: string | null
          ref_novel_id?: string | null
          ref_user_id?: string | null
        }
        Update: {
          actor_id?: string
          created_at?: string
          id?: string
          kind?: string
          meta?: Json
          ref_chapter_id?: string | null
          ref_novel_id?: string | null
          ref_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_feed_ref_chapter_id_fkey"
            columns: ["ref_chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_feed_ref_novel_id_fkey"
            columns: ["ref_novel_id"]
            isOneToOne: false
            referencedRelation: "novels"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_placements: {
        Row: {
          enabled: boolean
          ends_at: string | null
          frequency: number
          id: string
          image_url: string | null
          kind: string
          label_ar: string
          link_url: string | null
          priority: number
          script_html: string | null
          slot: string
          starts_at: string | null
          target: Json
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          ends_at?: string | null
          frequency?: number
          id?: string
          image_url?: string | null
          kind?: string
          label_ar: string
          link_url?: string | null
          priority?: number
          script_html?: string | null
          slot: string
          starts_at?: string | null
          target?: Json
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          ends_at?: string | null
          frequency?: number
          id?: string
          image_url?: string | null
          kind?: string
          label_ar?: string
          link_url?: string | null
          priority?: number
          script_html?: string | null
          slot?: string
          starts_at?: string | null
          target?: Json
          updated_at?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          body: string | null
          body_ar: string | null
          body_en: string | null
          created_at: string
          enabled: boolean
          ends_at: string | null
          id: string
          kind: string
          link_url: string | null
          starts_at: string | null
          title: string
          title_ar: string | null
          title_en: string | null
        }
        Insert: {
          body?: string | null
          body_ar?: string | null
          body_en?: string | null
          created_at?: string
          enabled?: boolean
          ends_at?: string | null
          id?: string
          kind?: string
          link_url?: string | null
          starts_at?: string | null
          title: string
          title_ar?: string | null
          title_en?: string | null
        }
        Update: {
          body?: string | null
          body_ar?: string | null
          body_en?: string | null
          created_at?: string
          enabled?: boolean
          ends_at?: string | null
          id?: string
          kind?: string
          link_url?: string | null
          starts_at?: string | null
          title?: string
          title_ar?: string | null
          title_en?: string | null
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
      author_earnings: {
        Row: {
          author_id: string
          coins_paid_out: number
          coins_pending: number
          coins_total: number
          updated_at: string
        }
        Insert: {
          author_id: string
          coins_paid_out?: number
          coins_pending?: number
          coins_total?: number
          updated_at?: string
        }
        Update: {
          author_id?: string
          coins_paid_out?: number
          coins_pending?: number
          coins_total?: number
          updated_at?: string
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
      chapter_reactions: {
        Row: {
          chapter_id: string
          created_at: string
          emoji: string
          id: string
          user_id: string
        }
        Insert: {
          chapter_id: string
          created_at?: string
          emoji: string
          id?: string
          user_id: string
        }
        Update: {
          chapter_id?: string
          created_at?: string
          emoji?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapter_reactions_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      chapter_unlocks: {
        Row: {
          chapter_id: string
          coins_spent: number
          created_at: string
          id: string
          novel_id: string
          user_id: string
        }
        Insert: {
          chapter_id: string
          coins_spent?: number
          created_at?: string
          id?: string
          novel_id: string
          user_id: string
        }
        Update: {
          chapter_id?: string
          coins_spent?: number
          created_at?: string
          id?: string
          novel_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapter_unlocks_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapter_unlocks_novel_id_fkey"
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
          coin_price: number
          content: string
          content_ar: string | null
          content_en: string | null
          created_at: string
          id: string
          is_vip: boolean
          novel_id: string
          published_at: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["chapter_status"]
          title: string
          title_ar: string | null
          title_en: string | null
          updated_at: string
          views_count: number
        }
        Insert: {
          chapter_number: number
          coin_price?: number
          content: string
          content_ar?: string | null
          content_en?: string | null
          created_at?: string
          id?: string
          is_vip?: boolean
          novel_id: string
          published_at?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["chapter_status"]
          title: string
          title_ar?: string | null
          title_en?: string | null
          updated_at?: string
          views_count?: number
        }
        Update: {
          chapter_number?: number
          coin_price?: number
          content?: string
          content_ar?: string | null
          content_en?: string | null
          created_at?: string
          id?: string
          is_vip?: boolean
          novel_id?: string
          published_at?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["chapter_status"]
          title?: string
          title_ar?: string | null
          title_en?: string | null
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
      coin_gifts: {
        Row: {
          amount: number
          author_id: string
          created_at: string
          id: string
          message: string | null
          novel_id: string | null
          sender_id: string
        }
        Insert: {
          amount: number
          author_id: string
          created_at?: string
          id?: string
          message?: string | null
          novel_id?: string | null
          sender_id: string
        }
        Update: {
          amount?: number
          author_id?: string
          created_at?: string
          id?: string
          message?: string | null
          novel_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coin_gifts_novel_id_fkey"
            columns: ["novel_id"]
            isOneToOne: false
            referencedRelation: "novels"
            referencedColumns: ["id"]
          },
        ]
      }
      coin_packages: {
        Row: {
          bonus_coins: number
          code: string
          coins: number
          created_at: string
          description_ar: string | null
          description_en: string | null
          id: string
          is_active: boolean
          is_popular: boolean
          name_ar: string | null
          name_en: string | null
          price_egp_cents: number | null
          price_usd_cents: number | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          bonus_coins?: number
          code: string
          coins: number
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean
          is_popular?: boolean
          name_ar?: string | null
          name_en?: string | null
          price_egp_cents?: number | null
          price_usd_cents?: number | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          bonus_coins?: number
          code?: string
          coins?: number
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean
          is_popular?: boolean
          name_ar?: string | null
          name_en?: string | null
          price_egp_cents?: number | null
          price_usd_cents?: number | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      coin_purchase_requests: {
        Row: {
          admin_note: string | null
          amount_cents: number
          coins: number
          created_at: string
          currency: string
          id: string
          method_code: string
          proof_image_url: string | null
          proof_note: string | null
          proof_ref: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount_cents: number
          coins: number
          created_at?: string
          currency?: string
          id?: string
          method_code: string
          proof_image_url?: string | null
          proof_note?: string | null
          proof_ref?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount_cents?: number
          coins?: number
          created_at?: string
          currency?: string
          id?: string
          method_code?: string
          proof_image_url?: string | null
          proof_note?: string | null
          proof_ref?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      coin_transactions: {
        Row: {
          amount: number
          balance_after: number
          counterparty_id: string | null
          created_at: string
          id: string
          kind: string
          note: string | null
          ref_chapter_id: string | null
          ref_novel_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          counterparty_id?: string | null
          created_at?: string
          id?: string
          kind: string
          note?: string | null
          ref_chapter_id?: string | null
          ref_novel_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          counterparty_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          note?: string | null
          ref_chapter_id?: string | null
          ref_novel_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coin_transactions_ref_chapter_id_fkey"
            columns: ["ref_chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coin_transactions_ref_novel_id_fkey"
            columns: ["ref_novel_id"]
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
      content_translations: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          error: string | null
          id: string
          requested_by: string | null
          status: string
          target_lang: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          error?: string | null
          id?: string
          requested_by?: string | null
          status?: string
          target_lang: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          error?: string | null
          id?: string
          requested_by?: string | null
          status?: string
          target_lang?: string
          updated_at?: string
        }
        Relationships: []
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
      cron_registry: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_enabled: boolean
          last_result: string | null
          last_run_at: string | null
          name: string
          schedule: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_enabled?: boolean
          last_result?: string | null
          last_run_at?: string | null
          name: string
          schedule: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_enabled?: boolean
          last_result?: string | null
          last_run_at?: string | null
          name?: string
          schedule?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body_ar: string
          body_en: string | null
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          subject_ar: string
          subject_en: string | null
          updated_at: string
          variables: Json
        }
        Insert: {
          body_ar: string
          body_en?: string | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          subject_ar: string
          subject_en?: string | null
          updated_at?: string
          variables?: Json
        }
        Update: {
          body_ar?: string
          body_en?: string | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          subject_ar?: string
          subject_en?: string | null
          updated_at?: string
          variables?: Json
        }
        Relationships: []
      }
      faqs: {
        Row: {
          answer: string
          answer_ar: string | null
          answer_en: string | null
          created_at: string
          enabled: boolean
          id: string
          question: string
          question_ar: string | null
          question_en: string | null
          sort_order: number
        }
        Insert: {
          answer: string
          answer_ar?: string | null
          answer_en?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          question: string
          question_ar?: string | null
          question_en?: string | null
          sort_order?: number
        }
        Update: {
          answer?: string
          answer_ar?: string | null
          answer_en?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          question?: string
          question_ar?: string | null
          question_en?: string | null
          sort_order?: number
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
      feature_request_votes: {
        Row: {
          created_at: string
          request_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          request_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          request_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_request_votes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "feature_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_requests: {
        Row: {
          admin_note: string | null
          created_at: string
          description: string
          id: string
          is_public: boolean
          status: string
          title: string
          updated_at: string
          user_id: string
          votes_count: number
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          description: string
          id?: string
          is_public?: boolean
          status?: string
          title: string
          updated_at?: string
          user_id: string
          votes_count?: number
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          description?: string
          id?: string
          is_public?: boolean
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          votes_count?: number
        }
        Relationships: []
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
      homepage_sections: {
        Row: {
          algorithm: string
          created_at: string
          enabled: boolean
          genre_slug: string | null
          icon: string | null
          id: string
          limit_count: number
          sort_order: number
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          algorithm?: string
          created_at?: string
          enabled?: boolean
          genre_slug?: string | null
          icon?: string | null
          id?: string
          limit_count?: number
          sort_order?: number
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          algorithm?: string
          created_at?: string
          enabled?: boolean
          genre_slug?: string | null
          icon?: string | null
          id?: string
          limit_count?: number
          sort_order?: number
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      io_jobs: {
        Row: {
          actor_id: string | null
          created_at: string
          entity: string
          id: string
          kind: string
          meta: Json
          rows: number
          status: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          entity: string
          id?: string
          kind: string
          meta?: Json
          rows?: number
          status?: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          entity?: string
          id?: string
          kind?: string
          meta?: Json
          rows?: number
          status?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          body_ar: string | null
          body_en: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          meta: Json
          title: string
          title_ar: string | null
          title_en: string | null
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          body_ar?: string | null
          body_en?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          meta?: Json
          title: string
          title_ar?: string | null
          title_en?: string | null
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          body_ar?: string | null
          body_en?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          meta?: Json
          title?: string
          title_ar?: string | null
          title_en?: string | null
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
          author_display_ar: string | null
          author_display_en: string | null
          cover_url: string | null
          created_at: string
          description: string
          description_ar: string | null
          description_en: string | null
          id: string
          is_featured: boolean
          is_published: boolean
          is_upcoming: boolean
          original_title: string | null
          original_title_ar: string | null
          original_title_en: string | null
          owner_id: string | null
          rating_avg: number
          rating_count: number
          release_date: string | null
          slug: string
          status: Database["public"]["Enums"]["novel_status"]
          title: string
          title_ar: string | null
          title_en: string | null
          translator: string | null
          translator_ar: string | null
          translator_en: string | null
          updated_at: string
          views_count: number
        }
        Insert: {
          author: string
          author_display_ar?: string | null
          author_display_en?: string | null
          cover_url?: string | null
          created_at?: string
          description: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          is_upcoming?: boolean
          original_title?: string | null
          original_title_ar?: string | null
          original_title_en?: string | null
          owner_id?: string | null
          rating_avg?: number
          rating_count?: number
          release_date?: string | null
          slug: string
          status?: Database["public"]["Enums"]["novel_status"]
          title: string
          title_ar?: string | null
          title_en?: string | null
          translator?: string | null
          translator_ar?: string | null
          translator_en?: string | null
          updated_at?: string
          views_count?: number
        }
        Update: {
          author?: string
          author_display_ar?: string | null
          author_display_en?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          is_upcoming?: boolean
          original_title?: string | null
          original_title_ar?: string | null
          original_title_en?: string | null
          owner_id?: string | null
          rating_avg?: number
          rating_count?: number
          release_date?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["novel_status"]
          title?: string
          title_ar?: string | null
          title_en?: string | null
          translator?: string | null
          translator_ar?: string | null
          translator_en?: string | null
          updated_at?: string
          views_count?: number
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          account_details: string | null
          code: string
          config: Json
          created_at: string
          currency: string
          enabled: boolean
          id: string
          instructions: string | null
          kind: string
          name_ar: string
          name_en: string | null
          qr_image_url: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          account_details?: string | null
          code: string
          config?: Json
          created_at?: string
          currency?: string
          enabled?: boolean
          id?: string
          instructions?: string | null
          kind: string
          name_ar: string
          name_en?: string | null
          qr_image_url?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          account_details?: string | null
          code?: string
          config?: Json
          created_at?: string
          currency?: string
          enabled?: boolean
          id?: string
          instructions?: string | null
          kind?: string
          name_ar?: string
          name_en?: string | null
          qr_image_url?: string | null
          sort_order?: number
          updated_at?: string
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
          account_status: string
          author_bio: string | null
          avatar_url: string | null
          bio: string | null
          bio_ar: string | null
          bio_en: string | null
          cover_url: string | null
          created_at: string
          display_name: string | null
          id: string
          is_verified: boolean
          is_vip: boolean
          pref_language: string
          pref_theme: string
          social_links: Json
          status_reason: string | null
          suspended_until: string | null
          updated_at: string
          username: string
          vip_expires_at: string | null
        }
        Insert: {
          account_status?: string
          author_bio?: string | null
          avatar_url?: string | null
          bio?: string | null
          bio_ar?: string | null
          bio_en?: string | null
          cover_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          is_verified?: boolean
          is_vip?: boolean
          pref_language?: string
          pref_theme?: string
          social_links?: Json
          status_reason?: string | null
          suspended_until?: string | null
          updated_at?: string
          username: string
          vip_expires_at?: string | null
        }
        Update: {
          account_status?: string
          author_bio?: string | null
          avatar_url?: string | null
          bio?: string | null
          bio_ar?: string | null
          bio_en?: string | null
          cover_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_verified?: boolean
          is_vip?: boolean
          pref_language?: string
          pref_theme?: string
          social_links?: Json
          status_reason?: string | null
          suspended_until?: string | null
          updated_at?: string
          username?: string
          vip_expires_at?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      rate_limit_counters: {
        Row: {
          action: string
          count: number
          id: string
          user_id: string | null
          window_start: string
        }
        Insert: {
          action: string
          count?: number
          id?: string
          user_id?: string | null
          window_start?: string
        }
        Update: {
          action?: string
          count?: number
          id?: string
          user_id?: string | null
          window_start?: string
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
      reader_feedback: {
        Row: {
          category: string
          created_at: string
          id: string
          message: string | null
          page_url: string | null
          rating: number
          user_id: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          message?: string | null
          page_url?: string | null
          rating: number
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          message?: string | null
          page_url?: string | null
          rating?: number
          user_id?: string | null
        }
        Relationships: []
      }
      reading_goals: {
        Row: {
          daily_chapters: number
          updated_at: string
          user_id: string
          weekly_chapters: number
        }
        Insert: {
          daily_chapters?: number
          updated_at?: string
          user_id: string
          weekly_chapters?: number
        }
        Update: {
          daily_chapters?: number
          updated_at?: string
          user_id?: string
          weekly_chapters?: number
        }
        Relationships: []
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
      reading_streaks: {
        Row: {
          current_streak: number
          last_read_date: string | null
          longest_streak: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          last_read_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          last_read_date?: string | null
          longest_streak?: number
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
      seo_overrides: {
        Row: {
          description_ar: string | null
          description_en: string | null
          id: string
          og_image: string | null
          path: string
          robots: string | null
          title_ar: string | null
          title_en: string | null
          updated_at: string
        }
        Insert: {
          description_ar?: string | null
          description_en?: string | null
          id?: string
          og_image?: string | null
          path: string
          robots?: string | null
          title_ar?: string | null
          title_en?: string | null
          updated_at?: string
        }
        Update: {
          description_ar?: string | null
          description_en?: string | null
          id?: string
          og_image?: string | null
          path?: string
          robots?: string | null
          title_ar?: string | null
          title_en?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
          value_ar: Json | null
          value_en: Json | null
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
          value_ar?: Json | null
          value_en?: Json | null
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
          value_ar?: Json | null
          value_en?: Json | null
        }
        Relationships: []
      }
      spam_words: {
        Row: {
          created_at: string
          id: string
          severity: number
          word: string
        }
        Insert: {
          created_at?: string
          id?: string
          severity?: number
          word: string
        }
        Update: {
          created_at?: string
          id?: string
          severity?: number
          word?: string
        }
        Relationships: []
      }
      static_pages: {
        Row: {
          body_html: string
          body_html_ar: string | null
          body_html_en: string | null
          created_at: string
          id: string
          is_published: boolean
          slug: string
          title: string
          title_ar: string | null
          title_en: string | null
          updated_at: string
        }
        Insert: {
          body_html?: string
          body_html_ar?: string | null
          body_html_en?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          slug: string
          title: string
          title_ar?: string | null
          title_en?: string | null
          updated_at?: string
        }
        Update: {
          body_html?: string
          body_html_ar?: string | null
          body_html_en?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          slug?: string
          title?: string
          title_ar?: string | null
          title_en?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      super_admins: {
        Row: {
          assigned_at: string
          singleton: boolean
          user_id: string
        }
        Insert: {
          assigned_at?: string
          singleton?: boolean
          user_id: string
        }
        Update: {
          assigned_at?: string
          singleton?: boolean
          user_id?: string
        }
        Relationships: []
      }
      support_ticket_messages: {
        Row: {
          attachments: Json
          author_id: string
          body: string
          created_at: string
          id: string
          is_internal: boolean
          ticket_id: string
        }
        Insert: {
          attachments?: Json
          author_id: string
          body: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id: string
        }
        Update: {
          attachments?: Json
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
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
          body: string
          category: string
          context: Json
          created_at: string
          id: string
          priority: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          body: string
          category: string
          context?: Json
          created_at?: string
          id?: string
          priority?: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          body?: string
          category?: string
          context?: Json
          created_at?: string
          id?: string
          priority?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          context: Json
          created_at: string
          id: string
          level: string
          message: string
          source: string | null
          user_id: string | null
        }
        Insert: {
          context?: Json
          created_at?: string
          id?: string
          level?: string
          message: string
          source?: string | null
          user_id?: string | null
        }
        Update: {
          context?: Json
          created_at?: string
          id?: string
          level?: string
          message?: string
          source?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          created_at: string
          id: string
          name_ar: string
          name_en: string | null
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name_ar: string
          name_en?: string | null
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name_ar?: string
          name_en?: string | null
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
      user_follows: {
        Row: {
          created_at: string
          followed_id: string
          follower_id: string
        }
        Insert: {
          created_at?: string
          followed_id: string
          follower_id: string
        }
        Update: {
          created_at?: string
          followed_id?: string
          follower_id?: string
        }
        Relationships: []
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
          description_en: string | null
          discount_percent: number
          duration_days: number
          features: Json
          id: string
          is_active: boolean
          is_recommended: boolean
          name_ar: string
          name_en: string | null
          price_cents: number
          price_egp_cents: number | null
          price_usd_cents: number | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          currency?: string
          description_ar?: string | null
          description_en?: string | null
          discount_percent?: number
          duration_days: number
          features?: Json
          id?: string
          is_active?: boolean
          is_recommended?: boolean
          name_ar: string
          name_en?: string | null
          price_cents: number
          price_egp_cents?: number | null
          price_usd_cents?: number | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          currency?: string
          description_ar?: string | null
          description_en?: string | null
          discount_percent?: number
          duration_days?: number
          features?: Json
          id?: string
          is_active?: boolean
          is_recommended?: boolean
          name_ar?: string
          name_en?: string | null
          price_cents?: number
          price_egp_cents?: number | null
          price_usd_cents?: number | null
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
      withdrawal_requests: {
        Row: {
          admin_note: string | null
          author_id: string
          coins: number
          created_at: string
          id: string
          method_code: string
          payout_account: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          admin_note?: string | null
          author_id: string
          coins: number
          created_at?: string
          id?: string
          method_code: string
          payout_account: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          admin_note?: string | null
          author_id?: string
          coins?: number
          created_at?: string
          id?: string
          method_code?: string
          payout_account?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      profiles_public: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          id: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      search_trending: {
        Row: {
          hits: number | null
          last_seen: string | null
          query: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_adjust_coins: {
        Args: { _delta: number; _note?: string; _user_id: string }
        Returns: Json
      }
      admin_approve_coin_purchase: {
        Args: { _note?: string; _req_id: string }
        Returns: undefined
      }
      admin_approve_withdrawal: {
        Args: { _note?: string; _req_id: string }
        Returns: undefined
      }
      admin_author_analytics: { Args: { _author_id: string }; Returns: Json }
      admin_broadcast_notification: {
        Args: { _body: string; _link?: string; _title: string; _type?: string }
        Returns: number
      }
      admin_dashboard_overview: { Args: never; Returns: Json }
      admin_grant_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      admin_grant_vip: {
        Args: { _days: number; _user_id: string }
        Returns: undefined
      }
      admin_list_users: {
        Args: { _limit?: number; _search?: string }
        Returns: {
          account_status: string
          avatar_url: string
          created_at: string
          display_name: string
          id: string
          is_vip: boolean
          status_reason: string
          suspended_until: string
          username: string
          vip_expires_at: string
        }[]
      }
      admin_novel_analytics: { Args: { _novel_id: string }; Returns: Json }
      admin_reject_coin_purchase: {
        Args: { _note?: string; _req_id: string }
        Returns: undefined
      }
      admin_reject_withdrawal: {
        Args: { _note?: string; _req_id: string }
        Returns: undefined
      }
      admin_revoke_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      admin_revoke_vip: { Args: { _user_id: string }; Returns: undefined }
      admin_set_account_status: {
        Args: {
          _reason?: string
          _status: string
          _until?: string
          _user_id: string
        }
        Returns: undefined
      }
      admin_storage_stats: {
        Args: never
        Returns: {
          bucket_id: string
          files: number
          total_bytes: number
        }[]
      }
      admin_system_health: { Args: never; Returns: Json }
      admin_timeseries: {
        Args: { _days?: number }
        Returns: {
          day: string
          new_chapters: number
          new_novels: number
          new_users: number
          revenue_coins: number
        }[]
      }
      approve_author_application: {
        Args: { _app_id: string; _note?: string }
        Returns: undefined
      }
      bump_reading_streak: { Args: never; Returns: Json }
      check_rate_limit: {
        Args: { _action: string; _limit: number; _window_secs?: number }
        Returns: boolean
      }
      count_active_super_admins: { Args: never; Returns: number }
      gift_coins: {
        Args: {
          _amount: number
          _author_id: string
          _message?: string
          _novel_id?: string
        }
        Returns: Json
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
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      is_vip: { Args: { _user_id: string }; Returns: boolean }
      publish_due_chapters: { Args: never; Returns: number }
      reject_author_application: {
        Args: { _app_id: string; _note?: string }
        Returns: undefined
      }
      request_withdrawal: {
        Args: { _account: string; _coins: number; _method: string }
        Returns: string
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      transfer_super_admin: { Args: { _to: string }; Returns: undefined }
      unlock_chapter: { Args: { _chapter_id: string }; Returns: Json }
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
