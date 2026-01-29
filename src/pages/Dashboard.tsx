import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/MainLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  MapPin,
  LogIn,
  LogOut,
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  AlertCircle,
  CheckCircle2,
  Timer,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RegistroPonto {
  id: string;
  data_hora: string;
  tipo: "entrada" | "saida";
  metodo: string;
  endereco?: string;
}

interface BancoHoras {
  saldo_minutos: number;
  horas_extras_minutos: number;
  horas_devidas_minutos: number;
}

export default function Dashboard() {
  const { user, profile, isManager, isRH } = useAuth();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayRecords, setTodayRecords] = useState<RegistroPonto[]>([]);
  const [bancoHoras, setBancoHoras] = useState<BancoHoras | null>(null);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [loading, setLoading] = useState(true);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch today's records
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

        // Fetch today's records
        const { data: records } = await supabase
          .from("registros_ponto")
          .select("*")
          .eq("usuario_id", user.id)
          .gte("data_hora", startOfDay)
          .lte("data_hora", endOfDay)
          .order("data_hora", { ascending: true });

        if (records) {
          setTodayRecords(records as RegistroPonto[]);
        }

        // Fetch current month banco de horas
        const currentMonth = format(new Date(), "yyyy-MM-01");
        const { data: banco } = await supabase
          .from("bancos_horas")
          .select("*")
          .eq("usuario_id", user.id)
          .eq("mes_referencia", currentMonth)
          .maybeSingle();

        if (banco) {
          setBancoHoras(banco as BancoHoras);
        }

        // Fetch pending requests for managers
        if (isManager) {
          const { count } = await supabase
            .from("solicitacoes_ajuste")
            .select("*", { count: "exact", head: true })
            .eq("status", "pendente");

          setPendingRequests(count || 0);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, isManager]);

  // Determine current status
  const getStatus = () => {
    if (todayRecords.length === 0) {
      return { label: "Fora do expediente", color: "status-ausente", icon: AlertCircle };
    }
    const lastRecord = todayRecords[todayRecords.length - 1];
    if (lastRecord.tipo === "entrada") {
      return { label: "Trabalhando", color: "status-presente", icon: CheckCircle2 };
    }
    return { label: "Fora do expediente", color: "status-ausente", icon: AlertCircle };
  };

  const status = getStatus();

  // Format hours balance
  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(Math.abs(minutes) / 60);
    const mins = Math.abs(minutes) % 60;
    const sign = minutes >= 0 ? "+" : "-";
    return `${sign}${hours}h${mins.toString().padStart(2, "0")}min`;
  };

  // Get next expected action
  const getNextAction = () => {
    if (todayRecords.length === 0) {
      return { label: "Registrar Entrada", type: "entrada" as const };
    }
    const lastRecord = todayRecords[todayRecords.length - 1];
    return lastRecord.tipo === "entrada"
      ? { label: "Registrar Saída", type: "saida" as const }
      : { label: "Registrar Entrada", type: "entrada" as const };
  };

  const nextAction = getNextAction();

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              Olá, {profile?.nome?.split(" ")[0] || "Usuário"}! 👋
            </h1>
            <p className="text-muted-foreground">
              {format(currentTime, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
          <Badge className={`${status.color} px-4 py-2 text-sm`}>
            <status.icon className="w-4 h-4 mr-2" />
            {status.label}
          </Badge>
        </div>

        {/* Main Action Card */}
        <Card className="overflow-hidden">
          <div className="gradient-corporate p-8 text-white">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left">
                <p className="text-white/80 text-sm mb-2">Horário atual</p>
                <div className="time-display text-5xl md:text-6xl">
                  {format(currentTime, "HH:mm:ss")}
                </div>
              </div>
              <Button
                size="lg"
                onClick={() => navigate("/registrar-ponto")}
                className={`${
                  nextAction.type === "entrada" ? "btn-entrada" : "btn-saida"
                } text-lg px-8 py-6 h-auto`}
              >
                {nextAction.type === "entrada" ? (
                  <LogIn className="w-5 h-5 mr-2" />
                ) : (
                  <LogOut className="w-5 h-5 mr-2" />
                )}
                {nextAction.label}
              </Button>
            </div>
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Banco de Horas */}
          <Card className="card-stat">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Timer className="w-4 h-4" />
                Saldo do Mês
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {(bancoHoras?.saldo_minutos || 0) >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-success" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-destructive" />
                )}
                <span
                  className={`text-2xl font-bold ${
                    (bancoHoras?.saldo_minutos || 0) >= 0
                      ? "text-success"
                      : "text-destructive"
                  }`}
                >
                  {formatMinutes(bancoHoras?.saldo_minutos || 0)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Registros Hoje */}
          <Card className="card-stat">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Registros Hoje
              </CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">{todayRecords.length}</span>
              <p className="text-xs text-muted-foreground mt-1">
                {todayRecords.length === 0
                  ? "Nenhum registro"
                  : `Último: ${format(
                      new Date(todayRecords[todayRecords.length - 1].data_hora),
                      "HH:mm"
                    )}`}
              </p>
            </CardContent>
          </Card>

          {/* Horas Extras */}
          <Card className="card-stat">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Horas Extras
              </CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-success">
                {formatMinutes(bancoHoras?.horas_extras_minutos || 0).replace("+", "")}
              </span>
            </CardContent>
          </Card>

          {/* Pending Requests (for managers) */}
          {isManager && (
            <Card
              className="card-stat cursor-pointer hover:border-warning/50 transition-colors"
              onClick={() => navigate("/solicitacoes")}
            >
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Aprovações Pendentes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{pendingRequests}</span>
                  {pendingRequests > 0 && (
                    <Badge variant="destructive" className="animate-pulse-gentle">
                      Novo
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Regular users see calendar instead */}
          {!isManager && (
            <Card className="card-stat">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Dias Trabalhados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-bold">
                  {new Date().getDate() - 2}
                </span>
                <p className="text-xs text-muted-foreground mt-1">
                  Este mês
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Today's Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Registros de Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayRecords.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>Nenhum registro hoje</p>
                <Button
                  variant="link"
                  className="mt-2"
                  onClick={() => navigate("/registrar-ponto")}
                >
                  Registrar primeiro ponto
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {todayRecords.map((record, index) => (
                  <div
                    key={record.id}
                    className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        record.tipo === "entrada"
                          ? "bg-success/10 text-success"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {record.tipo === "entrada" ? (
                        <LogIn className="w-5 h-5" />
                      ) : (
                        <LogOut className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">
                        {record.tipo === "entrada" ? "Entrada" : "Saída"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {record.metodo === "app"
                          ? "Via aplicativo"
                          : record.metodo === "biometria"
                          ? "Via biometria"
                          : "Via QR Code"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold">
                        {format(new Date(record.data_hora), "HH:mm")}
                      </p>
                      {record.endereco && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {record.endereco.substring(0, 25)}...
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
