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
      users: {
        Row: {
          id: string;
          email: string;
          created_at: string | null;
          role: string | null;
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
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

/** Convenience row-type helper: `Tables<'course'>`. */
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
