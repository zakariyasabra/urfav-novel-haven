export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      achievements: {
        Row: {
          badge_code: string | null;
          category: string;
          code: string;
          coins: number;
          created_at: string;
          description_ar: string | null;
          description_en: string | null;
          enabled: boolean;
          hidden: boolean;
          icon: string | null;
          rarity: string;
          sort_order: number;
          threshold_kind: string;
          threshold_value: number;
          title_ar: string;
          title_en: string | null;
          updated_at: string;
          xp: number;
        };
        Insert: {
          badge_code?: string | null;
          category?: string;
          code: string;
          coins?: number;
          created_at?: string;
          description_ar?: string | null;
          description_en?: string | null;
          enabled?: boolean;
          hidden?: boolean;
          icon?: string | null;
          rarity?: string;
          sort_order?: number;
          threshold_kind: string;
          threshold_value?: number;
          title_ar: string;
          title_en?: string | null;
          updated_at?: string;
          xp?: number;
        };
        Update: {
          badge_code?: string | null;
          category?: string;
          code?: string;
          coins?: number;
          created_at?: string;
          description_ar?: string | null;
          description_en?: string | null;
          enabled?: boolean;
          hidden?: boolean;
          icon?: string | null;
          rarity?: string;
          sort_order?: number;
          threshold_kind?: string;
          threshold_value?: number;
          title_ar?: string;
          title_en?: string | null;
          updated_at?: string;
          xp?: number;
        };
        Relationships: [
          {
            foreignKeyName: "achievements_badge_code_fkey";
            columns: ["badge_code"];
            isOneToOne: false;
            referencedRelation: "badges";
            referencedColumns: ["code"];
          },
        ];
      };
      activity_feed: {
        Row: {
          actor_id: string;
          created_at: string;
          id: string;
          kind: string;
          meta: Json;
          ref_chapter_id: string | null;
          ref_novel_id: string | null;
          ref_user_id: string | null;
        };
        Insert: {
          actor_id: string;
          created_at?: string;
          id?: string;
          kind: string;
          meta?: Json;
          ref_chapter_id?: string | null;
          ref_novel_id?: string | null;
          ref_user_id?: string | null;
        };
        Update: {
          actor_id?: string;
          created_at?: string;
          id?: string;
          kind?: string;
          meta?: Json;
          ref_chapter_id?: string | null;
          ref_novel_id?: string | null;
          ref_user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "activity_feed_ref_chapter_id_fkey";
            columns: ["ref_chapter_id"];
            isOneToOne: false;
            referencedRelation: "chapters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activity_feed_ref_novel_id_fkey";
            columns: ["ref_novel_id"];
            isOneToOne: false;
            referencedRelation: "novels";
            referencedColumns: ["id"];
          },
        ];
      };
      ad_placements: {
        Row: {
          enabled: boolean;
          ends_at: string | null;
          frequency: number;
          id: string;
          image_url: string | null;
          kind: string;
          label_ar: string;
          link_url: string | null;
          priority: number;
          script_html: string | null;
          slot: string;
          starts_at: string | null;
          target: Json;
          updated_at: string;
        };
        Insert: {
          enabled?: boolean;
          ends_at?: string | null;
          frequency?: number;
          id?: string;
          image_url?: string | null;
          kind?: string;
          label_ar: string;
          link_url?: string | null;
          priority?: number;
          script_html?: string | null;
          slot: string;
          starts_at?: string | null;
          target?: Json;
          updated_at?: string;
        };
        Update: {
          enabled?: boolean;
          ends_at?: string | null;
          frequency?: number;
          id?: string;
          image_url?: string | null;
          kind?: string;
          label_ar?: string;
          link_url?: string | null;
          priority?: number;
          script_html?: string | null;
          slot?: string;
          starts_at?: string | null;
          target?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      ai_assets: {
        Row: {
          content: Json;
          created_at: string;
          id: string;
          kind: string;
          lang: string;
          model: string | null;
          novel_id: string;
          provider: string | null;
          scope_key: string;
          tokens_in: number | null;
          tokens_out: number | null;
          updated_at: string;
        };
        Insert: {
          content: Json;
          created_at?: string;
          id?: string;
          kind: string;
          lang?: string;
          model?: string | null;
          novel_id: string;
          provider?: string | null;
          scope_key?: string;
          tokens_in?: number | null;
          tokens_out?: number | null;
          updated_at?: string;
        };
        Update: {
          content?: Json;
          created_at?: string;
          id?: string;
          kind?: string;
          lang?: string;
          model?: string | null;
          novel_id?: string;
          provider?: string | null;
          scope_key?: string;
          tokens_in?: number | null;
          tokens_out?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_assets_novel_id_fkey";
            columns: ["novel_id"];
            isOneToOne: false;
            referencedRelation: "novels";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_conversations: {
        Row: {
          allow_spoilers: boolean;
          created_at: string;
          id: string;
          is_pinned: boolean;
          novel_id: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          allow_spoilers?: boolean;
          created_at?: string;
          id?: string;
          is_pinned?: boolean;
          novel_id: string;
          title?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          allow_spoilers?: boolean;
          created_at?: string;
          id?: string;
          is_pinned?: boolean;
          novel_id?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_conversations_novel_id_fkey";
            columns: ["novel_id"];
            isOneToOne: false;
            referencedRelation: "novels";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_generation_logs: {
        Row: {
          created_at: string;
          duration_ms: number | null;
          error: string | null;
          id: string;
          kind: string;
          model: string | null;
          novel_id: string | null;
          provider: string | null;
          status: string;
          tokens_in: number | null;
          tokens_out: number | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          duration_ms?: number | null;
          error?: string | null;
          id?: string;
          kind: string;
          model?: string | null;
          novel_id?: string | null;
          provider?: string | null;
          status?: string;
          tokens_in?: number | null;
          tokens_out?: number | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          duration_ms?: number | null;
          error?: string | null;
          id?: string;
          kind?: string;
          model?: string | null;
          novel_id?: string | null;
          provider?: string | null;
          status?: string;
          tokens_in?: number | null;
          tokens_out?: number | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ai_generation_logs_novel_id_fkey";
            columns: ["novel_id"];
            isOneToOne: false;
            referencedRelation: "novels";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_messages: {
        Row: {
          allow_spoilers: boolean | null;
          content: string;
          conversation_id: string;
          created_at: string;
          id: string;
          max_chapter_index: number | null;
          role: string;
          tokens_in: number | null;
          tokens_out: number | null;
        };
        Insert: {
          allow_spoilers?: boolean | null;
          content: string;
          conversation_id: string;
          created_at?: string;
          id?: string;
          max_chapter_index?: number | null;
          role: string;
          tokens_in?: number | null;
          tokens_out?: number | null;
        };
        Update: {
          allow_spoilers?: boolean | null;
          content?: string;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          max_chapter_index?: number | null;
          role?: string;
          tokens_in?: number | null;
          tokens_out?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "ai_conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      announcements: {
        Row: {
          body: string | null;
          body_ar: string | null;
          body_en: string | null;
          created_at: string;
          enabled: boolean;
          ends_at: string | null;
          id: string;
          kind: string;
          link_url: string | null;
          starts_at: string | null;
          title: string;
          title_ar: string | null;
          title_en: string | null;
        };
        Insert: {
          body?: string | null;
          body_ar?: string | null;
          body_en?: string | null;
          created_at?: string;
          enabled?: boolean;
          ends_at?: string | null;
          id?: string;
          kind?: string;
          link_url?: string | null;
          starts_at?: string | null;
          title: string;
          title_ar?: string | null;
          title_en?: string | null;
        };
        Update: {
          body?: string | null;
          body_ar?: string | null;
          body_en?: string | null;
          created_at?: string;
          enabled?: boolean;
          ends_at?: string | null;
          id?: string;
          kind?: string;
          link_url?: string | null;
          starts_at?: string | null;
          title?: string;
          title_ar?: string | null;
          title_en?: string | null;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          id: number;
          ip: string | null;
          meta: Json | null;
          target_id: string | null;
          target_type: string | null;
          user_agent: string | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          id?: number;
          ip?: string | null;
          meta?: Json | null;
          target_id?: string | null;
          target_type?: string | null;
          user_agent?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          id?: number;
          ip?: string | null;
          meta?: Json | null;
          target_id?: string | null;
          target_type?: string | null;
          user_agent?: string | null;
        };
        Relationships: [];
      };
      author_applications: {
        Row: {
          admin_note: string | null;
          bio: string;
          created_at: string;
          id: string;
          pen_name: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          sample_work: string | null;
          social_links: Json;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          admin_note?: string | null;
          bio: string;
          created_at?: string;
          id?: string;
          pen_name: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          sample_work?: string | null;
          social_links?: Json;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          admin_note?: string | null;
          bio?: string;
          created_at?: string;
          id?: string;
          pen_name?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          sample_work?: string | null;
          social_links?: Json;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      author_earnings: {
        Row: {
          author_id: string;
          coins_paid_out: number;
          coins_pending: number;
          coins_total: number;
          updated_at: string;
        };
        Insert: {
          author_id: string;
          coins_paid_out?: number;
          coins_pending?: number;
          coins_total?: number;
          updated_at?: string;
        };
        Update: {
          author_id?: string;
          coins_paid_out?: number;
          coins_pending?: number;
          coins_total?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      author_follows: {
        Row: {
          author_id: string;
          created_at: string;
          follower_id: string;
        };
        Insert: {
          author_id: string;
          created_at?: string;
          follower_id: string;
        };
        Update: {
          author_id?: string;
          created_at?: string;
          follower_id?: string;
        };
        Relationships: [];
      };
      badges: {
        Row: {
          animation: string | null;
          code: string;
          color: string | null;
          created_at: string;
          description: string | null;
          description_ar: string | null;
          description_en: string | null;
          enabled: boolean;
          icon: string | null;
          rarity: string;
          sort_order: number;
          title_ar: string;
          title_en: string | null;
          updated_at: string;
        };
        Insert: {
          animation?: string | null;
          code: string;
          color?: string | null;
          created_at?: string;
          description?: string | null;
          description_ar?: string | null;
          description_en?: string | null;
          enabled?: boolean;
          icon?: string | null;
          rarity?: string;
          sort_order?: number;
          title_ar: string;
          title_en?: string | null;
          updated_at?: string;
        };
        Update: {
          animation?: string | null;
          code?: string;
          color?: string | null;
          created_at?: string;
          description?: string | null;
          description_ar?: string | null;
          description_en?: string | null;
          enabled?: boolean;
          icon?: string | null;
          rarity?: string;
          sort_order?: number;
          title_ar?: string;
          title_en?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      battle_pass_ownership: {
        Row: {
          granted_at: string;
          granted_by: string | null;
          season_id: string;
          source: string;
          user_id: string;
        };
        Insert: {
          granted_at?: string;
          granted_by?: string | null;
          season_id: string;
          source?: string;
          user_id: string;
        };
        Update: {
          granted_at?: string;
          granted_by?: string | null;
          season_id?: string;
          source?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "battle_pass_ownership_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "season_events";
            referencedColumns: ["id"];
          },
        ];
      };
      battle_pass_tiers: {
        Row: {
          created_at: string;
          free_reward: Json;
          id: string;
          premium_reward: Json;
          season_id: string;
          tier: number;
          updated_at: string;
          xp_required: number;
        };
        Insert: {
          created_at?: string;
          free_reward?: Json;
          id?: string;
          premium_reward?: Json;
          season_id: string;
          tier: number;
          updated_at?: string;
          xp_required: number;
        };
        Update: {
          created_at?: string;
          free_reward?: Json;
          id?: string;
          premium_reward?: Json;
          season_id?: string;
          tier?: number;
          updated_at?: string;
          xp_required?: number;
        };
        Relationships: [
          {
            foreignKeyName: "battle_pass_tiers_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "season_events";
            referencedColumns: ["id"];
          },
        ];
      };
      bookmarks: {
        Row: {
          chapter_id: string | null;
          created_at: string;
          id: string;
          note: string | null;
          novel_id: string;
          paragraph_index: number | null;
          user_id: string;
        };
        Insert: {
          chapter_id?: string | null;
          created_at?: string;
          id?: string;
          note?: string | null;
          novel_id: string;
          paragraph_index?: number | null;
          user_id: string;
        };
        Update: {
          chapter_id?: string | null;
          created_at?: string;
          id?: string;
          note?: string | null;
          novel_id?: string;
          paragraph_index?: number | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bookmarks_chapter_id_fkey";
            columns: ["chapter_id"];
            isOneToOne: false;
            referencedRelation: "chapters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookmarks_novel_id_fkey";
            columns: ["novel_id"];
            isOneToOne: false;
            referencedRelation: "novels";
            referencedColumns: ["id"];
          },
        ];
      };
      chapter_reactions: {
        Row: {
          chapter_id: string;
          created_at: string;
          emoji: string;
          id: string;
          user_id: string;
        };
        Insert: {
          chapter_id: string;
          created_at?: string;
          emoji: string;
          id?: string;
          user_id: string;
        };
        Update: {
          chapter_id?: string;
          created_at?: string;
          emoji?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chapter_reactions_chapter_id_fkey";
            columns: ["chapter_id"];
            isOneToOne: false;
            referencedRelation: "chapters";
            referencedColumns: ["id"];
          },
        ];
      };
      chapter_unlocks: {
        Row: {
          chapter_id: string;
          coins_spent: number;
          created_at: string;
          id: string;
          novel_id: string;
          user_id: string;
        };
        Insert: {
          chapter_id: string;
          coins_spent?: number;
          created_at?: string;
          id?: string;
          novel_id: string;
          user_id: string;
        };
        Update: {
          chapter_id?: string;
          coins_spent?: number;
          created_at?: string;
          id?: string;
          novel_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chapter_unlocks_chapter_id_fkey";
            columns: ["chapter_id"];
            isOneToOne: false;
            referencedRelation: "chapters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chapter_unlocks_novel_id_fkey";
            columns: ["novel_id"];
            isOneToOne: false;
            referencedRelation: "novels";
            referencedColumns: ["id"];
          },
        ];
      };
      chapter_versions: {
        Row: {
          chapter_id: string;
          content_ar: string | null;
          content_en: string | null;
          created_at: string;
          editor_id: string | null;
          id: string;
          note: string | null;
          title_ar: string | null;
          title_en: string | null;
          version_no: number;
        };
        Insert: {
          chapter_id: string;
          content_ar?: string | null;
          content_en?: string | null;
          created_at?: string;
          editor_id?: string | null;
          id?: string;
          note?: string | null;
          title_ar?: string | null;
          title_en?: string | null;
          version_no: number;
        };
        Update: {
          chapter_id?: string;
          content_ar?: string | null;
          content_en?: string | null;
          created_at?: string;
          editor_id?: string | null;
          id?: string;
          note?: string | null;
          title_ar?: string | null;
          title_en?: string | null;
          version_no?: number;
        };
        Relationships: [
          {
            foreignKeyName: "chapter_versions_chapter_id_fkey";
            columns: ["chapter_id"];
            isOneToOne: false;
            referencedRelation: "chapters";
            referencedColumns: ["id"];
          },
        ];
      };
      chapters: {
        Row: {
          chapter_number: number;
          coin_price: number;
          content: string;
          content_ar: string | null;
          content_en: string | null;
          created_at: string;
          id: string;
          is_vip: boolean;
          novel_id: string;
          published_at: string | null;
          scheduled_at: string | null;
          status: Database["public"]["Enums"]["chapter_status"];
          title: string;
          title_ar: string | null;
          title_en: string | null;
          updated_at: string;
          views_count: number;
        };
        Insert: {
          chapter_number: number;
          coin_price?: number;
          content: string;
          content_ar?: string | null;
          content_en?: string | null;
          created_at?: string;
          id?: string;
          is_vip?: boolean;
          novel_id: string;
          published_at?: string | null;
          scheduled_at?: string | null;
          status?: Database["public"]["Enums"]["chapter_status"];
          title: string;
          title_ar?: string | null;
          title_en?: string | null;
          updated_at?: string;
          views_count?: number;
        };
        Update: {
          chapter_number?: number;
          coin_price?: number;
          content?: string;
          content_ar?: string | null;
          content_en?: string | null;
          created_at?: string;
          id?: string;
          is_vip?: boolean;
          novel_id?: string;
          published_at?: string | null;
          scheduled_at?: string | null;
          status?: Database["public"]["Enums"]["chapter_status"];
          title?: string;
          title_ar?: string | null;
          title_en?: string | null;
          updated_at?: string;
          views_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "chapters_novel_id_fkey";
            columns: ["novel_id"];
            isOneToOne: false;
            referencedRelation: "novels";
            referencedColumns: ["id"];
          },
        ];
      };
      coin_gifts: {
        Row: {
          amount: number;
          author_id: string;
          created_at: string;
          id: string;
          message: string | null;
          novel_id: string | null;
          sender_id: string;
        };
        Insert: {
          amount: number;
          author_id: string;
          created_at?: string;
          id?: string;
          message?: string | null;
          novel_id?: string | null;
          sender_id: string;
        };
        Update: {
          amount?: number;
          author_id?: string;
          created_at?: string;
          id?: string;
          message?: string | null;
          novel_id?: string | null;
          sender_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "coin_gifts_novel_id_fkey";
            columns: ["novel_id"];
            isOneToOne: false;
            referencedRelation: "novels";
            referencedColumns: ["id"];
          },
        ];
      };
      coin_packages: {
        Row: {
          bonus_coins: number;
          code: string;
          coins: number;
          created_at: string;
          description_ar: string | null;
          description_en: string | null;
          id: string;
          is_active: boolean;
          is_popular: boolean;
          name_ar: string | null;
          name_en: string | null;
          price_egp_cents: number | null;
          price_usd_cents: number | null;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          bonus_coins?: number;
          code: string;
          coins: number;
          created_at?: string;
          description_ar?: string | null;
          description_en?: string | null;
          id?: string;
          is_active?: boolean;
          is_popular?: boolean;
          name_ar?: string | null;
          name_en?: string | null;
          price_egp_cents?: number | null;
          price_usd_cents?: number | null;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          bonus_coins?: number;
          code?: string;
          coins?: number;
          created_at?: string;
          description_ar?: string | null;
          description_en?: string | null;
          id?: string;
          is_active?: boolean;
          is_popular?: boolean;
          name_ar?: string | null;
          name_en?: string | null;
          price_egp_cents?: number | null;
          price_usd_cents?: number | null;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      coin_purchase_requests: {
        Row: {
          admin_note: string | null;
          amount_cents: number;
          coins: number;
          created_at: string;
          currency: string;
          id: string;
          method_code: string;
          proof_image_url: string | null;
          proof_note: string | null;
          proof_ref: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: string;
          user_id: string;
        };
        Insert: {
          admin_note?: string | null;
          amount_cents: number;
          coins: number;
          created_at?: string;
          currency?: string;
          id?: string;
          method_code: string;
          proof_image_url?: string | null;
          proof_note?: string | null;
          proof_ref?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string;
          user_id: string;
        };
        Update: {
          admin_note?: string | null;
          amount_cents?: number;
          coins?: number;
          created_at?: string;
          currency?: string;
          id?: string;
          method_code?: string;
          proof_image_url?: string | null;
          proof_note?: string | null;
          proof_ref?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      coin_transactions: {
        Row: {
          amount: number;
          balance_after: number;
          counterparty_id: string | null;
          created_at: string;
          id: string;
          kind: string;
          note: string | null;
          ref_chapter_id: string | null;
          ref_novel_id: string | null;
          user_id: string;
        };
        Insert: {
          amount: number;
          balance_after: number;
          counterparty_id?: string | null;
          created_at?: string;
          id?: string;
          kind: string;
          note?: string | null;
          ref_chapter_id?: string | null;
          ref_novel_id?: string | null;
          user_id: string;
        };
        Update: {
          amount?: number;
          balance_after?: number;
          counterparty_id?: string | null;
          created_at?: string;
          id?: string;
          kind?: string;
          note?: string | null;
          ref_chapter_id?: string | null;
          ref_novel_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "coin_transactions_ref_chapter_id_fkey";
            columns: ["ref_chapter_id"];
            isOneToOne: false;
            referencedRelation: "chapters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "coin_transactions_ref_novel_id_fkey";
            columns: ["ref_novel_id"];
            isOneToOne: false;
            referencedRelation: "novels";
            referencedColumns: ["id"];
          },
        ];
      };
      collection_collaborators: {
        Row: {
          added_at: string;
          collection_id: string;
          role: string;
          user_id: string;
        };
        Insert: {
          added_at?: string;
          collection_id: string;
          role?: string;
          user_id: string;
        };
        Update: {
          added_at?: string;
          collection_id?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "collection_collaborators_collection_id_fkey";
            columns: ["collection_id"];
            isOneToOne: false;
            referencedRelation: "collections";
            referencedColumns: ["id"];
          },
        ];
      };
      collection_follows: {
        Row: {
          collection_id: string;
          followed_at: string;
          user_id: string;
        };
        Insert: {
          collection_id: string;
          followed_at?: string;
          user_id: string;
        };
        Update: {
          collection_id?: string;
          followed_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "collection_follows_collection_id_fkey";
            columns: ["collection_id"];
            isOneToOne: false;
            referencedRelation: "collections";
            referencedColumns: ["id"];
          },
        ];
      };
      collection_items: {
        Row: {
          added_at: string;
          added_by: string | null;
          collection_id: string;
          note: string | null;
          novel_id: string;
          position: number;
        };
        Insert: {
          added_at?: string;
          added_by?: string | null;
          collection_id: string;
          note?: string | null;
          novel_id: string;
          position?: number;
        };
        Update: {
          added_at?: string;
          added_by?: string | null;
          collection_id?: string;
          note?: string | null;
          novel_id?: string;
          position?: number;
        };
        Relationships: [
          {
            foreignKeyName: "collection_items_collection_id_fkey";
            columns: ["collection_id"];
            isOneToOne: false;
            referencedRelation: "collections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "collection_items_novel_id_fkey";
            columns: ["novel_id"];
            isOneToOne: false;
            referencedRelation: "novels";
            referencedColumns: ["id"];
          },
        ];
      };
      collections: {
        Row: {
          cover_url: string | null;
          created_at: string;
          description: string | null;
          followers_count: number;
          id: string;
          is_collaborative: boolean;
          is_public: boolean;
          kind: string;
          name: string;
          novels_count: number;
          position: number;
          slug: string | null;
          smart_key: string | null;
          updated_at: string;
          user_id: string;
          views_count: number;
        };
        Insert: {
          cover_url?: string | null;
          created_at?: string;
          description?: string | null;
          followers_count?: number;
          id?: string;
          is_collaborative?: boolean;
          is_public?: boolean;
          kind?: string;
          name: string;
          novels_count?: number;
          position?: number;
          slug?: string | null;
          smart_key?: string | null;
          updated_at?: string;
          user_id: string;
          views_count?: number;
        };
        Update: {
          cover_url?: string | null;
          created_at?: string;
          description?: string | null;
          followers_count?: number;
          id?: string;
          is_collaborative?: boolean;
          is_public?: boolean;
          kind?: string;
          name?: string;
          novels_count?: number;
          position?: number;
          slug?: string | null;
          smart_key?: string | null;
          updated_at?: string;
          user_id?: string;
          views_count?: number;
        };
        Relationships: [];
      };
      comment_likes: {
        Row: {
          comment_id: string;
          created_at: string;
          user_id: string;
        };
        Insert: {
          comment_id: string;
          created_at?: string;
          user_id: string;
        };
        Update: {
          comment_id?: string;
          created_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey";
            columns: ["comment_id"];
            isOneToOne: false;
            referencedRelation: "comments";
            referencedColumns: ["id"];
          },
        ];
      };
      comments: {
        Row: {
          chapter_id: string | null;
          content: string;
          created_at: string;
          id: string;
          is_pinned: boolean;
          is_spoiler: boolean;
          likes_count: number;
          novel_id: string | null;
          parent_id: string | null;
          selection_hash: string | null;
          selection_text: string | null;
          user_id: string;
        };
        Insert: {
          chapter_id?: string | null;
          content: string;
          created_at?: string;
          id?: string;
          is_pinned?: boolean;
          is_spoiler?: boolean;
          likes_count?: number;
          novel_id?: string | null;
          parent_id?: string | null;
          selection_hash?: string | null;
          selection_text?: string | null;
          user_id: string;
        };
        Update: {
          chapter_id?: string | null;
          content?: string;
          created_at?: string;
          id?: string;
          is_pinned?: boolean;
          is_spoiler?: boolean;
          likes_count?: number;
          novel_id?: string | null;
          parent_id?: string | null;
          selection_hash?: string | null;
          selection_text?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comments_chapter_id_fkey";
            columns: ["chapter_id"];
            isOneToOne: false;
            referencedRelation: "chapters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_novel_id_fkey";
            columns: ["novel_id"];
            isOneToOne: false;
            referencedRelation: "novels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "comments";
            referencedColumns: ["id"];
          },
        ];
      };
      content_translations: {
        Row: {
          created_at: string;
          entity_id: string;
          entity_type: string;
          error: string | null;
          id: string;
          requested_by: string | null;
          status: string;
          target_lang: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          entity_id: string;
          entity_type: string;
          error?: string | null;
          id?: string;
          requested_by?: string | null;
          status?: string;
          target_lang: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          entity_id?: string;
          entity_type?: string;
          error?: string | null;
          id?: string;
          requested_by?: string | null;
          status?: string;
          target_lang?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      conversation_participants: {
        Row: {
          archived_at: string | null;
          conversation_id: string;
          joined_at: string;
          last_read_at: string | null;
          muted_until: string | null;
          notifications_enabled: boolean;
          role: string;
          user_id: string;
        };
        Insert: {
          archived_at?: string | null;
          conversation_id: string;
          joined_at?: string;
          last_read_at?: string | null;
          muted_until?: string | null;
          notifications_enabled?: boolean;
          role?: string;
          user_id: string;
        };
        Update: {
          archived_at?: string | null;
          conversation_id?: string;
          joined_at?: string;
          last_read_at?: string | null;
          muted_until?: string | null;
          notifications_enabled?: boolean;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      conversations: {
        Row: {
          closed_at: string | null;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          id: string;
          kind: string;
          last_message_at: string | null;
          metadata: Json;
          subject: string | null;
          updated_at: string;
        };
        Insert: {
          closed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          kind: string;
          last_message_at?: string | null;
          metadata?: Json;
          subject?: string | null;
          updated_at?: string;
        };
        Update: {
          closed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          kind?: string;
          last_message_at?: string | null;
          metadata?: Json;
          subject?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      coupons: {
        Row: {
          bonus_coins: number;
          code: string;
          created_at: string;
          discount_percent: number;
          expires_at: string | null;
          id: string;
          uses_left: number;
        };
        Insert: {
          bonus_coins?: number;
          code: string;
          created_at?: string;
          discount_percent?: number;
          expires_at?: string | null;
          id?: string;
          uses_left?: number;
        };
        Update: {
          bonus_coins?: number;
          code?: string;
          created_at?: string;
          discount_percent?: number;
          expires_at?: string | null;
          id?: string;
          uses_left?: number;
        };
        Relationships: [];
      };
      cron_registry: {
        Row: {
          code: string;
          created_at: string;
          description: string | null;
          id: string;
          is_enabled: boolean;
          last_result: string | null;
          last_run_at: string | null;
          name: string;
          schedule: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_enabled?: boolean;
          last_result?: string | null;
          last_run_at?: string | null;
          name: string;
          schedule: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_enabled?: boolean;
          last_result?: string | null;
          last_run_at?: string | null;
          name?: string;
          schedule?: string;
        };
        Relationships: [];
      };
      daily_missions: {
        Row: {
          battle_pass_enabled: boolean;
          category: string;
          code: string;
          coins: number;
          description_ar: string | null;
          description_en: string | null;
          difficulty: string;
          enabled: boolean;
          event_type: string;
          icon: string | null;
          reward: Json;
          season_id: string | null;
          season_xp: number;
          sort_order: number;
          target_kind: string;
          target_value: number;
          title_ar: string;
          title_en: string | null;
          xp: number;
        };
        Insert: {
          battle_pass_enabled?: boolean;
          category?: string;
          code: string;
          coins?: number;
          description_ar?: string | null;
          description_en?: string | null;
          difficulty?: string;
          enabled?: boolean;
          event_type?: string;
          icon?: string | null;
          reward?: Json;
          season_id?: string | null;
          season_xp?: number;
          sort_order?: number;
          target_kind: string;
          target_value?: number;
          title_ar: string;
          title_en?: string | null;
          xp?: number;
        };
        Update: {
          battle_pass_enabled?: boolean;
          category?: string;
          code?: string;
          coins?: number;
          description_ar?: string | null;
          description_en?: string | null;
          difficulty?: string;
          enabled?: boolean;
          event_type?: string;
          icon?: string | null;
          reward?: Json;
          season_id?: string | null;
          season_xp?: number;
          sort_order?: number;
          target_kind?: string;
          target_value?: number;
          title_ar?: string;
          title_en?: string | null;
          xp?: number;
        };
        Relationships: [
          {
            foreignKeyName: "daily_missions_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "season_events";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_shop: {
        Row: {
          created_at: string;
          day: string;
          discount_percent: number;
          id: string;
          item_id: string;
          sort_order: number;
        };
        Insert: {
          created_at?: string;
          day: string;
          discount_percent?: number;
          id?: string;
          item_id: string;
          sort_order?: number;
        };
        Update: {
          created_at?: string;
          day?: string;
          discount_percent?: number;
          id?: string;
          item_id?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "daily_shop_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "marketplace_items";
            referencedColumns: ["id"];
          },
        ];
      };
      email_templates: {
        Row: {
          body_ar: string;
          body_en: string | null;
          code: string;
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          subject_ar: string;
          subject_en: string | null;
          updated_at: string;
          variables: Json;
        };
        Insert: {
          body_ar: string;
          body_en?: string | null;
          code: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          subject_ar: string;
          subject_en?: string | null;
          updated_at?: string;
          variables?: Json;
        };
        Update: {
          body_ar?: string;
          body_en?: string | null;
          code?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          subject_ar?: string;
          subject_en?: string | null;
          updated_at?: string;
          variables?: Json;
        };
        Relationships: [];
      };
      faqs: {
        Row: {
          answer: string;
          answer_ar: string | null;
          answer_en: string | null;
          created_at: string;
          enabled: boolean;
          id: string;
          question: string;
          question_ar: string | null;
          question_en: string | null;
          sort_order: number;
        };
        Insert: {
          answer: string;
          answer_ar?: string | null;
          answer_en?: string | null;
          created_at?: string;
          enabled?: boolean;
          id?: string;
          question: string;
          question_ar?: string | null;
          question_en?: string | null;
          sort_order?: number;
        };
        Update: {
          answer?: string;
          answer_ar?: string | null;
          answer_en?: string | null;
          created_at?: string;
          enabled?: boolean;
          id?: string;
          question?: string;
          question_ar?: string | null;
          question_en?: string | null;
          sort_order?: number;
        };
        Relationships: [];
      };
      favorites: {
        Row: {
          created_at: string;
          novel_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          novel_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          novel_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "favorites_novel_id_fkey";
            columns: ["novel_id"];
            isOneToOne: false;
            referencedRelation: "novels";
            referencedColumns: ["id"];
          },
        ];
      };
      feature_request_votes: {
        Row: {
          created_at: string;
          request_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          request_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          request_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "feature_request_votes_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "feature_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      feature_requests: {
        Row: {
          admin_note: string | null;
          created_at: string;
          description: string;
          id: string;
          is_public: boolean;
          status: string;
          title: string;
          updated_at: string;
          user_id: string;
          votes_count: number;
        };
        Insert: {
          admin_note?: string | null;
          created_at?: string;
          description: string;
          id?: string;
          is_public?: boolean;
          status?: string;
          title: string;
          updated_at?: string;
          user_id: string;
          votes_count?: number;
        };
        Update: {
          admin_note?: string | null;
          created_at?: string;
          description?: string;
          id?: string;
          is_public?: boolean;
          status?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
          votes_count?: number;
        };
        Relationships: [];
      };
      frames_catalog: {
        Row: {
          animation_url: string | null;
          code: string;
          created_at: string;
          enabled: boolean;
          image_url: string | null;
          kind: string;
          label_ar: string;
          label_en: string | null;
          rarity: string;
        };
        Insert: {
          animation_url?: string | null;
          code: string;
          created_at?: string;
          enabled?: boolean;
          image_url?: string | null;
          kind?: string;
          label_ar: string;
          label_en?: string | null;
          rarity?: string;
        };
        Update: {
          animation_url?: string | null;
          code?: string;
          created_at?: string;
          enabled?: boolean;
          image_url?: string | null;
          kind?: string;
          label_ar?: string;
          label_en?: string | null;
          rarity?: string;
        };
        Relationships: [];
      };
      genres: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          name_ar: string;
          name_en: string | null;
          slug: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name_ar: string;
          name_en?: string | null;
          slug: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name_ar?: string;
          name_en?: string | null;
          slug?: string;
        };
        Relationships: [];
      };
      homepage_sections: {
        Row: {
          algorithm: string;
          created_at: string;
          enabled: boolean;
          genre_slug: string | null;
          icon: string | null;
          id: string;
          limit_count: number;
          sort_order: number;
          subtitle: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          algorithm?: string;
          created_at?: string;
          enabled?: boolean;
          genre_slug?: string | null;
          icon?: string | null;
          id?: string;
          limit_count?: number;
          sort_order?: number;
          subtitle?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          algorithm?: string;
          created_at?: string;
          enabled?: boolean;
          genre_slug?: string | null;
          icon?: string | null;
          id?: string;
          limit_count?: number;
          sort_order?: number;
          subtitle?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      io_jobs: {
        Row: {
          actor_id: string | null;
          created_at: string;
          entity: string;
          id: string;
          kind: string;
          meta: Json;
          rows: number;
          status: string;
        };
        Insert: {
          actor_id?: string | null;
          created_at?: string;
          entity: string;
          id?: string;
          kind: string;
          meta?: Json;
          rows?: number;
          status?: string;
        };
        Update: {
          actor_id?: string | null;
          created_at?: string;
          entity?: string;
          id?: string;
          kind?: string;
          meta?: Json;
          rows?: number;
          status?: string;
        };
        Relationships: [];
      };
      leaderboard_snapshots: {
        Row: {
          computed_at: string;
          id: string;
          metric: string;
          period: string;
          rank: number;
          score: number;
          user_id: string;
        };
        Insert: {
          computed_at?: string;
          id?: string;
          metric: string;
          period: string;
          rank: number;
          score?: number;
          user_id: string;
        };
        Update: {
          computed_at?: string;
          id?: string;
          metric?: string;
          period?: string;
          rank?: number;
          score?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      marketplace_categories: {
        Row: {
          code: string;
          created_at: string;
          enabled: boolean;
          icon: string | null;
          label_ar: string;
          label_en: string | null;
          sort_order: number;
          vip_only: boolean;
        };
        Insert: {
          code: string;
          created_at?: string;
          enabled?: boolean;
          icon?: string | null;
          label_ar: string;
          label_en?: string | null;
          sort_order?: number;
          vip_only?: boolean;
        };
        Update: {
          code?: string;
          created_at?: string;
          enabled?: boolean;
          icon?: string | null;
          label_ar?: string;
          label_en?: string | null;
          sort_order?: number;
          vip_only?: boolean;
        };
        Relationships: [];
      };
      marketplace_items: {
        Row: {
          animation_url: string | null;
          category: string;
          code: string;
          created_at: string;
          description_ar: string | null;
          description_en: string | null;
          duration_days: number | null;
          ends_at: string | null;
          icon: string | null;
          id: string;
          image_url: string | null;
          is_active: boolean;
          max_per_user: number | null;
          original_price_coins: number | null;
          payload: Json;
          price_coins: number;
          rarity: string;
          sort_order: number;
          starts_at: string | null;
          stock: number | null;
          stock_sold: number;
          title_ar: string;
          title_en: string | null;
          updated_at: string;
          vip_only: boolean;
        };
        Insert: {
          animation_url?: string | null;
          category: string;
          code: string;
          created_at?: string;
          description_ar?: string | null;
          description_en?: string | null;
          duration_days?: number | null;
          ends_at?: string | null;
          icon?: string | null;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          max_per_user?: number | null;
          original_price_coins?: number | null;
          payload?: Json;
          price_coins?: number;
          rarity?: string;
          sort_order?: number;
          starts_at?: string | null;
          stock?: number | null;
          stock_sold?: number;
          title_ar: string;
          title_en?: string | null;
          updated_at?: string;
          vip_only?: boolean;
        };
        Update: {
          animation_url?: string | null;
          category?: string;
          code?: string;
          created_at?: string;
          description_ar?: string | null;
          description_en?: string | null;
          duration_days?: number | null;
          ends_at?: string | null;
          icon?: string | null;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          max_per_user?: number | null;
          original_price_coins?: number | null;
          payload?: Json;
          price_coins?: number;
          rarity?: string;
          sort_order?: number;
          starts_at?: string | null;
          stock?: number | null;
          stock_sold?: number;
          title_ar?: string;
          title_en?: string | null;
          updated_at?: string;
          vip_only?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "marketplace_items_category_fkey";
            columns: ["category"];
            isOneToOne: false;
            referencedRelation: "marketplace_categories";
            referencedColumns: ["code"];
          },
        ];
      };
      marketplace_purchases: {
        Row: {
          category: string;
          created_at: string;
          id: string;
          inventory_id: string | null;
          item_id: string | null;
          price_coins: number;
          qty: number;
          refunded_at: string | null;
          status: string;
          user_id: string;
        };
        Insert: {
          category: string;
          created_at?: string;
          id?: string;
          inventory_id?: string | null;
          item_id?: string | null;
          price_coins: number;
          qty?: number;
          refunded_at?: string | null;
          status?: string;
          user_id: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          id?: string;
          inventory_id?: string | null;
          item_id?: string | null;
          price_coins?: number;
          qty?: number;
          refunded_at?: string | null;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "marketplace_purchases_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "marketplace_items";
            referencedColumns: ["id"];
          },
        ];
      };
      message_attachments: {
        Row: {
          created_at: string;
          id: string;
          kind: string;
          message_id: string;
          meta: Json;
          mime: string | null;
          size_bytes: number | null;
          url: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          kind?: string;
          message_id: string;
          meta?: Json;
          mime?: string | null;
          size_bytes?: number | null;
          url: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          kind?: string;
          message_id?: string;
          meta?: Json;
          mime?: string | null;
          size_bytes?: number | null;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["id"];
          },
        ];
      };
      message_reactions: {
        Row: {
          created_at: string;
          emoji: string;
          message_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          emoji: string;
          message_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          emoji?: string;
          message_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          body: string | null;
          conversation_id: string;
          created_at: string;
          deleted_at: string | null;
          edited_at: string | null;
          id: string;
          kind: string;
          meta: Json;
          sender_id: string | null;
        };
        Insert: {
          body?: string | null;
          conversation_id: string;
          created_at?: string;
          deleted_at?: string | null;
          edited_at?: string | null;
          id?: string;
          kind?: string;
          meta?: Json;
          sender_id?: string | null;
        };
        Update: {
          body?: string | null;
          conversation_id?: string;
          created_at?: string;
          deleted_at?: string | null;
          edited_at?: string | null;
          id?: string;
          kind?: string;
          meta?: Json;
          sender_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          archived_at: string | null;
          body: string | null;
          body_ar: string | null;
          body_en: string | null;
          category: string;
          created_at: string;
          id: string;
          is_read: boolean;
          link: string | null;
          meta: Json;
          title: string;
          title_ar: string | null;
          title_en: string | null;
          type: string;
          user_id: string;
        };
        Insert: {
          archived_at?: string | null;
          body?: string | null;
          body_ar?: string | null;
          body_en?: string | null;
          category?: string;
          created_at?: string;
          id?: string;
          is_read?: boolean;
          link?: string | null;
          meta?: Json;
          title: string;
          title_ar?: string | null;
          title_en?: string | null;
          type?: string;
          user_id: string;
        };
        Update: {
          archived_at?: string | null;
          body?: string | null;
          body_ar?: string | null;
          body_en?: string | null;
          category?: string;
          created_at?: string;
          id?: string;
          is_read?: boolean;
          link?: string | null;
          meta?: Json;
          title?: string;
          title_ar?: string | null;
          title_en?: string | null;
          type?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      novel_embeddings: {
        Row: {
          content_hash: string | null;
          embedding: string | null;
          model: string;
          novel_id: string;
          source: string;
          updated_at: string;
        };
        Insert: {
          content_hash?: string | null;
          embedding?: string | null;
          model?: string;
          novel_id: string;
          source?: string;
          updated_at?: string;
        };
        Update: {
          content_hash?: string | null;
          embedding?: string | null;
          model?: string;
          novel_id?: string;
          source?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "novel_embeddings_novel_id_fkey";
            columns: ["novel_id"];
            isOneToOne: true;
            referencedRelation: "novels";
            referencedColumns: ["id"];
          },
        ];
      };
      novel_genres: {
        Row: {
          genre_id: string;
          novel_id: string;
        };
        Insert: {
          genre_id: string;
          novel_id: string;
        };
        Update: {
          genre_id?: string;
          novel_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "novel_genres_genre_id_fkey";
            columns: ["genre_id"];
            isOneToOne: false;
            referencedRelation: "genres";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "novel_genres_novel_id_fkey";
            columns: ["novel_id"];
            isOneToOne: false;
            referencedRelation: "novels";
            referencedColumns: ["id"];
          },
        ];
      };
      novel_ownership: {
        Row: {
          coins_spent: number;
          granted_at: string;
          id: string;
          novel_id: string;
          source: string;
          user_id: string;
        };
        Insert: {
          coins_spent?: number;
          granted_at?: string;
          id?: string;
          novel_id: string;
          source?: string;
          user_id: string;
        };
        Update: {
          coins_spent?: number;
          granted_at?: string;
          id?: string;
          novel_id?: string;
          source?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "novel_ownership_novel_id_fkey";
            columns: ["novel_id"];
            isOneToOne: false;
            referencedRelation: "novels";
            referencedColumns: ["id"];
          },
        ];
      };
      novel_tags: {
        Row: {
          novel_id: string;
          tag_id: string;
        };
        Insert: {
          novel_id: string;
          tag_id: string;
        };
        Update: {
          novel_id?: string;
          tag_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "novel_tags_novel_id_fkey";
            columns: ["novel_id"];
            isOneToOne: false;
            referencedRelation: "novels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "novel_tags_tag_id_fkey";
            columns: ["tag_id"];
            isOneToOne: false;
            referencedRelation: "tags";
            referencedColumns: ["id"];
          },
        ];
      };
      novels: {
        Row: {
          author: string;
          author_display_ar: string | null;
          author_display_en: string | null;
          coin_price: number;
          cover_url: string | null;
          created_at: string;
          description: string;
          description_ar: string | null;
          description_en: string | null;
          id: string;
          is_featured: boolean;
          is_premium: boolean;
          is_published: boolean;
          is_upcoming: boolean;
          original_title: string | null;
          original_title_ar: string | null;
          original_title_en: string | null;
          owner_id: string | null;
          rating_avg: number;
          rating_count: number;
          release_date: string | null;
          slug: string;
          status: Database["public"]["Enums"]["novel_status"];
          title: string;
          title_ar: string | null;
          title_en: string | null;
          translator: string | null;
          translator_ar: string | null;
          translator_en: string | null;
          updated_at: string;
          views_count: number;
        };
        Insert: {
          author: string;
          author_display_ar?: string | null;
          author_display_en?: string | null;
          coin_price?: number;
          cover_url?: string | null;
          created_at?: string;
          description: string;
          description_ar?: string | null;
          description_en?: string | null;
          id?: string;
          is_featured?: boolean;
          is_premium?: boolean;
          is_published?: boolean;
          is_upcoming?: boolean;
          original_title?: string | null;
          original_title_ar?: string | null;
          original_title_en?: string | null;
          owner_id?: string | null;
          rating_avg?: number;
          rating_count?: number;
          release_date?: string | null;
          slug: string;
          status?: Database["public"]["Enums"]["novel_status"];
          title: string;
          title_ar?: string | null;
          title_en?: string | null;
          translator?: string | null;
          translator_ar?: string | null;
          translator_en?: string | null;
          updated_at?: string;
          views_count?: number;
        };
        Update: {
          author?: string;
          author_display_ar?: string | null;
          author_display_en?: string | null;
          coin_price?: number;
          cover_url?: string | null;
          created_at?: string;
          description?: string;
          description_ar?: string | null;
          description_en?: string | null;
          id?: string;
          is_featured?: boolean;
          is_premium?: boolean;
          is_published?: boolean;
          is_upcoming?: boolean;
          original_title?: string | null;
          original_title_ar?: string | null;
          original_title_en?: string | null;
          owner_id?: string | null;
          rating_avg?: number;
          rating_count?: number;
          release_date?: string | null;
          slug?: string;
          status?: Database["public"]["Enums"]["novel_status"];
          title?: string;
          title_ar?: string | null;
          title_en?: string | null;
          translator?: string | null;
          translator_ar?: string | null;
          translator_en?: string | null;
          updated_at?: string;
          views_count?: number;
        };
        Relationships: [];
      };
      payment_methods: {
        Row: {
          account_details: string | null;
          code: string;
          config: Json;
          created_at: string;
          currency: string;
          enabled: boolean;
          id: string;
          instructions: string | null;
          kind: string;
          name_ar: string;
          name_en: string | null;
          qr_image_url: string | null;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          account_details?: string | null;
          code: string;
          config?: Json;
          created_at?: string;
          currency?: string;
          enabled?: boolean;
          id?: string;
          instructions?: string | null;
          kind: string;
          name_ar: string;
          name_en?: string | null;
          qr_image_url?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          account_details?: string | null;
          code?: string;
          config?: Json;
          created_at?: string;
          currency?: string;
          enabled?: boolean;
          id?: string;
          instructions?: string | null;
          kind?: string;
          name_ar?: string;
          name_en?: string | null;
          qr_image_url?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      payment_providers: {
        Row: {
          code: string;
          config: Json;
          created_at: string;
          enabled: boolean;
          is_live: boolean;
          kind: string;
          name_ar: string;
          name_en: string | null;
          sort_order: number;
          supports_recurring: boolean;
          updated_at: string;
        };
        Insert: {
          code: string;
          config?: Json;
          created_at?: string;
          enabled?: boolean;
          is_live?: boolean;
          kind: string;
          name_ar: string;
          name_en?: string | null;
          sort_order?: number;
          supports_recurring?: boolean;
          updated_at?: string;
        };
        Update: {
          code?: string;
          config?: Json;
          created_at?: string;
          enabled?: boolean;
          is_live?: boolean;
          kind?: string;
          name_ar?: string;
          name_en?: string | null;
          sort_order?: number;
          supports_recurring?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      payment_transactions: {
        Row: {
          amount_cents: number;
          created_at: string;
          currency: string;
          id: string;
          idempotency_key: string | null;
          kind: string;
          meta: Json;
          provider: string;
          provider_ref: string | null;
          raw: Json | null;
          status: string;
          subscription_id: string | null;
          target_ref: string | null;
          target_type: string | null;
          user_id: string | null;
        };
        Insert: {
          amount_cents: number;
          created_at?: string;
          currency?: string;
          id?: string;
          idempotency_key?: string | null;
          kind?: string;
          meta?: Json;
          provider: string;
          provider_ref?: string | null;
          raw?: Json | null;
          status?: string;
          subscription_id?: string | null;
          target_ref?: string | null;
          target_type?: string | null;
          user_id?: string | null;
        };
        Update: {
          amount_cents?: number;
          created_at?: string;
          currency?: string;
          id?: string;
          idempotency_key?: string | null;
          kind?: string;
          meta?: Json;
          provider?: string;
          provider_ref?: string | null;
          raw?: Json | null;
          status?: string;
          subscription_id?: string | null;
          target_ref?: string | null;
          target_type?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payment_transactions_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: false;
            referencedRelation: "vip_subscriptions";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          account_status: string;
          allow_spoilers: boolean;
          author_bio: string | null;
          avatar_url: string | null;
          bio: string | null;
          bio_ar: string | null;
          bio_en: string | null;
          country_code: string | null;
          cover_url: string | null;
          created_at: string;
          display_name: string | null;
          id: string;
          is_verified: boolean;
          is_vip: boolean;
          pref_language: string;
          pref_theme: string;
          social_links: Json;
          status_reason: string | null;
          suspended_until: string | null;
          updated_at: string;
          username: string;
          vip_expires_at: string | null;
        };
        Insert: {
          account_status?: string;
          allow_spoilers?: boolean;
          author_bio?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          bio_ar?: string | null;
          bio_en?: string | null;
          country_code?: string | null;
          cover_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          id: string;
          is_verified?: boolean;
          is_vip?: boolean;
          pref_language?: string;
          pref_theme?: string;
          social_links?: Json;
          status_reason?: string | null;
          suspended_until?: string | null;
          updated_at?: string;
          username: string;
          vip_expires_at?: string | null;
        };
        Update: {
          account_status?: string;
          allow_spoilers?: boolean;
          author_bio?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          bio_ar?: string | null;
          bio_en?: string | null;
          country_code?: string | null;
          cover_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          is_verified?: boolean;
          is_vip?: boolean;
          pref_language?: string;
          pref_theme?: string;
          social_links?: Json;
          status_reason?: string | null;
          suspended_until?: string | null;
          updated_at?: string;
          username?: string;
          vip_expires_at?: string | null;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          auth_key: string;
          created_at: string;
          endpoint: string;
          id: string;
          p256dh: string;
          user_agent: string | null;
          user_id: string;
        };
        Insert: {
          auth_key: string;
          created_at?: string;
          endpoint: string;
          id?: string;
          p256dh: string;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          auth_key?: string;
          created_at?: string;
          endpoint?: string;
          id?: string;
          p256dh?: string;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      rate_limit_counters: {
        Row: {
          action: string;
          count: number;
          id: string;
          user_id: string | null;
          window_start: string;
        };
        Insert: {
          action: string;
          count?: number;
          id?: string;
          user_id?: string | null;
          window_start?: string;
        };
        Update: {
          action?: string;
          count?: number;
          id?: string;
          user_id?: string | null;
          window_start?: string;
        };
        Relationships: [];
      };
      ratings: {
        Row: {
          created_at: string;
          id: string;
          likes_count: number;
          novel_id: string;
          review_body: string | null;
          review_title: string | null;
          score: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          likes_count?: number;
          novel_id: string;
          review_body?: string | null;
          review_title?: string | null;
          score: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          likes_count?: number;
          novel_id?: string;
          review_body?: string | null;
          review_title?: string | null;
          score?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ratings_novel_id_fkey";
            columns: ["novel_id"];
            isOneToOne: false;
            referencedRelation: "novels";
            referencedColumns: ["id"];
          },
        ];
      };
      reader_feedback: {
        Row: {
          category: string;
          created_at: string;
          id: string;
          message: string | null;
          page_url: string | null;
          rating: number;
          user_id: string | null;
        };
        Insert: {
          category?: string;
          created_at?: string;
          id?: string;
          message?: string | null;
          page_url?: string | null;
          rating: number;
          user_id?: string | null;
        };
        Update: {
          category?: string;
          created_at?: string;
          id?: string;
          message?: string | null;
          page_url?: string | null;
          rating?: number;
          user_id?: string | null;
        };
        Relationships: [];
      };
      reading_club_members: {
        Row: {
          club_id: string;
          joined_at: string;
          role: string;
          user_id: string;
        };
        Insert: {
          club_id: string;
          joined_at?: string;
          role?: string;
          user_id: string;
        };
        Update: {
          club_id?: string;
          joined_at?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reading_club_members_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "reading_clubs";
            referencedColumns: ["id"];
          },
        ];
      };
      reading_club_post_replies: {
        Row: {
          author_id: string;
          content: string;
          created_at: string;
          id: string;
          is_deleted: boolean;
          post_id: string;
        };
        Insert: {
          author_id: string;
          content: string;
          created_at?: string;
          id?: string;
          is_deleted?: boolean;
          post_id: string;
        };
        Update: {
          author_id?: string;
          content?: string;
          created_at?: string;
          id?: string;
          is_deleted?: boolean;
          post_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reading_club_post_replies_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "reading_club_posts";
            referencedColumns: ["id"];
          },
        ];
      };
      reading_club_posts: {
        Row: {
          author_id: string;
          chapter_id: string | null;
          club_id: string;
          content: string;
          created_at: string;
          id: string;
          is_deleted: boolean;
          is_pinned: boolean;
          like_count: number;
          novel_id: string | null;
          reply_count: number;
          title: string | null;
          updated_at: string;
        };
        Insert: {
          author_id: string;
          chapter_id?: string | null;
          club_id: string;
          content: string;
          created_at?: string;
          id?: string;
          is_deleted?: boolean;
          is_pinned?: boolean;
          like_count?: number;
          novel_id?: string | null;
          reply_count?: number;
          title?: string | null;
          updated_at?: string;
        };
        Update: {
          author_id?: string;
          chapter_id?: string | null;
          club_id?: string;
          content?: string;
          created_at?: string;
          id?: string;
          is_deleted?: boolean;
          is_pinned?: boolean;
          like_count?: number;
          novel_id?: string | null;
          reply_count?: number;
          title?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reading_club_posts_chapter_id_fkey";
            columns: ["chapter_id"];
            isOneToOne: false;
            referencedRelation: "chapters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reading_club_posts_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "reading_clubs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reading_club_posts_novel_id_fkey";
            columns: ["novel_id"];
            isOneToOne: false;
            referencedRelation: "novels";
            referencedColumns: ["id"];
          },
        ];
      };
      reading_clubs: {
        Row: {
          cover_url: string | null;
          created_at: string;
          description_ar: string | null;
          description_en: string | null;
          id: string;
          is_archived: boolean;
          is_private: boolean;
          member_count: number;
          name_ar: string;
          name_en: string | null;
          novel_id: string | null;
          owner_id: string;
          post_count: number;
          slug: string;
          updated_at: string;
        };
        Insert: {
          cover_url?: string | null;
          created_at?: string;
          description_ar?: string | null;
          description_en?: string | null;
          id?: string;
          is_archived?: boolean;
          is_private?: boolean;
          member_count?: number;
          name_ar: string;
          name_en?: string | null;
          novel_id?: string | null;
          owner_id: string;
          post_count?: number;
          slug: string;
          updated_at?: string;
        };
        Update: {
          cover_url?: string | null;
          created_at?: string;
          description_ar?: string | null;
          description_en?: string | null;
          id?: string;
          is_archived?: boolean;
          is_private?: boolean;
          member_count?: number;
          name_ar?: string;
          name_en?: string | null;
          novel_id?: string | null;
          owner_id?: string;
          post_count?: number;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reading_clubs_novel_id_fkey";
            columns: ["novel_id"];
            isOneToOne: false;
            referencedRelation: "novels";
            referencedColumns: ["id"];
          },
        ];
      };
      reading_effects_catalog: {
        Row: {
          code: string;
          created_at: string;
          css: Json;
          enabled: boolean;
          label_ar: string;
          label_en: string | null;
          rarity: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          css?: Json;
          enabled?: boolean;
          label_ar: string;
          label_en?: string | null;
          rarity?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          css?: Json;
          enabled?: boolean;
          label_ar?: string;
          label_en?: string | null;
          rarity?: string;
        };
        Relationships: [];
      };
      reading_goals: {
        Row: {
          daily_chapters: number;
          updated_at: string;
          user_id: string;
          weekly_chapters: number;
        };
        Insert: {
          daily_chapters?: number;
          updated_at?: string;
          user_id: string;
          weekly_chapters?: number;
        };
        Update: {
          daily_chapters?: number;
          updated_at?: string;
          user_id?: string;
          weekly_chapters?: number;
        };
        Relationships: [];
      };
      reading_history: {
        Row: {
          chapter_id: string;
          last_read_at: string;
          novel_id: string;
          progress: number;
          user_id: string;
        };
        Insert: {
          chapter_id: string;
          last_read_at?: string;
          novel_id: string;
          progress?: number;
          user_id: string;
        };
        Update: {
          chapter_id?: string;
          last_read_at?: string;
          novel_id?: string;
          progress?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reading_history_chapter_id_fkey";
            columns: ["chapter_id"];
            isOneToOne: false;
            referencedRelation: "chapters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reading_history_novel_id_fkey";
            columns: ["novel_id"];
            isOneToOne: false;
            referencedRelation: "novels";
            referencedColumns: ["id"];
          },
        ];
      };
      reading_progress: {
        Row: {
          chapter_id: string;
          novel_id: string;
          scroll_pct: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          chapter_id: string;
          novel_id: string;
          scroll_pct?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          chapter_id?: string;
          novel_id?: string;
          scroll_pct?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reading_progress_chapter_id_fkey";
            columns: ["chapter_id"];
            isOneToOne: false;
            referencedRelation: "chapters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reading_progress_novel_id_fkey";
            columns: ["novel_id"];
            isOneToOne: false;
            referencedRelation: "novels";
            referencedColumns: ["id"];
          },
        ];
      };
      reading_stats: {
        Row: {
          achievements: Json;
          completed_novels: number;
          current_streak: number;
          last_read_date: string | null;
          longest_session_min: number;
          longest_streak: number;
          sessions_count: number;
          total_chapters_read: number;
          total_minutes: number;
          updated_at: string;
          user_id: string;
          words_read: number;
        };
        Insert: {
          achievements?: Json;
          completed_novels?: number;
          current_streak?: number;
          last_read_date?: string | null;
          longest_session_min?: number;
          longest_streak?: number;
          sessions_count?: number;
          total_chapters_read?: number;
          total_minutes?: number;
          updated_at?: string;
          user_id: string;
          words_read?: number;
        };
        Update: {
          achievements?: Json;
          completed_novels?: number;
          current_streak?: number;
          last_read_date?: string | null;
          longest_session_min?: number;
          longest_streak?: number;
          sessions_count?: number;
          total_chapters_read?: number;
          total_minutes?: number;
          updated_at?: string;
          user_id?: string;
          words_read?: number;
        };
        Relationships: [];
      };
      reading_streaks: {
        Row: {
          current_streak: number;
          last_read_date: string | null;
          longest_streak: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          current_streak?: number;
          last_read_date?: string | null;
          longest_streak?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          current_streak?: number;
          last_read_date?: string | null;
          longest_streak?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      recommendation_feedback: {
        Row: {
          created_at: string;
          feedback: Database["public"]["Enums"]["rec_feedback_type"];
          id: string;
          novel_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          feedback: Database["public"]["Enums"]["rec_feedback_type"];
          id?: string;
          novel_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          feedback?: Database["public"]["Enums"]["rec_feedback_type"];
          id?: string;
          novel_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recommendation_feedback_novel_id_fkey";
            columns: ["novel_id"];
            isOneToOne: false;
            referencedRelation: "novels";
            referencedColumns: ["id"];
          },
        ];
      };
      referral_codes: {
        Row: {
          code: string;
          created_at: string;
          user_id: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          user_id: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      referrals: {
        Row: {
          code: string;
          created_at: string;
          invitee_id: string;
          inviter_id: string;
          rewarded: boolean;
        };
        Insert: {
          code: string;
          created_at?: string;
          invitee_id: string;
          inviter_id: string;
          rewarded?: boolean;
        };
        Update: {
          code?: string;
          created_at?: string;
          invitee_id?: string;
          inviter_id?: string;
          rewarded?: boolean;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          admin_notes: string | null;
          content: string;
          created_at: string;
          id: string;
          reporter_email: string | null;
          reporter_id: string | null;
          reporter_name: string | null;
          status: string;
          subject: string | null;
          target_id: string | null;
          target_url: string | null;
          type: string;
          updated_at: string;
        };
        Insert: {
          admin_notes?: string | null;
          content: string;
          created_at?: string;
          id?: string;
          reporter_email?: string | null;
          reporter_id?: string | null;
          reporter_name?: string | null;
          status?: string;
          subject?: string | null;
          target_id?: string | null;
          target_url?: string | null;
          type: string;
          updated_at?: string;
        };
        Update: {
          admin_notes?: string | null;
          content?: string;
          created_at?: string;
          id?: string;
          reporter_email?: string | null;
          reporter_id?: string | null;
          reporter_name?: string | null;
          status?: string;
          subject?: string | null;
          target_id?: string | null;
          target_url?: string | null;
          type?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      reputation: {
        Row: {
          score: number;
          tier: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          score?: number;
          tier?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          score?: number;
          tier?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      review_likes: {
        Row: {
          created_at: string;
          rating_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          rating_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          rating_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "review_likes_rating_id_fkey";
            columns: ["rating_id"];
            isOneToOne: false;
            referencedRelation: "ratings";
            referencedColumns: ["id"];
          },
        ];
      };
      reward_box_pool: {
        Row: {
          enabled: boolean;
          id: string;
          label: string;
          reward: Json;
          weight: number;
        };
        Insert: {
          enabled?: boolean;
          id?: string;
          label: string;
          reward: Json;
          weight?: number;
        };
        Update: {
          enabled?: boolean;
          id?: string;
          label?: string;
          reward?: Json;
          weight?: number;
        };
        Relationships: [];
      };
      reward_boxes: {
        Row: {
          created_at: string;
          id: string;
          opened: boolean;
          opened_at: string | null;
          reward: Json | null;
          source: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          opened?: boolean;
          opened_at?: string | null;
          reward?: Json | null;
          source?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          opened?: boolean;
          opened_at?: string | null;
          reward?: Json | null;
          source?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      search_history: {
        Row: {
          created_at: string;
          id: number;
          query: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: number;
          query: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: number;
          query?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      season_events: {
        Row: {
          config: Json;
          cover_url: string | null;
          created_at: string;
          description_ar: string | null;
          description_en: string | null;
          enabled: boolean;
          ends_at: string;
          id: string;
          is_battle_pass: boolean;
          max_tier: number;
          premium_price_coins: number;
          slug: string | null;
          starts_at: string;
          title_ar: string;
          title_en: string | null;
          xp_per_tier: number;
        };
        Insert: {
          config?: Json;
          cover_url?: string | null;
          created_at?: string;
          description_ar?: string | null;
          description_en?: string | null;
          enabled?: boolean;
          ends_at: string;
          id?: string;
          is_battle_pass?: boolean;
          max_tier?: number;
          premium_price_coins?: number;
          slug?: string | null;
          starts_at: string;
          title_ar: string;
          title_en?: string | null;
          xp_per_tier?: number;
        };
        Update: {
          config?: Json;
          cover_url?: string | null;
          created_at?: string;
          description_ar?: string | null;
          description_en?: string | null;
          enabled?: boolean;
          ends_at?: string;
          id?: string;
          is_battle_pass?: boolean;
          max_tier?: number;
          premium_price_coins?: number;
          slug?: string | null;
          starts_at?: string;
          title_ar?: string;
          title_en?: string | null;
          xp_per_tier?: number;
        };
        Relationships: [];
      };
      seo_overrides: {
        Row: {
          description_ar: string | null;
          description_en: string | null;
          id: string;
          og_image: string | null;
          path: string;
          robots: string | null;
          title_ar: string | null;
          title_en: string | null;
          updated_at: string;
        };
        Insert: {
          description_ar?: string | null;
          description_en?: string | null;
          id?: string;
          og_image?: string | null;
          path: string;
          robots?: string | null;
          title_ar?: string | null;
          title_en?: string | null;
          updated_at?: string;
        };
        Update: {
          description_ar?: string | null;
          description_en?: string | null;
          id?: string;
          og_image?: string | null;
          path?: string;
          robots?: string | null;
          title_ar?: string | null;
          title_en?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      site_settings: {
        Row: {
          key: string;
          updated_at: string;
          value: Json;
          value_ar: Json | null;
          value_en: Json | null;
        };
        Insert: {
          key: string;
          updated_at?: string;
          value: Json;
          value_ar?: Json | null;
          value_en?: Json | null;
        };
        Update: {
          key?: string;
          updated_at?: string;
          value?: Json;
          value_ar?: Json | null;
          value_en?: Json | null;
        };
        Relationships: [];
      };
      spam_words: {
        Row: {
          created_at: string;
          id: string;
          severity: number;
          word: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          severity?: number;
          word: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          severity?: number;
          word?: string;
        };
        Relationships: [];
      };
      static_pages: {
        Row: {
          body_html: string;
          body_html_ar: string | null;
          body_html_en: string | null;
          created_at: string;
          id: string;
          is_published: boolean;
          slug: string;
          title: string;
          title_ar: string | null;
          title_en: string | null;
          updated_at: string;
        };
        Insert: {
          body_html?: string;
          body_html_ar?: string | null;
          body_html_en?: string | null;
          created_at?: string;
          id?: string;
          is_published?: boolean;
          slug: string;
          title: string;
          title_ar?: string | null;
          title_en?: string | null;
          updated_at?: string;
        };
        Update: {
          body_html?: string;
          body_html_ar?: string | null;
          body_html_en?: string | null;
          created_at?: string;
          id?: string;
          is_published?: boolean;
          slug?: string;
          title?: string;
          title_ar?: string | null;
          title_en?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      super_admins: {
        Row: {
          assigned_at: string;
          singleton: boolean;
          user_id: string;
        };
        Insert: {
          assigned_at?: string;
          singleton?: boolean;
          user_id: string;
        };
        Update: {
          assigned_at?: string;
          singleton?: boolean;
          user_id?: string;
        };
        Relationships: [];
      };
      support_ticket_messages: {
        Row: {
          attachments: Json;
          author_id: string;
          body: string;
          created_at: string;
          id: string;
          is_internal: boolean;
          ticket_id: string;
        };
        Insert: {
          attachments?: Json;
          author_id: string;
          body: string;
          created_at?: string;
          id?: string;
          is_internal?: boolean;
          ticket_id: string;
        };
        Update: {
          attachments?: Json;
          author_id?: string;
          body?: string;
          created_at?: string;
          id?: string;
          is_internal?: boolean;
          ticket_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey";
            columns: ["ticket_id"];
            isOneToOne: false;
            referencedRelation: "support_tickets";
            referencedColumns: ["id"];
          },
        ];
      };
      support_tickets: {
        Row: {
          assigned_to: string | null;
          body: string;
          category: string;
          context: Json;
          created_at: string;
          id: string;
          priority: string;
          status: string;
          subject: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          assigned_to?: string | null;
          body: string;
          category: string;
          context?: Json;
          created_at?: string;
          id?: string;
          priority?: string;
          status?: string;
          subject: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          assigned_to?: string | null;
          body?: string;
          category?: string;
          context?: Json;
          created_at?: string;
          id?: string;
          priority?: string;
          status?: string;
          subject?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      system_logs: {
        Row: {
          context: Json;
          created_at: string;
          id: string;
          level: string;
          message: string;
          source: string | null;
          user_id: string | null;
        };
        Insert: {
          context?: Json;
          created_at?: string;
          id?: string;
          level?: string;
          message: string;
          source?: string | null;
          user_id?: string | null;
        };
        Update: {
          context?: Json;
          created_at?: string;
          id?: string;
          level?: string;
          message?: string;
          source?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      tags: {
        Row: {
          created_at: string;
          id: string;
          name_ar: string;
          name_en: string | null;
          slug: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name_ar: string;
          name_en?: string | null;
          slug: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name_ar?: string;
          name_en?: string | null;
          slug?: string;
        };
        Relationships: [];
      };
      text_reactions: {
        Row: {
          chapter_id: string;
          created_at: string;
          emoji: string;
          id: string;
          selection_hash: string;
          selection_text: string;
          user_id: string;
        };
        Insert: {
          chapter_id: string;
          created_at?: string;
          emoji: string;
          id?: string;
          selection_hash: string;
          selection_text: string;
          user_id: string;
        };
        Update: {
          chapter_id?: string;
          created_at?: string;
          emoji?: string;
          id?: string;
          selection_hash?: string;
          selection_text?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "text_reactions_chapter_id_fkey";
            columns: ["chapter_id"];
            isOneToOne: false;
            referencedRelation: "chapters";
            referencedColumns: ["id"];
          },
        ];
      };
      themes_catalog: {
        Row: {
          code: string;
          created_at: string;
          css: Json;
          enabled: boolean;
          label_ar: string;
          label_en: string | null;
          preview_url: string | null;
          rarity: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          css?: Json;
          enabled?: boolean;
          label_ar: string;
          label_en?: string | null;
          preview_url?: string | null;
          rarity?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          css?: Json;
          enabled?: boolean;
          label_ar?: string;
          label_en?: string | null;
          preview_url?: string | null;
          rarity?: string;
        };
        Relationships: [];
      };
      titles_catalog: {
        Row: {
          code: string;
          color: string | null;
          created_at: string;
          enabled: boolean;
          label_ar: string;
          label_en: string | null;
          rarity: string;
          vip_only: boolean;
        };
        Insert: {
          code: string;
          color?: string | null;
          created_at?: string;
          enabled?: boolean;
          label_ar: string;
          label_en?: string | null;
          rarity?: string;
          vip_only?: boolean;
        };
        Update: {
          code?: string;
          color?: string | null;
          created_at?: string;
          enabled?: boolean;
          label_ar?: string;
          label_en?: string | null;
          rarity?: string;
          vip_only?: boolean;
        };
        Relationships: [];
      };
      user_achievements: {
        Row: {
          achievement_code: string;
          unlocked_at: string;
          user_id: string;
        };
        Insert: {
          achievement_code: string;
          unlocked_at?: string;
          user_id: string;
        };
        Update: {
          achievement_code?: string;
          unlocked_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_code_fkey";
            columns: ["achievement_code"];
            isOneToOne: false;
            referencedRelation: "achievements";
            referencedColumns: ["code"];
          },
        ];
      };
      user_badges: {
        Row: {
          awarded_at: string;
          badge_code: string;
          is_equipped: boolean;
          user_id: string;
        };
        Insert: {
          awarded_at?: string;
          badge_code: string;
          is_equipped?: boolean;
          user_id: string;
        };
        Update: {
          awarded_at?: string;
          badge_code?: string;
          is_equipped?: boolean;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_code_fkey";
            columns: ["badge_code"];
            isOneToOne: false;
            referencedRelation: "badges";
            referencedColumns: ["code"];
          },
        ];
      };
      user_blocks: {
        Row: {
          blocked_id: string;
          blocker_id: string;
          created_at: string;
          reason: string | null;
        };
        Insert: {
          blocked_id: string;
          blocker_id: string;
          created_at?: string;
          reason?: string | null;
        };
        Update: {
          blocked_id?: string;
          blocker_id?: string;
          created_at?: string;
          reason?: string | null;
        };
        Relationships: [];
      };
      user_daily_missions: {
        Row: {
          claimed: boolean;
          claimed_at: string | null;
          completed: boolean;
          completed_at: string | null;
          day: string;
          mission_code: string;
          notified: boolean;
          progress: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          claimed?: boolean;
          claimed_at?: string | null;
          completed?: boolean;
          completed_at?: string | null;
          day?: string;
          mission_code: string;
          notified?: boolean;
          progress?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          claimed?: boolean;
          claimed_at?: string | null;
          completed?: boolean;
          completed_at?: string | null;
          day?: string;
          mission_code?: string;
          notified?: boolean;
          progress?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_daily_missions_mission_code_fkey";
            columns: ["mission_code"];
            isOneToOne: false;
            referencedRelation: "daily_missions";
            referencedColumns: ["code"];
          },
        ];
      };
      user_equipment: {
        Row: {
          equipped_at: string;
          inventory_id: string | null;
          item_code: string | null;
          slot: string;
          user_id: string;
        };
        Insert: {
          equipped_at?: string;
          inventory_id?: string | null;
          item_code?: string | null;
          slot: string;
          user_id: string;
        };
        Update: {
          equipped_at?: string;
          inventory_id?: string | null;
          item_code?: string | null;
          slot?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_equipment_inventory_id_fkey";
            columns: ["inventory_id"];
            isOneToOne: false;
            referencedRelation: "user_inventory";
            referencedColumns: ["id"];
          },
        ];
      };
      user_follows: {
        Row: {
          created_at: string;
          followed_id: string;
          follower_id: string;
        };
        Insert: {
          created_at?: string;
          followed_id: string;
          follower_id: string;
        };
        Update: {
          created_at?: string;
          followed_id?: string;
          follower_id?: string;
        };
        Relationships: [];
      };
      user_inventory: {
        Row: {
          acquired_at: string;
          category: string;
          expires_at: string | null;
          id: string;
          is_equipped: boolean;
          item_code: string | null;
          marketplace_item_id: string | null;
          meta: Json;
          source: string;
          user_id: string;
        };
        Insert: {
          acquired_at?: string;
          category: string;
          expires_at?: string | null;
          id?: string;
          is_equipped?: boolean;
          item_code?: string | null;
          marketplace_item_id?: string | null;
          meta?: Json;
          source?: string;
          user_id: string;
        };
        Update: {
          acquired_at?: string;
          category?: string;
          expires_at?: string | null;
          id?: string;
          is_equipped?: boolean;
          item_code?: string | null;
          marketplace_item_id?: string | null;
          meta?: Json;
          source?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_inventory_marketplace_item_id_fkey";
            columns: ["marketplace_item_id"];
            isOneToOne: false;
            referencedRelation: "marketplace_items";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      user_season_progress: {
        Row: {
          claimed_tiers: number[];
          season_id: string;
          tier: number;
          updated_at: string;
          user_id: string;
          xp: number;
        };
        Insert: {
          claimed_tiers?: number[];
          season_id: string;
          tier?: number;
          updated_at?: string;
          user_id: string;
          xp?: number;
        };
        Update: {
          claimed_tiers?: number[];
          season_id?: string;
          tier?: number;
          updated_at?: string;
          user_id?: string;
          xp?: number;
        };
        Relationships: [
          {
            foreignKeyName: "user_season_progress_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "season_events";
            referencedColumns: ["id"];
          },
        ];
      };
      user_taste_embeddings: {
        Row: {
          embedding: string | null;
          model: string;
          sample_size: number;
          source: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          embedding?: string | null;
          model?: string;
          sample_size?: number;
          source?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          embedding?: string | null;
          model?: string;
          sample_size?: number;
          source?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_weekly_challenges: {
        Row: {
          challenge_id: string;
          claimed: boolean;
          claimed_at: string | null;
          completed: boolean;
          completed_at: string | null;
          notified: boolean;
          progress: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          challenge_id: string;
          claimed?: boolean;
          claimed_at?: string | null;
          completed?: boolean;
          completed_at?: string | null;
          notified?: boolean;
          progress?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          challenge_id?: string;
          claimed?: boolean;
          claimed_at?: string | null;
          completed?: boolean;
          completed_at?: string | null;
          notified?: boolean;
          progress?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_weekly_challenges_challenge_id_fkey";
            columns: ["challenge_id"];
            isOneToOne: false;
            referencedRelation: "weekly_challenges";
            referencedColumns: ["id"];
          },
        ];
      };
      user_xp: {
        Row: {
          level: number;
          total_xp: number;
          updated_at: string;
          user_id: string;
          xp: number;
        };
        Insert: {
          level?: number;
          total_xp?: number;
          updated_at?: string;
          user_id: string;
          xp?: number;
        };
        Update: {
          level?: number;
          total_xp?: number;
          updated_at?: string;
          user_id?: string;
          xp?: number;
        };
        Relationships: [];
      };
      vip_plans: {
        Row: {
          code: string;
          created_at: string;
          currency: string;
          description_ar: string | null;
          description_en: string | null;
          discount_percent: number;
          duration_days: number;
          features: Json;
          id: string;
          is_active: boolean;
          is_recommended: boolean;
          name_ar: string;
          name_en: string | null;
          price_cents: number;
          price_egp_cents: number | null;
          price_usd_cents: number | null;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          currency?: string;
          description_ar?: string | null;
          description_en?: string | null;
          discount_percent?: number;
          duration_days: number;
          features?: Json;
          id?: string;
          is_active?: boolean;
          is_recommended?: boolean;
          name_ar: string;
          name_en?: string | null;
          price_cents: number;
          price_egp_cents?: number | null;
          price_usd_cents?: number | null;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          currency?: string;
          description_ar?: string | null;
          description_en?: string | null;
          discount_percent?: number;
          duration_days?: number;
          features?: Json;
          id?: string;
          is_active?: boolean;
          is_recommended?: boolean;
          name_ar?: string;
          name_en?: string | null;
          price_cents?: number;
          price_egp_cents?: number | null;
          price_usd_cents?: number | null;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      vip_subscriptions: {
        Row: {
          created_at: string;
          expires_at: string | null;
          id: string;
          plan_id: string | null;
          provider: string | null;
          provider_subscription_id: string | null;
          started_at: string | null;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          plan_id?: string | null;
          provider?: string | null;
          provider_subscription_id?: string | null;
          started_at?: string | null;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          plan_id?: string | null;
          provider?: string | null;
          provider_subscription_id?: string | null;
          started_at?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vip_subscriptions_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "vip_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      wallets: {
        Row: {
          coins: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          coins?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          coins?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      weekly_challenges: {
        Row: {
          battle_pass_enabled: boolean;
          category: string;
          coins: number;
          created_at: string;
          description_ar: string | null;
          description_en: string | null;
          difficulty: string;
          enabled: boolean;
          ends_at: string;
          event_type: string;
          icon: string | null;
          id: string;
          reward: Json;
          season_id: string | null;
          season_xp: number;
          starts_at: string;
          target_kind: string;
          target_value: number;
          title_ar: string;
          title_en: string | null;
          xp: number;
        };
        Insert: {
          battle_pass_enabled?: boolean;
          category?: string;
          coins?: number;
          created_at?: string;
          description_ar?: string | null;
          description_en?: string | null;
          difficulty?: string;
          enabled?: boolean;
          ends_at?: string;
          event_type?: string;
          icon?: string | null;
          id?: string;
          reward?: Json;
          season_id?: string | null;
          season_xp?: number;
          starts_at?: string;
          target_kind: string;
          target_value?: number;
          title_ar: string;
          title_en?: string | null;
          xp?: number;
        };
        Update: {
          battle_pass_enabled?: boolean;
          category?: string;
          coins?: number;
          created_at?: string;
          description_ar?: string | null;
          description_en?: string | null;
          difficulty?: string;
          enabled?: boolean;
          ends_at?: string;
          event_type?: string;
          icon?: string | null;
          id?: string;
          reward?: Json;
          season_id?: string | null;
          season_xp?: number;
          starts_at?: string;
          target_kind?: string;
          target_value?: number;
          title_ar?: string;
          title_en?: string | null;
          xp?: number;
        };
        Relationships: [
          {
            foreignKeyName: "weekly_challenges_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "season_events";
            referencedColumns: ["id"];
          },
        ];
      };
      withdrawal_requests: {
        Row: {
          admin_note: string | null;
          author_id: string;
          coins: number;
          created_at: string;
          fee_coins: number;
          id: string;
          method_code: string;
          payout_account: string;
          provider: string;
          provider_ref: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: string;
        };
        Insert: {
          admin_note?: string | null;
          author_id: string;
          coins: number;
          created_at?: string;
          fee_coins?: number;
          id?: string;
          method_code: string;
          payout_account: string;
          provider?: string;
          provider_ref?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string;
        };
        Update: {
          admin_note?: string | null;
          author_id?: string;
          coins?: number;
          created_at?: string;
          fee_coins?: number;
          id?: string;
          method_code?: string;
          payout_account?: string;
          provider?: string;
          provider_ref?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string;
        };
        Relationships: [];
      };
      xp_events: {
        Row: {
          code: string;
          coins: number;
          created_at: string;
          day: string;
          id: string;
          meta: Json;
          ref_key: string | null;
          user_id: string;
          xp: number;
        };
        Insert: {
          code: string;
          coins?: number;
          created_at?: string;
          day?: string;
          id?: string;
          meta?: Json;
          ref_key?: string | null;
          user_id: string;
          xp?: number;
        };
        Update: {
          code?: string;
          coins?: number;
          created_at?: string;
          day?: string;
          id?: string;
          meta?: Json;
          ref_key?: string | null;
          user_id?: string;
          xp?: number;
        };
        Relationships: [];
      };
      xp_rules: {
        Row: {
          code: string;
          coins: number;
          daily_cap: number;
          enabled: boolean;
          updated_at: string;
          xp: number;
        };
        Insert: {
          code: string;
          coins?: number;
          daily_cap?: number;
          enabled?: boolean;
          updated_at?: string;
          xp?: number;
        };
        Update: {
          code?: string;
          coins?: number;
          daily_cap?: number;
          enabled?: boolean;
          updated_at?: string;
          xp?: number;
        };
        Relationships: [];
      };
    };
    Views: {
      profiles_public: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          created_at: string | null;
          display_name: string | null;
          id: string | null;
          username: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string | null;
          display_name?: string | null;
          id?: string | null;
          username?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string | null;
          display_name?: string | null;
          id?: string | null;
          username?: string | null;
        };
        Relationships: [];
      };
      search_trending: {
        Row: {
          hits: number | null;
          last_seen: string | null;
          query: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      _collections_gen_slug: { Args: never; Returns: string };
      _gm_apply_reward: {
        Args: { _reward: Json; _uid: string };
        Returns: undefined;
      };
      _gm_track_event: {
        Args: { _code: string; _meta?: Json; _ref_key?: string; _uid: string };
        Returns: undefined;
      };
      _msg_is_participant: {
        Args: { _conv: string; _uid: string };
        Returns: boolean;
      };
      _rec_excluded_novels: {
        Args: { p_user: string };
        Returns: {
          novel_id: string;
        }[];
      };
      admin_adjust_coins: {
        Args: { _delta: number; _note?: string; _user_id: string };
        Returns: Json;
      };
      admin_approve_coin_purchase: {
        Args: { _note?: string; _req_id: string };
        Returns: undefined;
      };
      admin_approve_withdrawal: {
        Args: { _note?: string; _req_id: string };
        Returns: undefined;
      };
      admin_author_analytics: { Args: { _author_id: string }; Returns: Json };
      admin_broadcast_notification: {
        Args: { _body: string; _link?: string; _title: string; _type?: string };
        Returns: number;
      };
      admin_dashboard_overview: { Args: never; Returns: Json };
      admin_grant_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: undefined;
      };
      admin_grant_vip: {
        Args: { _days: number; _user_id: string };
        Returns: undefined;
      };
      admin_list_users: {
        Args: { _limit?: number; _search?: string };
        Returns: {
          account_status: string;
          avatar_url: string;
          created_at: string;
          display_name: string;
          id: string;
          is_vip: boolean;
          status_reason: string;
          suspended_until: string;
          username: string;
          vip_expires_at: string;
        }[];
      };
      admin_novel_analytics: { Args: { _novel_id: string }; Returns: Json };
      admin_reject_coin_purchase: {
        Args: { _note?: string; _req_id: string };
        Returns: undefined;
      };
      admin_reject_withdrawal: {
        Args: { _note?: string; _req_id: string };
        Returns: undefined;
      };
      admin_revoke_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: undefined;
      };
      admin_revoke_vip: { Args: { _user_id: string }; Returns: undefined };
      admin_set_account_status: {
        Args: {
          _reason?: string;
          _status: string;
          _until?: string;
          _user_id: string;
        };
        Returns: undefined;
      };
      admin_storage_stats: {
        Args: never;
        Returns: {
          bucket_id: string;
          files: number;
          total_bytes: number;
        }[];
      };
      admin_system_health: { Args: never; Returns: Json };
      admin_timeseries: {
        Args: { _days?: number };
        Returns: {
          day: string;
          new_chapters: number;
          new_novels: number;
          new_users: number;
          revenue_coins: number;
        }[];
      };
      ai_admin_delete_asset: {
        Args: { _kind?: string; _novel_id: string };
        Returns: number;
      };
      ai_assistant_conversations: {
        Args: { _novel_id: string };
        Returns: {
          allow_spoilers: boolean;
          id: string;
          is_pinned: boolean;
          message_count: number;
          title: string;
          updated_at: string;
        }[];
      };
      ai_assistant_create_conversation: {
        Args: { _allow_spoilers: boolean; _novel_id: string; _title: string };
        Returns: string;
      };
      ai_assistant_delete_conversation: {
        Args: { _id: string };
        Returns: undefined;
      };
      ai_assistant_messages: {
        Args: { _conversation_id: string };
        Returns: {
          content: string;
          created_at: string;
          id: string;
          role: string;
        }[];
      };
      ai_assistant_pin_conversation: {
        Args: { _id: string; _pinned: boolean };
        Returns: undefined;
      };
      ai_assistant_rename_conversation: {
        Args: { _id: string; _title: string };
        Returns: undefined;
      };
      ai_get_asset: {
        Args: { _kind: string; _lang?: string; _novel_id: string };
        Returns: {
          content: Json;
          id: string;
          scope_key: string;
          updated_at: string;
        }[];
      };
      ai_reader_context: {
        Args: { _novel_id: string };
        Returns: {
          allow_spoilers: boolean;
          last_chapter_id: string;
          last_chapter_index: number;
          progress_percent: number;
        }[];
      };
      approve_author_application: {
        Args: { _app_id: string; _note?: string };
        Returns: undefined;
      };
      author_revenue_summary: { Args: never; Returns: Json };
      author_revenue_timeseries: {
        Args: { _bucket?: string; _days?: number };
        Returns: {
          bucket_start: string;
          coins: number;
          tip_coins: number;
          unlock_coins: number;
        }[];
      };
      author_top_chapters: {
        Args: { _days?: number; _limit?: number };
        Returns: {
          chapter_id: string;
          chapter_number: number;
          coins: number;
          novel_id: string;
          novel_slug: string;
          novel_title: string;
          title: string;
        }[];
      };
      author_top_novels: {
        Args: { _days?: number; _limit?: number };
        Returns: {
          coins: number;
          cover_url: string;
          novel_id: string;
          slug: string;
          tip_coins: number;
          title: string;
          unlock_coins: number;
        }[];
      };
      bp_active_season: {
        Args: never;
        Returns: {
          cover_url: string;
          description_ar: string;
          description_en: string;
          ends_at: string;
          id: string;
          max_tier: number;
          premium_price_coins: number;
          slug: string;
          starts_at: string;
          title_ar: string;
          title_en: string;
          xp_per_tier: number;
        }[];
      };
      bp_admin_grant_premium: {
        Args: { _season_id: string; _source?: string; _user_id: string };
        Returns: boolean;
      };
      bp_claim_tier: {
        Args: { _season_id: string; _tier: number };
        Returns: Json;
      };
      bp_my_progress: {
        Args: { _season_id: string };
        Returns: {
          claimed_tiers: number[];
          has_premium: boolean;
          season_id: string;
          tier: number;
          xp: number;
        }[];
      };
      bp_purchase_premium: { Args: { _season_id: string }; Returns: boolean };
      bump_reading_streak: { Args: never; Returns: Json };
      can_read_chapter: { Args: { _chapter_id: string }; Returns: Json };
      check_rate_limit: {
        Args: { _action: string; _limit: number; _window_secs?: number };
        Returns: boolean;
      };
      club_create: {
        Args: {
          p_cover_url?: string;
          p_description_ar?: string;
          p_description_en?: string;
          p_is_private?: boolean;
          p_name_ar: string;
          p_name_en?: string;
          p_novel_id?: string;
          p_slug: string;
        };
        Returns: string;
      };
      club_join: { Args: { p_club_id: string }; Returns: undefined };
      club_leave: { Args: { p_club_id: string }; Returns: undefined };
      club_post_create: {
        Args: {
          p_chapter_id?: string;
          p_club_id: string;
          p_content: string;
          p_novel_id?: string;
          p_title?: string;
        };
        Returns: string;
      };
      club_reply_create: {
        Args: { p_content: string; p_post_id: string };
        Returns: string;
      };
      collection_bump_view: {
        Args: { _collection_id: string };
        Returns: undefined;
      };
      count_active_super_admins: { Args: never; Returns: number };
      creator_chapter_versions: {
        Args: { _chapter_id: string };
        Returns: {
          content_len_ar: number;
          content_len_en: number;
          created_at: string;
          editor_id: string;
          editor_name: string;
          id: string;
          note: string;
          title_ar: string;
          title_en: string;
          version_no: number;
        }[];
      };
      creator_completion_rates: {
        Args: { _novel_id?: string };
        Returns: {
          avg_progress: number;
          completion_pct: number;
          finished_readers: number;
          novel_id: string;
          slug: string;
          title: string;
          total_readers: number;
        }[];
      };
      creator_growth_timeseries: {
        Args: { _days?: number };
        Returns: {
          day: string;
          new_favorites: number;
          new_followers: number;
          reads: number;
        }[];
      };
      creator_kpis: { Args: never; Returns: Json };
      creator_publishing_calendar: {
        Args: { _days_back?: number; _days_forward?: number };
        Returns: {
          chapter_id: string;
          chapter_number: number;
          is_vip: boolean;
          novel_id: string;
          novel_slug: string;
          novel_title: string;
          published_at: string;
          scheduled_at: string;
          status: string;
          title: string;
        }[];
      };
      creator_reading_heatmap: {
        Args: { _days?: number; _novel_id: string };
        Returns: {
          dow: number;
          hour: number;
          reads: number;
        }[];
      };
      creator_reading_sources: {
        Args: { _days?: number; _novel_id?: string };
        Returns: {
          reads: number;
          source: string;
        }[];
      };
      creator_restore_chapter_version: {
        Args: { _version_id: string };
        Returns: string;
      };
      creator_top_countries: {
        Args: { _days?: number; _limit?: number; _novel_id?: string };
        Returns: {
          country_code: string;
          readers: number;
          reads: number;
        }[];
      };
      creator_top_readers: {
        Args: { _days?: number; _limit?: number; _novel_id?: string };
        Returns: {
          avatar_url: string;
          chapters_read: number;
          display_name: string;
          is_vip: boolean;
          last_read_at: string;
          user_id: string;
          username: string;
        }[];
      };
      gift_coins: {
        Args: {
          _amount: number;
          _author_id: string;
          _message?: string;
          _novel_id?: string;
        };
        Returns: Json;
      };
      gm_achievement_progress: { Args: never; Returns: Json };
      gm_activity_feed: {
        Args: { _before?: string; _limit?: number };
        Returns: {
          actor_avatar_url: string;
          actor_display_name: string;
          actor_id: string;
          actor_username: string;
          created_at: string;
          id: string;
          kind: string;
          meta: Json;
          ref_chapter_id: string;
          ref_novel_id: string;
          ref_user_id: string;
        }[];
      };
      gm_admin_grant: {
        Args: { _code: string; _ref?: string; _user: string };
        Returns: Json;
      };
      gm_admin_grant_achievement: {
        Args: { _code: string; _user: string };
        Returns: undefined;
      };
      gm_admin_grant_badge: {
        Args: { _code: string; _user: string };
        Returns: undefined;
      };
      gm_award: {
        Args: { _code: string; _meta?: Json; _ref_key?: string };
        Returns: Json;
      };
      gm_check_achievements: { Args: { _user: string }; Returns: number };
      gm_claim_challenge: { Args: { _id: string }; Returns: Json };
      gm_claim_mission: { Args: { _code: string }; Returns: Json };
      gm_generate_missions: {
        Args: { _count?: number; _difficulty?: string };
        Returns: number;
      };
      gm_get_or_create_referral_code: { Args: never; Returns: string };
      gm_grant_box: { Args: { _source?: string }; Returns: string };
      gm_leaderboard: {
        Args: { _limit?: number; _metric?: string; _period?: string };
        Returns: {
          avatar_url: string;
          display_name: string;
          rank: number;
          score: number;
          user_id: string;
          username: string;
        }[];
      };
      gm_level_from_xp: { Args: { _total_xp: number }; Returns: number };
      gm_mission_analytics: { Args: { _days?: number }; Returns: Json };
      gm_my_challenges: {
        Args: never;
        Returns: {
          category: string;
          claimed: boolean;
          coins: number;
          completed: boolean;
          description_ar: string;
          description_en: string;
          difficulty: string;
          ends_at: string;
          icon: string;
          id: string;
          progress: number;
          starts_at: string;
          target_kind: string;
          target_value: number;
          title_ar: string;
          title_en: string;
          xp: number;
        }[];
      };
      gm_my_missions: {
        Args: never;
        Returns: {
          claimed: boolean;
          code: string;
          coins: number;
          completed: boolean;
          progress: number;
          target_kind: string;
          target_value: number;
          title_ar: string;
          title_en: string;
          xp: number;
        }[];
      };
      gm_my_profile: { Args: never; Returns: Json };
      gm_open_box: { Args: { _id: string }; Returns: Json };
      gm_reading_stats: { Args: never; Returns: Json };
      gm_use_referral: { Args: { _code: string }; Returns: Json };
      gm_user_rank: { Args: { _user?: string }; Returns: Json };
      has_any_admin_role: { Args: { _user_id: string }; Returns: boolean };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      increment_chapter_view: {
        Args: { _chapter_id: string };
        Returns: undefined;
      };
      increment_novel_view: { Args: { _novel_id: string }; Returns: undefined };
      is_feature_enabled: { Args: { _flag: string }; Returns: boolean };
      is_novel_author: {
        Args: { _novel_id: string; _uid: string };
        Returns: boolean;
      };
      is_super_admin: { Args: { _user_id: string }; Returns: boolean };
      is_vip: { Args: { _user_id: string }; Returns: boolean };
      mk_admin_grant_item: {
        Args: { _item_id: string; _user: string };
        Returns: Json;
      };
      mk_buy_item: { Args: { _item_id: string; _qty?: number }; Returns: Json };
      mk_coin_history: {
        Args: { _before?: string; _limit?: number };
        Returns: {
          amount: number;
          balance_after: number;
          created_at: string;
          id: string;
          kind: string;
          note: string;
        }[];
      };
      mk_daily_shop: {
        Args: never;
        Returns: {
          category: string;
          code: string;
          discount_percent: number;
          ends_at: string;
          icon: string;
          image_url: string;
          item_id: string;
          price_coins: number;
          rarity: string;
          title_ar: string;
          title_en: string;
        }[];
      };
      mk_economy_dashboard: { Args: { _days?: number }; Returns: Json };
      mk_equip: { Args: { _inventory_id: string }; Returns: Json };
      mk_expire_inventory: { Args: never; Returns: number };
      mk_my_equipment: {
        Args: never;
        Returns: {
          equipped_at: string;
          inventory_id: string;
          item_code: string;
          slot: string;
        }[];
      };
      mk_my_inventory: {
        Args: never;
        Returns: {
          acquired_at: string;
          category: string;
          expires_at: string;
          icon: string;
          id: string;
          image_url: string;
          is_equipped: boolean;
          item_code: string;
          marketplace_item_id: string;
          meta: Json;
          rarity: string;
          source: string;
          title_ar: string;
          title_en: string;
        }[];
      };
      mk_purchase_history: {
        Args: { _before?: string; _limit?: number };
        Returns: {
          category: string;
          created_at: string;
          id: string;
          item_id: string;
          price_coins: number;
          qty: number;
          status: string;
          title_ar: string;
        }[];
      };
      mk_rotate_daily_shop: { Args: { _count?: number }; Returns: number };
      mk_unequip: { Args: { _slot: string }; Returns: Json };
      msg_admin_open_with_user: {
        Args: { _subject?: string; _user_id: string };
        Returns: string;
      };
      msg_archive: {
        Args: { _archived?: boolean; _conversation_id: string };
        Returns: boolean;
      };
      msg_block_user: {
        Args: { _other_user_id: string; _reason?: string };
        Returns: boolean;
      };
      msg_list_conversations: {
        Args: { _include_archived?: boolean; _limit?: number };
        Returns: {
          archived: boolean;
          conversation_id: string;
          kind: string;
          last_body: string;
          last_message_at: string;
          last_sender_id: string;
          muted: boolean;
          subject: string;
          unread_count: number;
        }[];
      };
      msg_list_messages: {
        Args: { _before?: string; _conversation_id: string; _limit?: number };
        Returns: {
          body: string;
          created_at: string;
          deleted_at: string;
          edited_at: string;
          id: string;
          kind: string;
          meta: Json;
          sender_id: string;
        }[];
      };
      msg_mark_read: { Args: { _conversation_id: string }; Returns: boolean };
      msg_mute: {
        Args: { _conversation_id: string; _minutes?: number };
        Returns: boolean;
      };
      msg_search: {
        Args: { _limit?: number; _q: string };
        Returns: {
          body: string;
          conversation_id: string;
          created_at: string;
          message_id: string;
          sender_id: string;
        }[];
      };
      msg_send: {
        Args: {
          _body: string;
          _conversation_id: string;
          _kind?: string;
          _meta?: Json;
        };
        Returns: string;
      };
      msg_soft_delete_message: {
        Args: { _message_id: string };
        Returns: boolean;
      };
      msg_start_dm: { Args: { _other_user_id: string }; Returns: string };
      msg_unblock_user: { Args: { _other_user_id: string }; Returns: boolean };
      notifications_archive: { Args: { _id: string }; Returns: boolean };
      notifications_mark_all_read: {
        Args: { _category?: string };
        Returns: number;
      };
      publish_due_chapters: { Args: never; Returns: number };
      purchase_novel: { Args: { _novel_id: string }; Returns: Json };
      rec_because_you_read: {
        Args: { p_limit?: number };
        Returns: {
          novel_id: string;
          reason_key: string;
          reason_params: Json;
          score: number;
        }[];
      };
      rec_for_you: {
        Args: { p_limit?: number };
        Returns: {
          novel_id: string;
          reason_key: string;
          reason_params: Json;
          score: number;
        }[];
      };
      rec_from_followed_authors: {
        Args: { p_limit?: number };
        Returns: {
          novel_id: string;
          reason_key: string;
          reason_params: Json;
          score: number;
        }[];
      };
      rec_hidden_gems: {
        Args: { p_limit?: number };
        Returns: {
          novel_id: string;
          reason_key: string;
          reason_params: Json;
          score: number;
        }[];
      };
      rec_more_like_this: {
        Args: { p_limit?: number; p_novel_id: string };
        Returns: {
          novel_id: string;
          reason_key: string;
          reason_params: Json;
          score: number;
        }[];
      };
      rec_popular_week: {
        Args: { p_limit?: number };
        Returns: {
          novel_id: string;
          reason_key: string;
          reason_params: Json;
          score: number;
        }[];
      };
      rec_readers_like_you: {
        Args: { p_limit?: number };
        Returns: {
          novel_id: string;
          reason_key: string;
          reason_params: Json;
          score: number;
        }[];
      };
      rec_recently_updated: {
        Args: { p_limit?: number };
        Returns: {
          novel_id: string;
          reason_key: string;
          reason_params: Json;
          score: number;
        }[];
      };
      rec_trending_today: {
        Args: { p_limit?: number };
        Returns: {
          novel_id: string;
          reason_key: string;
          reason_params: Json;
          score: number;
        }[];
      };
      reject_author_application: {
        Args: { _app_id: string; _note?: string };
        Returns: undefined;
      };
      request_withdrawal:
        | {
            Args: { _account: string; _coins: number; _method: string };
            Returns: string;
          }
        | {
            Args: {
              _account: string;
              _coins: number;
              _method: string;
              _provider?: string;
            };
            Returns: string;
          };
      show_limit: { Args: never; Returns: number };
      show_trgm: { Args: { "": string }; Returns: string[] };
      smart_collection_novels: {
        Args: { _kind: string; _limit?: number };
        Returns: {
          added_at: string;
          novel_id: string;
          rn: number;
        }[];
      };
      transfer_super_admin: { Args: { _to: string }; Returns: undefined };
      unlock_chapter: { Args: { _chapter_id: string }; Returns: Json };
    };
    Enums: {
      app_role: "admin" | "user" | "moderator" | "editor" | "author";
      chapter_status: "draft" | "scheduled" | "published";
      novel_status: "ongoing" | "completed" | "hiatus";
      rec_feedback_type: "like" | "hide" | "not_interested" | "already_read";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "moderator", "editor", "author"],
      chapter_status: ["draft", "scheduled", "published"],
      novel_status: ["ongoing", "completed", "hiatus"],
      rec_feedback_type: ["like", "hide", "not_interested", "already_read"],
    },
  },
} as const;
