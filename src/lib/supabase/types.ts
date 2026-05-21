/**
 * Hand-written types for the Supabase schema. Keep aligned with
 * supabase/migrations/*.sql.
 *
 * NOTE: Row/Insert/Update use `type` (not `interface`) so they satisfy
 * `Record<string, unknown>`, which is what @supabase/postgrest-js requires
 * for the typed query builder to surface column types.
 */

import type { AvatarConfig, Stats } from "@/lib/game/types";

export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  hue: number;
  created_at: string;
};

export type CharacterRow = {
  id: string;
  user_id: string;
  name: string;
  avatar_config: AvatarConfig;
  stats: Stats;
  current_node_id: string | null;
  created_at: string;
};

export type NodeRow = {
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
};

export type LocationIndexRow = {
  node_id: string;
  location: string;
  time_bucket: string;
  character_id: string;
  author_user_id: string;
  created_at: string;
};

export type CrossingRow = {
  id: string;
  node_a_id: string;
  node_b_id: string;
  location: string;
  time_bucket: string;
  created_at: string;
};

export type AncestryRpcRow = {
  id: string;
  parent_id: string | null;
  author_user_id: string;
  author_display_name: string;
  author_hue: number;
  character_id: string;
  scene_text: string;
  location: string;
  game_time: string;
  stats_snapshot: Stats;
  preset_choices: string[];
  chosen_action: string | null;
  created_at: string;
  depth: number;
};

export type SubtreeRpcRow = {
  id: string;
  parent_id: string | null;
  author_user_id: string;
  author_display_name: string;
  author_hue: number;
  character_id: string;
  scene_text: string;
  location: string;
  game_time: string;
  preset_choices: string[];
  chosen_action: string | null;
  created_at: string;
  depth: number;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & Pick<Profile, "id" | "display_name" | "hue">;
        Update: Partial<Profile>;
        Relationships: [];
      };
      characters: {
        Row: CharacterRow;
        Insert: Omit<CharacterRow, "id" | "created_at"> &
          Partial<Pick<CharacterRow, "id" | "created_at">>;
        Update: Partial<CharacterRow>;
        Relationships: [];
      };
      nodes: {
        Row: NodeRow;
        Insert: Omit<NodeRow, "id" | "created_at" | "is_public"> &
          Partial<Pick<NodeRow, "id" | "created_at" | "is_public">>;
        Update: Partial<NodeRow>;
        Relationships: [];
      };
      location_index: {
        Row: LocationIndexRow;
        Insert: LocationIndexRow;
        Update: Partial<LocationIndexRow>;
        Relationships: [];
      };
      crossings: {
        Row: CrossingRow;
        Insert: Omit<CrossingRow, "id" | "created_at"> &
          Partial<Pick<CrossingRow, "id" | "created_at">>;
        Update: Partial<CrossingRow>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      node_ancestry: {
        Args: { target: string };
        Returns: AncestryRpcRow[];
      };
      node_subtree: {
        Args: { target: string; max_depth?: number };
        Returns: SubtreeRpcRow[];
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
