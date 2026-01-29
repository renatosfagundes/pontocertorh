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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      bancos_horas: {
        Row: {
          created_at: string
          horas_devidas_minutos: number | null
          horas_extras_minutos: number | null
          id: string
          mes_referencia: string
          saldo_minutos: number | null
          updated_at: string
          usuario_id: string
        }
        Insert: {
          created_at?: string
          horas_devidas_minutos?: number | null
          horas_extras_minutos?: number | null
          id?: string
          mes_referencia: string
          saldo_minutos?: number | null
          updated_at?: string
          usuario_id: string
        }
        Update: {
          created_at?: string
          horas_devidas_minutos?: number | null
          horas_extras_minutos?: number | null
          id?: string
          mes_referencia?: string
          saldo_minutos?: number | null
          updated_at?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bancos_horas_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cargos: {
        Row: {
          created_at: string
          departamento_id: string | null
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          departamento_id?: string | null
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          departamento_id?: string | null
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "cargos_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes_empresa: {
        Row: {
          created_at: string
          id: string
          notificar_gestor_atraso: boolean | null
          periodo_retencao_anos: number | null
          raio_geolocalizacao_km: number | null
          selfie_obrigatoria: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notificar_gestor_atraso?: boolean | null
          periodo_retencao_anos?: number | null
          raio_geolocalizacao_km?: number | null
          selfie_obrigatoria?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notificar_gestor_atraso?: boolean | null
          periodo_retencao_anos?: number | null
          raio_geolocalizacao_km?: number | null
          selfie_obrigatoria?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      departamentos: {
        Row: {
          ativo: boolean | null
          created_at: string
          hora_entrada_padrao: string | null
          hora_saida_padrao: string | null
          id: string
          nome: string
          tipo_jornada: Database["public"]["Enums"]["tipo_jornada"] | null
          tolerancia_minutos: number | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          hora_entrada_padrao?: string | null
          hora_saida_padrao?: string | null
          id?: string
          nome: string
          tipo_jornada?: Database["public"]["Enums"]["tipo_jornada"] | null
          tolerancia_minutos?: number | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          hora_entrada_padrao?: string | null
          hora_saida_padrao?: string | null
          id?: string
          nome?: string
          tipo_jornada?: Database["public"]["Enums"]["tipo_jornada"] | null
          tolerancia_minutos?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      feriados: {
        Row: {
          created_at: string
          data: string
          descricao: string
          id: string
          nacional: boolean | null
        }
        Insert: {
          created_at?: string
          data: string
          descricao: string
          id?: string
          nacional?: boolean | null
        }
        Update: {
          created_at?: string
          data?: string
          descricao?: string
          id?: string
          nacional?: boolean | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ativo: boolean | null
          avatar_url: string | null
          cargo_id: string | null
          cpf_criptografado: string | null
          created_at: string
          departamento_id: string | null
          email: string
          gestor_id: string | null
          id: string
          nome: string
          tipo_jornada: Database["public"]["Enums"]["tipo_jornada"] | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          avatar_url?: string | null
          cargo_id?: string | null
          cpf_criptografado?: string | null
          created_at?: string
          departamento_id?: string | null
          email: string
          gestor_id?: string | null
          id: string
          nome: string
          tipo_jornada?: Database["public"]["Enums"]["tipo_jornada"] | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          avatar_url?: string | null
          cargo_id?: string | null
          cpf_criptografado?: string | null
          created_at?: string
          departamento_id?: string | null
          email?: string
          gestor_id?: string | null
          id?: string
          nome?: string
          tipo_jornada?: Database["public"]["Enums"]["tipo_jornada"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_gestor_id_fkey"
            columns: ["gestor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_ponto: {
        Row: {
          created_at: string
          data_hora: string
          endereco: string | null
          endereco_ip: string | null
          id: string
          latitude: number | null
          longitude: number | null
          metodo: Database["public"]["Enums"]["metodo_registro"] | null
          observacao: string | null
          selfie_url: string | null
          tipo: Database["public"]["Enums"]["tipo_registro"]
          usuario_id: string
        }
        Insert: {
          created_at?: string
          data_hora?: string
          endereco?: string | null
          endereco_ip?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          metodo?: Database["public"]["Enums"]["metodo_registro"] | null
          observacao?: string | null
          selfie_url?: string | null
          tipo: Database["public"]["Enums"]["tipo_registro"]
          usuario_id: string
        }
        Update: {
          created_at?: string
          data_hora?: string
          endereco?: string | null
          endereco_ip?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          metodo?: Database["public"]["Enums"]["metodo_registro"] | null
          observacao?: string | null
          selfie_url?: string | null
          tipo?: Database["public"]["Enums"]["tipo_registro"]
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "registros_ponto_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes_ajuste: {
        Row: {
          aprovador_id: string | null
          created_at: string
          data_aprovacao: string | null
          id: string
          justificativa_aprovador: string | null
          motivo: string
          nova_data_hora: string
          registro_id: string | null
          status: Database["public"]["Enums"]["status_solicitacao"] | null
          tipo: Database["public"]["Enums"]["tipo_registro"]
          updated_at: string
          usuario_id: string
        }
        Insert: {
          aprovador_id?: string | null
          created_at?: string
          data_aprovacao?: string | null
          id?: string
          justificativa_aprovador?: string | null
          motivo: string
          nova_data_hora: string
          registro_id?: string | null
          status?: Database["public"]["Enums"]["status_solicitacao"] | null
          tipo: Database["public"]["Enums"]["tipo_registro"]
          updated_at?: string
          usuario_id: string
        }
        Update: {
          aprovador_id?: string | null
          created_at?: string
          data_aprovacao?: string | null
          id?: string
          justificativa_aprovador?: string | null
          motivo?: string
          nova_data_hora?: string
          registro_id?: string | null
          status?: Database["public"]["Enums"]["status_solicitacao"] | null
          tipo?: Database["public"]["Enums"]["tipo_registro"]
          updated_at?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_ajuste_aprovador_id_fkey"
            columns: ["aprovador_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_ajuste_registro_id_fkey"
            columns: ["registro_id"]
            isOneToOne: false
            referencedRelation: "registros_ponto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_ajuste_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          role?: Database["public"]["Enums"]["app_role"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_manager_of: { Args: { _employee_id: string }; Returns: boolean }
      is_rh_or_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "funcionario" | "gestor" | "rh" | "admin"
      metodo_registro: "app" | "biometria" | "qrcode" | "manual"
      status_solicitacao: "pendente" | "aprovado" | "rejeitado"
      tipo_jornada: "fixa" | "flexivel"
      tipo_registro: "entrada" | "saida"
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
      app_role: ["funcionario", "gestor", "rh", "admin"],
      metodo_registro: ["app", "biometria", "qrcode", "manual"],
      status_solicitacao: ["pendente", "aprovado", "rejeitado"],
      tipo_jornada: ["fixa", "flexivel"],
      tipo_registro: ["entrada", "saida"],
    },
  },
} as const
