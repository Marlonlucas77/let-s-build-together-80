export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      activities: {
        Row: {
          client_id: string | null;
          created_at: string;
          created_by: string | null;
          descricao: string;
          id: string;
          opportunity_id: string | null;
          quote_id: string | null;
          tipo: string;
          usuario: string | null;
        };
        Insert: {
          client_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          descricao: string;
          id?: string;
          opportunity_id?: string | null;
          quote_id?: string | null;
          tipo?: string;
          usuario?: string | null;
        };
        Update: {
          client_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          descricao?: string;
          id?: string;
          opportunity_id?: string | null;
          quote_id?: string | null;
          tipo?: string;
          usuario?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "activities_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activities_opportunity_id_fkey";
            columns: ["opportunity_id"];
            isOneToOne: false;
            referencedRelation: "opportunities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activities_quote_id_fkey";
            columns: ["quote_id"];
            isOneToOne: false;
            referencedRelation: "quotes";
            referencedColumns: ["id"];
          },
        ];
      };
      clients: {
        Row: {
          cep: string | null;
          cidade: string | null;
          cnpj: string | null;
          created_at: string;
          created_by: string | null;
          email: string | null;
          endereco: string | null;
          estado: string | null;
          id: string;
          nome_fantasia: string | null;
          observacoes: string | null;
          razao_social: string;
          site: string | null;
          telefone: string | null;
          updated_at: string;
          whatsapp: string | null;
        };
        Insert: {
          cep?: string | null;
          cidade?: string | null;
          cnpj?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          endereco?: string | null;
          estado?: string | null;
          id?: string;
          nome_fantasia?: string | null;
          observacoes?: string | null;
          razao_social: string;
          site?: string | null;
          telefone?: string | null;
          updated_at?: string;
          whatsapp?: string | null;
        };
        Update: {
          cep?: string | null;
          cidade?: string | null;
          cnpj?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          endereco?: string | null;
          estado?: string | null;
          id?: string;
          nome_fantasia?: string | null;
          observacoes?: string | null;
          razao_social?: string;
          site?: string | null;
          telefone?: string | null;
          updated_at?: string;
          whatsapp?: string | null;
        };
        Relationships: [];
      };
      contacts: {
        Row: {
          cargo: string | null;
          client_id: string;
          created_at: string;
          created_by: string | null;
          email: string | null;
          id: string;
          nome: string;
          observacoes: string | null;
          telefone: string | null;
          updated_at: string;
          whatsapp: string | null;
        };
        Insert: {
          cargo?: string | null;
          client_id: string;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          id?: string;
          nome: string;
          observacoes?: string | null;
          telefone?: string | null;
          updated_at?: string;
          whatsapp?: string | null;
        };
        Update: {
          cargo?: string | null;
          client_id?: string;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          id?: string;
          nome?: string;
          observacoes?: string | null;
          telefone?: string | null;
          updated_at?: string;
          whatsapp?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "contacts_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      follow_ups: {
        Row: {
          client_id: string | null;
          created_at: string;
          created_by: string | null;
          data: string;
          id: string;
          observacao: string | null;
          opportunity_id: string | null;
          proximo_followup: string | null;
          quote_id: string | null;
          responsavel: string | null;
          status: string;
          tipo: string;
          updated_at: string;
        };
        Insert: {
          client_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          data?: string;
          id?: string;
          observacao?: string | null;
          opportunity_id?: string | null;
          proximo_followup?: string | null;
          quote_id?: string | null;
          responsavel?: string | null;
          status?: string;
          tipo?: string;
          updated_at?: string;
        };
        Update: {
          client_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          data?: string;
          id?: string;
          observacao?: string | null;
          opportunity_id?: string | null;
          proximo_followup?: string | null;
          quote_id?: string | null;
          responsavel?: string | null;
          status?: string;
          tipo?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "follow_ups_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follow_ups_opportunity_id_fkey";
            columns: ["opportunity_id"];
            isOneToOne: false;
            referencedRelation: "opportunities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follow_ups_quote_id_fkey";
            columns: ["quote_id"];
            isOneToOne: false;
            referencedRelation: "quotes";
            referencedColumns: ["id"];
          },
        ];
      };
      loss_reasons: {
        Row: {
          ativo: boolean;
          created_at: string;
          id: string;
          nome: string;
        };
        Insert: {
          ativo?: boolean;
          created_at?: string;
          id?: string;
          nome: string;
        };
        Update: {
          ativo?: boolean;
          created_at?: string;
          id?: string;
          nome?: string;
        };
        Relationships: [];
      };
      opportunities: {
        Row: {
          client_id: string;
          contact_id: string | null;
          created_at: string;
          created_by: string | null;
          descricao: string | null;
          id: string;
          motivo_perda: string | null;
          numero: string | null;
          observacoes: string | null;
          origem: string | null;
          owner_id: string | null;
          prazo_desejado: string | null;
          probabilidade: number;
          produto_servico: string | null;
          responsavel: string | null;
          status: string;
          titulo: string;
          updated_at: string;
          valor_estimado: number;
        };
        Insert: {
          client_id: string;
          contact_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          descricao?: string | null;
          id?: string;
          motivo_perda?: string | null;
          numero?: string | null;
          observacoes?: string | null;
          origem?: string | null;
          owner_id?: string | null;
          prazo_desejado?: string | null;
          probabilidade?: number;
          produto_servico?: string | null;
          responsavel?: string | null;
          status?: string;
          titulo: string;
          updated_at?: string;
          valor_estimado?: number;
        };
        Update: {
          client_id?: string;
          contact_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          descricao?: string | null;
          id?: string;
          motivo_perda?: string | null;
          numero?: string | null;
          observacoes?: string | null;
          origem?: string | null;
          owner_id?: string | null;
          prazo_desejado?: string | null;
          probabilidade?: number;
          produto_servico?: string | null;
          responsavel?: string | null;
          status?: string;
          titulo?: string;
          updated_at?: string;
          valor_estimado?: number;
        };
        Relationships: [
          {
            foreignKeyName: "opportunities_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "opportunities_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string;
          full_name: string;
          id: string;
        };
        Insert: {
          created_at?: string;
          email?: string;
          full_name?: string;
          id: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          full_name?: string;
          id?: string;
        };
        Relationships: [];
      };
      quote_items: {
        Row: {
          codigo: string | null;
          created_at: string;
          desconto: number;
          descricao: string;
          id: string;
          ordem: number;
          quantidade: number;
          quote_id: string;
          total: number;
          unidade: string;
          valor_unitario: number;
        };
        Insert: {
          codigo?: string | null;
          created_at?: string;
          desconto?: number;
          descricao: string;
          id?: string;
          ordem?: number;
          quantidade?: number;
          quote_id: string;
          total?: number;
          unidade?: string;
          valor_unitario?: number;
        };
        Update: {
          codigo?: string | null;
          created_at?: string;
          desconto?: number;
          descricao?: string;
          id?: string;
          ordem?: number;
          quantidade?: number;
          quote_id?: string;
          total?: number;
          unidade?: string;
          valor_unitario?: number;
        };
        Relationships: [
          {
            foreignKeyName: "quote_items_quote_id_fkey";
            columns: ["quote_id"];
            isOneToOne: false;
            referencedRelation: "quotes";
            referencedColumns: ["id"];
          },
        ];
      };
      quotes: {
        Row: {
          client_id: string;
          condicoes_pagamento: string | null;
          contact_id: string | null;
          created_at: string;
          created_by: string | null;
          data: string;
          desconto: number;
          id: string;
          numero: string | null;
          observacoes: string | null;
          opportunity_id: string | null;
          prazo_entrega: string | null;
          responsavel: string | null;
          status: string;
          subtotal: number;
          total: number;
          updated_at: string;
          validade: string | null;
          versao: number;
        };
        Insert: {
          client_id: string;
          condicoes_pagamento?: string | null;
          contact_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          data?: string;
          desconto?: number;
          id?: string;
          numero?: string | null;
          observacoes?: string | null;
          opportunity_id?: string | null;
          prazo_entrega?: string | null;
          responsavel?: string | null;
          status?: string;
          subtotal?: number;
          total?: number;
          updated_at?: string;
          validade?: string | null;
          versao?: number;
        };
        Update: {
          client_id?: string;
          condicoes_pagamento?: string | null;
          contact_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          data?: string;
          desconto?: number;
          id?: string;
          numero?: string | null;
          observacoes?: string | null;
          opportunity_id?: string | null;
          prazo_entrega?: string | null;
          responsavel?: string | null;
          status?: string;
          subtotal?: number;
          total?: number;
          updated_at?: string;
          validade?: string | null;
          versao?: number;
        };
        Relationships: [
          {
            foreignKeyName: "quotes_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotes_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotes_opportunity_id_fkey";
            columns: ["opportunity_id"];
            isOneToOne: false;
            referencedRelation: "opportunities";
            referencedColumns: ["id"];
          },
        ];
      };
      settings: {
        Row: {
          condicoes_pagamento_padrao: string | null;
          empresa_cnpj: string | null;
          empresa_email: string | null;
          empresa_endereco: string | null;
          empresa_nome: string;
          empresa_site: string | null;
          empresa_telefone: string | null;
          id: string;
          logo_url: string | null;
          proposta_texto_abertura: string | null;
          proposta_texto_rodape: string | null;
          updated_at: string;
          validade_padrao_dias: number;
        };
        Insert: {
          condicoes_pagamento_padrao?: string | null;
          empresa_cnpj?: string | null;
          empresa_email?: string | null;
          empresa_endereco?: string | null;
          empresa_nome?: string;
          empresa_site?: string | null;
          empresa_telefone?: string | null;
          id?: string;
          logo_url?: string | null;
          proposta_texto_abertura?: string | null;
          proposta_texto_rodape?: string | null;
          updated_at?: string;
          validade_padrao_dias?: number;
        };
        Update: {
          condicoes_pagamento_padrao?: string | null;
          empresa_cnpj?: string | null;
          empresa_email?: string | null;
          empresa_endereco?: string | null;
          empresa_nome?: string;
          empresa_site?: string | null;
          empresa_telefone?: string | null;
          id?: string;
          logo_url?: string | null;
          proposta_texto_abertura?: string | null;
          proposta_texto_rodape?: string | null;
          updated_at?: string;
          validade_padrao_dias?: number;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "comercial";
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "comercial"],
    },
  },
} as const;
