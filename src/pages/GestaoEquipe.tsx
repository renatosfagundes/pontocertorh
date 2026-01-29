import { useState, useEffect } from "react";
import { MainLayout } from "@/components/MainLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  Search,
  Loader2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { format, parseISO, isToday } from "date-fns";

interface TeamMember {
  id: string;
  nome: string;
  email: string;
  avatar_url?: string;
  departamento?: { nome: string };
  cargo?: { nome: string };
  lastRecord?: {
    tipo: "entrada" | "saida";
    data_hora: string;
    endereco?: string;
  };
}

export default function GestaoEquipe() {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | "presente" | "remoto" | "ausente">("todos");

  // Fetch team members
  useEffect(() => {
    if (!user) return;

    const fetchTeam = async () => {
      setLoading(true);

      // Fetch team members (people who have this user as gestor_id)
      const { data: profiles } = await supabase
        .from("profiles")
        .select(`
          id,
          nome,
          email,
          avatar_url,
          departamentos:departamento_id (nome),
          cargos:cargo_id (nome)
        `)
        .eq("gestor_id", user.id)
        .eq("ativo", true);

      if (profiles && profiles.length > 0) {
        // Fetch today's last record for each team member
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const teamWithRecords = await Promise.all(
          profiles.map(async (member) => {
            const { data: records } = await supabase
              .from("registros_ponto")
              .select("tipo, data_hora, endereco")
              .eq("usuario_id", member.id)
              .gte("data_hora", today.toISOString())
              .order("data_hora", { ascending: false })
              .limit(1);

            return {
              ...member,
              departamento: member.departamentos as { nome: string } | undefined,
              cargo: member.cargos as { nome: string } | undefined,
              lastRecord: records?.[0] as TeamMember["lastRecord"],
            };
          })
        );

        setTeamMembers(teamWithRecords);
      } else {
        // If no direct reports, show some placeholder data for demo
        setTeamMembers([]);
      }

      setLoading(false);
    };

    fetchTeam();
  }, [user]);

  // Get member status
  const getMemberStatus = (member: TeamMember) => {
    if (!member.lastRecord) {
      return { label: "Ausente", status: "ausente" as const, icon: WifiOff };
    }
    
    if (!isToday(parseISO(member.lastRecord.data_hora))) {
      return { label: "Ausente", status: "ausente" as const, icon: WifiOff };
    }

    if (member.lastRecord.tipo === "entrada") {
      // Check if working remotely (has address outside office)
      const isRemote = member.lastRecord.endereco && 
        !member.lastRecord.endereco.toLowerCase().includes("escritório");
      
      return isRemote
        ? { label: "Remoto", status: "remoto" as const, icon: Wifi }
        : { label: "Presente", status: "presente" as const, icon: CheckCircle2 };
    }

    return { label: "Fora", status: "ausente" as const, icon: WifiOff };
  };

  // Filter members
  const filteredMembers = teamMembers.filter((member) => {
    const matchesSearch = member.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const status = getMemberStatus(member);
    const matchesStatus = statusFilter === "todos" || status.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Count by status
  const statusCounts = teamMembers.reduce((acc, member) => {
    const status = getMemberStatus(member).status;
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Gestão de Equipe</h1>
          <p className="text-muted-foreground">
            Acompanhe o status da sua equipe em tempo real
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="card-stat cursor-pointer" onClick={() => setStatusFilter("todos")}>
            <CardHeader className="pb-2">
              <CardDescription>Total</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <span className="text-2xl font-bold">{teamMembers.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`card-stat cursor-pointer ${statusFilter === "presente" ? "border-success" : ""}`}
            onClick={() => setStatusFilter("presente")}
          >
            <CardHeader className="pb-2">
              <CardDescription>Presentes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <span className="text-2xl font-bold text-success">
                  {statusCounts.presente || 0}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`card-stat cursor-pointer ${statusFilter === "remoto" ? "border-info" : ""}`}
            onClick={() => setStatusFilter("remoto")}
          >
            <CardHeader className="pb-2">
              <CardDescription>Remotos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Wifi className="w-5 h-5 text-info" />
                <span className="text-2xl font-bold text-info">
                  {statusCounts.remoto || 0}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`card-stat cursor-pointer ${statusFilter === "ausente" ? "border-muted" : ""}`}
            onClick={() => setStatusFilter("ausente")}
          >
            <CardHeader className="pb-2">
              <CardDescription>Ausentes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-muted-foreground" />
                <span className="text-2xl font-bold text-muted-foreground">
                  {statusCounts.ausente || 0}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="presente">Presentes</SelectItem>
                  <SelectItem value="remoto">Remotos</SelectItem>
                  <SelectItem value="ausente">Ausentes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Team List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              Minha Equipe
              <Badge variant="secondary" className="ml-2">
                {filteredMembers.length} pessoas
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>
                  {teamMembers.length === 0
                    ? "Você ainda não tem membros na sua equipe"
                    : "Nenhum membro encontrado com os filtros selecionados"}
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredMembers.map((member) => {
                  const status = getMemberStatus(member);
                  return (
                    <div
                      key={member.id}
                      className="flex items-center gap-4 p-4 rounded-lg border hover:border-primary/50 transition-colors"
                    >
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={member.avatar_url} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {member.nome.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium truncate">{member.nome}</h3>
                          <Badge
                            variant="outline"
                            className={`status-${status.status}`}
                          >
                            <status.icon className="w-3 h-3 mr-1" />
                            {status.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {member.cargo?.nome || "Sem cargo"} • {member.departamento?.nome || "Sem departamento"}
                        </p>
                      </div>

                      <div className="hidden md:block text-right text-sm">
                        {member.lastRecord ? (
                          <>
                            <p className="font-mono font-medium">
                              {member.lastRecord.tipo === "entrada" ? "Entrada" : "Saída"}: {format(parseISO(member.lastRecord.data_hora), "HH:mm")}
                            </p>
                            {member.lastRecord.endereco && (
                              <p className="text-muted-foreground flex items-center justify-end gap-1">
                                <MapPin className="w-3 h-3" />
                                {member.lastRecord.endereco.substring(0, 30)}...
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-muted-foreground">Sem registro hoje</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
