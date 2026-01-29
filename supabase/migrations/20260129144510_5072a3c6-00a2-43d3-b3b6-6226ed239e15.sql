-- Enum para tipos de role
CREATE TYPE public.app_role AS ENUM ('funcionario', 'gestor', 'rh', 'admin');

-- Enum para tipo de jornada
CREATE TYPE public.tipo_jornada AS ENUM ('fixa', 'flexivel');

-- Enum para tipo de registro
CREATE TYPE public.tipo_registro AS ENUM ('entrada', 'saida');

-- Enum para método de registro
CREATE TYPE public.metodo_registro AS ENUM ('app', 'biometria', 'qrcode', 'manual');

-- Enum para status de solicitação
CREATE TYPE public.status_solicitacao AS ENUM ('pendente', 'aprovado', 'rejeitado');

-- Tabela de roles separada (CRÍTICO: nunca armazenar roles no perfil)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'funcionario',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Tabela de departamentos
CREATE TABLE public.departamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    hora_entrada_padrao TIME DEFAULT '09:00:00',
    hora_saida_padrao TIME DEFAULT '18:00:00',
    tolerancia_minutos INTEGER DEFAULT 10,
    tipo_jornada tipo_jornada DEFAULT 'fixa',
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de cargos
CREATE TABLE public.cargos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    departamento_id UUID REFERENCES public.departamentos(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de perfis (funcionários)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    nome TEXT NOT NULL,
    cpf_criptografado TEXT,
    cargo_id UUID REFERENCES public.cargos(id) ON DELETE SET NULL,
    departamento_id UUID REFERENCES public.departamentos(id) ON DELETE SET NULL,
    gestor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    tipo_jornada tipo_jornada DEFAULT 'fixa',
    ativo BOOLEAN DEFAULT true,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de registros de ponto
CREATE TABLE public.registros_ponto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    data_hora TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    tipo tipo_registro NOT NULL,
    metodo metodo_registro DEFAULT 'app',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    endereco TEXT,
    selfie_url TEXT,
    endereco_ip TEXT,
    observacao TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de solicitações de ajuste
CREATE TABLE public.solicitacoes_ajuste (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    registro_id UUID REFERENCES public.registros_ponto(id) ON DELETE CASCADE,
    nova_data_hora TIMESTAMP WITH TIME ZONE NOT NULL,
    tipo tipo_registro NOT NULL,
    motivo TEXT NOT NULL,
    status status_solicitacao DEFAULT 'pendente',
    aprovador_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    data_aprovacao TIMESTAMP WITH TIME ZONE,
    justificativa_aprovador TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de banco de horas
CREATE TABLE public.bancos_horas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    mes_referencia DATE NOT NULL,
    saldo_minutos INTEGER DEFAULT 0,
    horas_extras_minutos INTEGER DEFAULT 0,
    horas_devidas_minutos INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (usuario_id, mes_referencia)
);

-- Tabela de configurações da empresa
CREATE TABLE public.configuracoes_empresa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    selfie_obrigatoria BOOLEAN DEFAULT true,
    raio_geolocalizacao_km DECIMAL(5,2) DEFAULT 0.5,
    notificar_gestor_atraso BOOLEAN DEFAULT true,
    periodo_retencao_anos INTEGER DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de feriados
CREATE TABLE public.feriados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data DATE NOT NULL,
    descricao TEXT NOT NULL,
    nacional BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cargos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_ponto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitacoes_ajuste ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bancos_horas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes_empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feriados ENABLE ROW LEVEL SECURITY;

-- Helper function to check user role (SECURITY DEFINER to avoid recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = _role
    )
$$;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.has_role(auth.uid(), 'admin')
$$;

-- Helper function to check if user is RH or admin
CREATE OR REPLACE FUNCTION public.is_rh_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.has_role(auth.uid(), 'rh') OR public.has_role(auth.uid(), 'admin')
$$;

-- Helper function to check if user is manager of another user
CREATE OR REPLACE FUNCTION public.is_manager_of(_employee_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = _employee_id AND gestor_id = auth.uid()
    )
$$;

-- Helper function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
    FOR ALL USING (public.is_admin());

-- RLS Policies for departamentos (everyone authenticated can read)
CREATE POLICY "Authenticated users can view departments" ON public.departamentos
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and RH can manage departments" ON public.departamentos
    FOR ALL USING (public.is_rh_or_admin());

-- RLS Policies for cargos
CREATE POLICY "Authenticated users can view cargos" ON public.cargos
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and RH can manage cargos" ON public.cargos
    FOR ALL USING (public.is_rh_or_admin());

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Managers can view their team profiles" ON public.profiles
    FOR SELECT USING (public.is_manager_of(id));

CREATE POLICY "RH and Admin can view all profiles" ON public.profiles
    FOR SELECT USING (public.is_rh_or_admin());

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can manage all profiles" ON public.profiles
    FOR ALL USING (public.is_admin());

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for registros_ponto
CREATE POLICY "Users can view their own records" ON public.registros_ponto
    FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "Managers can view team records" ON public.registros_ponto
    FOR SELECT USING (public.is_manager_of(usuario_id));

CREATE POLICY "RH and Admin can view all records" ON public.registros_ponto
    FOR SELECT USING (public.is_rh_or_admin());

CREATE POLICY "Users can insert their own records" ON public.registros_ponto
    FOR INSERT WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Admins can manage all records" ON public.registros_ponto
    FOR ALL USING (public.is_admin());

-- RLS Policies for solicitacoes_ajuste
CREATE POLICY "Users can view their own requests" ON public.solicitacoes_ajuste
    FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "Managers can view team requests" ON public.solicitacoes_ajuste
    FOR SELECT USING (public.is_manager_of(usuario_id));

CREATE POLICY "RH and Admin can view all requests" ON public.solicitacoes_ajuste
    FOR SELECT USING (public.is_rh_or_admin());

CREATE POLICY "Users can create their own requests" ON public.solicitacoes_ajuste
    FOR INSERT WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Users can update their pending requests" ON public.solicitacoes_ajuste
    FOR UPDATE USING (auth.uid() = usuario_id AND status = 'pendente');

CREATE POLICY "Managers can update team requests" ON public.solicitacoes_ajuste
    FOR UPDATE USING (public.is_manager_of(usuario_id));

CREATE POLICY "Admins can manage all requests" ON public.solicitacoes_ajuste
    FOR ALL USING (public.is_admin());

-- RLS Policies for bancos_horas
CREATE POLICY "Users can view their own hours bank" ON public.bancos_horas
    FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "Managers can view team hours bank" ON public.bancos_horas
    FOR SELECT USING (public.is_manager_of(usuario_id));

CREATE POLICY "RH and Admin can view all hours banks" ON public.bancos_horas
    FOR SELECT USING (public.is_rh_or_admin());

CREATE POLICY "System can insert hours bank" ON public.bancos_horas
    FOR INSERT WITH CHECK (auth.uid() = usuario_id OR public.is_admin());

CREATE POLICY "Admins can manage all hours banks" ON public.bancos_horas
    FOR ALL USING (public.is_admin());

-- RLS Policies for configuracoes_empresa
CREATE POLICY "Authenticated users can view config" ON public.configuracoes_empresa
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage config" ON public.configuracoes_empresa
    FOR ALL USING (public.is_admin());

-- RLS Policies for feriados
CREATE POLICY "Everyone can view holidays" ON public.feriados
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and RH can manage holidays" ON public.feriados
    FOR ALL USING (public.is_rh_or_admin());

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_departamentos_updated_at
    BEFORE UPDATE ON public.departamentos
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_solicitacoes_updated_at
    BEFORE UPDATE ON public.solicitacoes_ajuste
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bancos_horas_updated_at
    BEFORE UPDATE ON public.bancos_horas
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_configuracoes_updated_at
    BEFORE UPDATE ON public.configuracoes_empresa
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, nome)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)));
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'funcionario');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create storage bucket for selfies
INSERT INTO storage.buckets (id, name, public) 
VALUES ('selfies', 'selfies', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for selfies bucket
CREATE POLICY "Users can upload their own selfies"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'selfies' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own selfies"
ON storage.objects FOR SELECT
USING (bucket_id = 'selfies' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Managers can view team selfies"
ON storage.objects FOR SELECT
USING (bucket_id = 'selfies' AND public.is_manager_of((storage.foldername(name))[1]::uuid));

CREATE POLICY "RH and Admin can view all selfies"
ON storage.objects FOR SELECT
USING (bucket_id = 'selfies' AND public.is_rh_or_admin());