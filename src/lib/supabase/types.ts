/**
 * Minimal hand-written types for the Supabase schema. We don't run
 * supabase-gen here; instead we keep these aligned with
 * supabase/migrations/0001_init.sql by hand.
 */

import type { AvatarConfig, Stats } from "@/lib/game/types";

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  hue: number;
  created_at: string;
}

export interface CharacterRow {
  id: string;
  user_id: string;
  name: string;
  avatar_config: AvatarConfig;
  stats: Stats;
  current_node_id: string | null;
  created_at: string;
}

export interface NodeRow {
  id: string;
  parent_id: string | null;
  author_user_id: string;
  character_id: string;
  scene_text: string;
  location: string;
  game_time: string;
  stats_snapshot: Stats;
  preset_choices: string[];
  chosen_action: string | null;
  is_public: boolean;
  created_at: string;
}

export interface LocationIndexRow {
  node_id: string;
  location: string;
  time_bucket: string;
  character_id: string;
  author_user_id: string;
  created_at: string;
}

export interface CrossingRow {
  id: string;
  node_a_id: string;
  node_b_id: string;
  location: string;
  time_bucket: string;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile> & Pick<Profile, "id" | "display_name" | "hue">; Update: Partial<Profile> };
      characters: {
        Row: CharacterRow;
        Insert: Omit<CharacterRow, "id" | "created_at"> & Partial<Pick<CharacterRow, "id" | "created_at">>;
        Update: Partial<CharacterRow>;
      };
      nodes: {
        Row: NodeRow;
        Insert: Omit<NodeRow, "id" | "created_at"> & Partial<Pick<NodeRow, "id" | "created_at">>;
        Update: Partial<NodeRow>;
      };
      location_index: {
        Row: LocationIndexRow;
        Insert: LocationIndexRow;
        Update: Partial<LocationIndexRow>;
      };
      crossings: {
        Row: CrossingRow;
        Insert: Omit<CrossingRow, "id" | "created_at"> & Partial<Pick<CrossingRow, "id" | "created_at">>;
        Update: Partial<CrossingRow>;
      };
    };
  };
}
