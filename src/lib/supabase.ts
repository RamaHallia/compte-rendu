import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface EmailAttachment {
  name: string;
  url: string;
  size: number;
  type: string;
}

export interface LiveSuggestion {
  segment_number: number;
  summary: string;
  key_points: string[];
  suggestions: string[];
  topics_to_explore: string[];
  timestamp: number;
}

export interface Meeting {
  id: string;
  title: string;
  audio_url: string | null;
  transcript: string | null;
  display_transcript: string | null;
  summary: string | null;
  duration: number;
  created_at: string;
  user_id: string;
  participant_first_name: string | null;
  participant_last_name: string | null;
  participant_email: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  email_attachments: EmailAttachment[];
  notes: string | null;
  suggestions: LiveSuggestion[];
}
