import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type Entity = {
  id: string;
  name: string;
  type: string;
  color: number;
  created_at: string;
  note_count?: number;
};

export type Note = {
  id: string;
  entity_id: string;
  who: string;
  body: string;
  attachment_url: string | null;
  attachment_name: string | null;
  created_at: string;
};
