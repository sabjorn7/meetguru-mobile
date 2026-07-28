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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

/** Convenience row-type helper: `Tables<'course'>`. */
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
