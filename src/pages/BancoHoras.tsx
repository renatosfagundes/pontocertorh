import { useState, useEffect } from "react";
import { MainLayout } from "@/components/MainLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Clock,
  Calendar,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, subMonths, addMonths, startOfMonth, endOfMonth, parseISO, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface BancoHoras {
  id: string;
  mes_referencia: string;
  saldo_minutos: number;
  horas_extras_minutos: number;
  horas_devidas_minutos: number;
}

interface DailyData {
  date: string;
  day: string;
  minutes: number;
  expected: number;
}

export default function BancoHoras() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [bancoHoras, setBancoHoras] = useState<BancoHoras | null>(null);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [loading, setLoading] = useState(true);

  // Expected daily hours (8 hours = 480 minutes)
  const expectedDailyMinutes = 480;

  // Fetch data
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      
      const monthRef = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      
      // Fetch banco de horas
      const { data: banco } = await supabase
        .from("bancos_horas")
        .select("*")
        .eq("usuario_id", user.id)
        .eq("mes_referencia", monthRef)
        .maybeSingle();

      if (banco) {
        setBancoHoras(banco as BancoHoras);
      } else {
        setBancoHoras(null);
      }

      // Fetch daily records for chart
      const start = startOfMonth(currentMonth).toISOString();
      const end = endOfMonth(currentMonth).toISOString();

      const { data: records } = await supabase
        .from("registros_ponto")
        .select("data_hora, tipo")
        .eq("usuario_id", user.id)
        .gte("data_hora", start)
        .lte("data_hora", end)
        .order("data_hora", { ascending: true });

      if (records) {
        // Process records into daily data
        const dailyMap = new Map<string, { entradas: Date[]; saidas: Date[] }>();

        records.forEach((record) => {
          const date = format(parseISO(record.data_hora), "yyyy-MM-dd");
          if (!dailyMap.has(date)) {
            dailyMap.set(date, { entradas: [], saidas: [] });
          }
          const day = dailyMap.get(date)!;
          if (record.tipo === "entrada") {
            day.entradas.push(parseISO(record.data_hora));
          } else {
            day.saidas.push(parseISO(record.data_hora));
          }
        });

        // Calculate daily worked minutes
        const chartData: DailyData[] = [];
        dailyMap.forEach((value, date) => {
          let totalMinutes = 0;
          const pairs = Math.min(value.entradas.length, value.saidas.length);
          
          for (let i = 0; i < pairs; i++) {
            totalMinutes += differenceInMinutes(value.saidas[i], value.entradas[i]);
          }

          chartData.push({
            date,
            day: format(parseISO(date), "dd/MM"),
            minutes: totalMinutes,
            expected: expectedDailyMinutes,
          });
        });

        chartData.sort((a, b) => a.date.localeCompare(b.date));
        setDailyData(chartData);
      }

      setLoading(false);
    };

    fetchData();
  }, [user, currentMonth]);

  // Format minutes to hours string
  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(Math.abs(minutes) / 60);
    const mins = Math.abs(minutes) % 60;
    const sign = minutes >= 0 ? "+" : "-";
    return `${sign}${hours}h${mins.toString().padStart(2, "0")}min`;
  };

  // Calculate totals from chart data
  const totalWorkedMinutes = dailyData.reduce((sum, d) => sum + d.minutes, 0);
  const totalExpectedMinutes = dailyData.length * expectedDailyMinutes;
  const progressPercentage = totalExpectedMinutes > 0 
    ? Math.min((totalWorkedMinutes / totalExpectedMinutes) * 100, 150) 
    : 0;

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Banco de Horas</h1>
            <p className="text-muted-foreground">
              Acompanhe seu saldo de horas trabalhadas
            </p>
          </div>
          
          {/* Month Navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="px-4 py-2 bg-muted rounded-md min-w-[180px] text-center">
              <span className="font-medium capitalize">
                {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
              </span>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              disabled={currentMonth >= new Date()}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Saldo Atual */}
              <Card className="card-stat">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Saldo do Mês
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    {(bancoHoras?.saldo_minutos || totalWorkedMinutes - totalExpectedMinutes) >= 0 ? (
                      <TrendingUp className="w-6 h-6 text-success" />
                    ) : (
                      <TrendingDown className="w-6 h-6 text-destructive" />
                    )}
                    <span
                      className={`text-3xl font-bold ${
                        (bancoHoras?.saldo_minutos || totalWorkedMinutes - totalExpectedMinutes) >= 0
                          ? "text-success"
                          : "text-destructive"
                      }`}
                    >
                      {formatMinutes(bancoHoras?.saldo_minutos || totalWorkedMinutes - totalExpectedMinutes)}
                    </span>
                  </div>
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
                  <span className="text-3xl font-bold text-success">
                    {formatMinutes(bancoHoras?.horas_extras_minutos || Math.max(0, totalWorkedMinutes - totalExpectedMinutes)).replace("+", "")}
                  </span>
                </CardContent>
              </Card>

              {/* Horas Devidas */}
              <Card className="card-stat">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4" />
                    Horas Devidas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="text-3xl font-bold text-destructive">
                    {formatMinutes(bancoHoras?.horas_devidas_minutos || Math.max(0, totalExpectedMinutes - totalWorkedMinutes)).replace("-", "")}
                  </span>
                </CardContent>
              </Card>
            </div>

            {/* Progress Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Progresso do Mês
                </CardTitle>
                <CardDescription>
                  {Math.floor(totalWorkedMinutes / 60)}h trabalhadas de {Math.floor(totalExpectedMinutes / 60)}h esperadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Progress value={progressPercentage} className="h-3" />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>0h</span>
                    <span className="font-medium text-foreground">
                      {progressPercentage.toFixed(0)}%
                    </span>
                    <span>{Math.floor(totalExpectedMinutes / 60)}h</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Daily Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Horas por Dia</CardTitle>
                <CardDescription>
                  Visualize suas horas trabalhadas diariamente
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dailyData.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>Nenhum registro encontrado para este mês</p>
                  </div>
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dailyData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="day" 
                          tick={{ fontSize: 12 }}
                          className="text-muted-foreground"
                        />
                        <YAxis
                          tickFormatter={(value) => `${Math.floor(value / 60)}h`}
                          tick={{ fontSize: 12 }}
                          className="text-muted-foreground"
                        />
                        <Tooltip
                          formatter={(value: number) => [
                            `${Math.floor(value / 60)}h${(value % 60).toString().padStart(2, "0")}min`,
                            "Trabalhado"
                          ]}
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Bar dataKey="minutes" radius={[4, 4, 0, 0]}>
                          {dailyData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                entry.minutes >= expectedDailyMinutes
                                  ? "hsl(var(--success))"
                                  : entry.minutes >= expectedDailyMinutes * 0.8
                                  ? "hsl(var(--warning))"
                                  : "hsl(var(--destructive))"
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 justify-center text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-success" />
                <span>≥ 8h (Meta atingida)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-warning" />
                <span>6-8h (Parcial)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-destructive" />
                <span>&lt; 6h (Abaixo)</span>
              </div>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
