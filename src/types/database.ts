/**
 * Supabase database types.
 *
 * Hand-maintained in the shape `supabase gen types typescript` produces, because
 * the self-hosted instance exposes no direct Postgres connection string for the
 * CLI to introspect (only the public anon key). Add tables here as screens need
 * them; when a DATABASE_URL becomes available this file can be regenerated.
 *
 * Note the legacy WeWeb column names: `Title`, `Decription` (misspelled),
 * `Free`, `Price`, `ModStatus`, etc.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      course: {
        Row: {
          id: string;
          created_at: string;
          Title: string | null;
          Decription: string | null;
          Free: boolean | null;
          Buy: boolean | null;
          For: string | null;
          owner: string | null;
          DurationPrice: number | null;
          WhatTeach: string | null;
          Category: string | null;
          DurationLong: number | null;
          Price: number | null;
          ModStatus: string | null;
          ModComplete: boolean | null;
          Less_Id: string[] | null;
          Teaser: string | null;
          video_id: string | null;
          resume_video_id: string | null;
          resume_chunk: string | null;
          resume_name: string | null;
          video_size: number | null;
          Edit_Comment: string | null;
          Edit_Lessons_Comment: string | null;
          folder: string | null;
          old_price: number | null;
          rating: Json | null;
          comment: Json | null;
          slug: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          Title?: string | null;
          Decription?: string | null;
          Free?: boolean | null;
          Buy?: boolean | null;
          For?: string | null;
          owner?: string | null;
          DurationPrice?: number | null;
          WhatTeach?: string | null;
          Category?: string | null;
          DurationLong?: number | null;
          Price?: number | null;
          ModStatus?: string | null;
          ModComplete?: boolean | null;
          Less_Id?: string[] | null;
          Teaser?: string | null;
          video_id?: string | null;
          resume_video_id?: string | null;
          resume_chunk?: string | null;
          resume_name?: string | null;
          video_size?: number | null;
          Edit_Comment?: string | null;
          Edit_Lessons_Comment?: string | null;
          folder?: string | null;
          old_price?: number | null;
          rating?: Json | null;
          comment?: Json | null;
          slug?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          Title?: string | null;
          Decription?: string | null;
          Free?: boolean | null;
          Buy?: boolean | null;
          For?: string | null;
          owner?: string | null;
          DurationPrice?: number | null;
          WhatTeach?: string | null;
          Category?: string | null;
          DurationLong?: number | null;
          Price?: number | null;
          ModStatus?: string | null;
          ModComplete?: boolean | null;
          Less_Id?: string[] | null;
          Teaser?: string | null;
          video_id?: string | null;
          resume_video_id?: string | null;
          resume_chunk?: string | null;
          resume_name?: string | null;
          video_size?: number | null;
          Edit_Comment?: string | null;
          Edit_Lessons_Comment?: string | null;
          folder?: string | null;
          old_price?: number | null;
          rating?: Json | null;
          comment?: Json | null;
          slug?: string | null;
        };
        Relationships: [];
      };
      lessons: {
        Row: {
          id: string;
          created_at: string;
          File: string | null;
          Title: string | null;
          Descr: string | null;
          Course: string | null;
          Video: string | null;
          video_id: string | null;
          resume_video_id: string | null;
          resume_chunk: string | null;
          resume_name: string | null;
          video_size: string | null;
          ban_list: string[] | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          File?: string | null;
          Title?: string | null;
          Descr?: string | null;
          Course?: string | null;
          Video?: string | null;
          video_id?: string | null;
          resume_video_id?: string | null;
          resume_chunk?: string | null;
          resume_name?: string | null;
          video_size?: string | null;
          ban_list?: string[] | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          File?: string | null;
          Title?: string | null;
          Descr?: string | null;
          Course?: string | null;
          Video?: string | null;
          video_id?: string | null;
          resume_video_id?: string | null;
          resume_chunk?: string | null;
          resume_name?: string | null;
          video_size?: string | null;
          ban_list?: string[] | null;
        };
        Relationships: [];
      };
      chats: {
        Row: {
          id: string;
          created_at: string;
          users: string[] | null;
          messages: string[] | null;
          read: string[] | null;
          user_1: string | null;
          user_2: string | null;
          mod_date: string | null;
          sort_date: string | null;
          title: string | null;
          is_group: boolean | null;
          creator: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          users?: string[] | null;
          messages?: string[] | null;
          read?: string[] | null;
          user_1?: string | null;
          user_2?: string | null;
          mod_date?: string | null;
          sort_date?: string | null;
          title?: string | null;
          is_group?: boolean | null;
          creator?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          users?: string[] | null;
          messages?: string[] | null;
          read?: string[] | null;
          user_1?: string | null;
          user_2?: string | null;
          mod_date?: string | null;
          sort_date?: string | null;
          title?: string | null;
          is_group?: boolean | null;
          creator?: string | null;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          created_at: string;
          creator: string | null;
          text: string | null;
          chat: string | null;
          user_2: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          creator?: string | null;
          text?: string | null;
          chat?: string | null;
          user_2?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          creator?: string | null;
          text?: string | null;
          chat?: string | null;
          user_2?: string | null;
        };
        Relationships: [];
      };
      articles: {
        Row: {
          id: string;
          created_at: string;
          Title: string | null;
          Content: string | null;
          Image: string | null;
          Publish_date: string | null;
          Status: string | null;
          Category: string | null;
          Rating: number[] | null;
          Comments: string[] | null;
          Creator: string | null;
          video_id: string | null;
          slug: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          Title?: string | null;
          Content?: string | null;
          Image?: string | null;
          Publish_date?: string | null;
          Status?: string | null;
          Category?: string | null;
          Rating?: number[] | null;
          Comments?: string[] | null;
          Creator?: string | null;
          video_id?: string | null;
          slug?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          Title?: string | null;
          Content?: string | null;
          Image?: string | null;
          Publish_date?: string | null;
          Status?: string | null;
          Category?: string | null;
          Rating?: number[] | null;
          Comments?: string[] | null;
          Creator?: string | null;
          video_id?: string | null;
          slug?: string | null;
        };
        Relationships: [];
      };
      articles_rating: {
        Row: {
          id: string;
          created_at: string;
          rating: number | null;
          article: string | null;
          author: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          rating?: number | null;
          article?: string | null;
          author?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          rating?: number | null;
          article?: string | null;
          author?: string | null;
        };
        Relationships: [];
      };
      article_comments: {
        Row: {
          id: string;
          created_at: string;
          text: string | null;
          creator: string | null;
          delete: boolean | null;
          Reply_to: string | null;
          article: string | null;
          replies: string[] | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          text?: string | null;
          creator?: string | null;
          delete?: boolean | null;
          Reply_to?: string | null;
          article?: string | null;
          replies?: string[] | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          text?: string | null;
          creator?: string | null;
          delete?: boolean | null;
          Reply_to?: string | null;
          article?: string | null;
          replies?: string[] | null;
        };
        Relationships: [];
      };
      push_tokens: {
        Row: {
          id: string;
          user_id: string;
          token: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          token: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          token?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          subscriber: string;
          target: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          subscriber: string;
          target: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          subscriber?: string;
          target?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      clubs: {
        Row: {
          id: string;
          created_at: string;
          owner: string | null;
          title: string | null;
          short_descr: string | null;
          descr: string | null;
          label: string | null;
          subs: string[] | null;
          price: number | null;
          active: boolean | null;
          sub_id: string | null;
        };
        Insert: { id?: string; created_at?: string };
        Update: { id?: string; created_at?: string };
        Relationships: [];
      };
      club_subs: {
        Row: {
          id: string;
          created_at: string;
          club: string | null;
          suber: string | null;
          active: boolean | null;
          end_date: string | null;
          customer_phone: string | null;
          customer_email: string | null;
          logs: unknown | null;
          customer_id: string | null;
        };
        Insert: { id?: string; created_at?: string; club: string; suber: string; active?: boolean };
        Update: { id?: string; active?: boolean; end_date?: string | null };
        Relationships: [];
      };
      club_posts: {
        Row: {
          id: string;
          created_at: string;
          club: string | null;
          text: string | null;
          comments: unknown | null;
          likes: { id: string; date?: string | null }[] | null;
          photos: string[] | null;
          video: string | null;
          date_send: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          club: string;
          text?: string | null;
          likes?: { id: string; date?: string | null }[];
          photos?: string[] | null;
          video?: string | null;
          date_send?: string | null;
        };
        Update: {
          id?: string;
          text?: string | null;
          likes?: { id: string; date?: string | null }[];
        };
        Relationships: [];
      };
      club_posts_comments: {
        Row: {
          id: string;
          created_at: string;
          text: string | null;
          club_post: string | null;
          onwer: string | null;
          img: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          text: string;
          club_post: string;
          onwer: string;
          img?: string | null;
        };
        Update: { id?: string; text?: string | null };
        Relationships: [];
      };
      club_chat: {
        Row: {
          id: string;
          created_at: string;
          text: string | null;
          img: string[] | null;
          owner: string | null;
          club: string | null;
          deleted: boolean | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          text?: string | null;
          img?: string[] | null;
          owner: string;
          club: string;
          deleted?: boolean;
        };
        Update: { id?: string; deleted?: boolean };
        Relationships: [];
      };
      order: {
        Row: {
          id: string;
          created_at: string;
          num: string | null;
          paid: boolean | null;
          summ: number | null;
          owner: string | null;
          subscription: boolean | null;
          course_positions: string[] | null;
        };
        Insert: { id?: string; created_at?: string };
        Update: { id?: string; created_at?: string };
        Relationships: [];
      };
      sales: {
        Row: {
          id: string;
          created_at: string;
          user: string | null;
          amount: number | null;
          price: number | null;
          position_name: string | null;
          position_category: string | null;
          status: string | null;
          back: boolean | null;
          sub: boolean | null;
        };
        Insert: { id?: string; created_at?: string };
        Update: { id?: string; created_at?: string };
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          email: string;
          created_at: string | null;
          role: string | null;
          Ammount: number | null;
          Photo: string | null;
          Name: string | null;
          Description: string | null;
          username: string | null;
          telegram_url: string | null;
          whatsapp_url: string | null;
          vk_url: string | null;
          youtube_url: string | null;
          website_url: string | null;
          booking_url: string | null;
          hide: { my?: boolean | null; buy?: boolean | null } | null;
        };
        Insert: {
          id: string;
          email: string;
          created_at?: string | null;
          role?: string | null;
          Photo?: string | null;
          Name?: string | null;
          Description?: string | null;
          username?: string | null;
          telegram_url?: string | null;
          whatsapp_url?: string | null;
          vk_url?: string | null;
          youtube_url?: string | null;
          website_url?: string | null;
          booking_url?: string | null;
          hide?: { my?: boolean | null; buy?: boolean | null } | null;
        };
        Update: {
          id?: string;
          email?: string;
          created_at?: string | null;
          role?: string | null;
          Photo?: string | null;
          Name?: string | null;
          Description?: string | null;
          username?: string | null;
          telegram_url?: string | null;
          whatsapp_url?: string | null;
          vk_url?: string | null;
          youtube_url?: string | null;
          website_url?: string | null;
          booking_url?: string | null;
          hide?: { my?: boolean | null; buy?: boolean | null } | null;
        };
        Relationships: [];
      };
      user_course: {
        Row: {
          id: string;
          created_at: string;
          course: string | null;
          user: string | null;
          Free: boolean | null;
          end_period: string | null;
          buy: boolean | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          course?: string | null;
          user?: string | null;
          Free?: boolean | null;
          end_period?: string | null;
          buy?: boolean | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          course?: string | null;
          user?: string | null;
          Free?: boolean | null;
          end_period?: string | null;
          buy?: boolean | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      add_user_to_chat_read: {
        Args: { p_chat_id: string; p_user_id: string };
        Returns: undefined;
      };
      get_user_chats: {
        Args: { p_user_id: string };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

/** Convenience row-type helper: `Tables<'course'>`. */
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
