import { useState, useEffect } from "react";
import { MainLayout } from "@/components/MainLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Download,
  Users,
  Clock,
  TrendingUp,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from "lucide-react";
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
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface DepartmentStats {
  nome: string;
  totalHoras: number;
  horasExtras: number;
  funcionarios: number;
  presenca: number;
}

interface EmployeeReport {
  id: string;
  nome: string;
  departamento: string;
  horasTrabalhadas: number;
  horasExtras: number;
  horasDevidas: number;
  diasTrabalhados: number;
}

export default function Relatorios() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [departmentStats, setDepartmentStats] = useState<DepartmentStats[]>([]);
  const [employeeReports, setEmployeeReports] = useState<EmployeeReport[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("todos");
  const [departments, setDepartments] = useState<{ id: string; nome: string }[]>([]);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // Fetch departments
      const { data: depts } = await supabase
        .from("departamentos")
        .select("id, nome")
        .eq("ativo", true);

      if (depts) {
        setDepartments(depts);
      }

      // Fetch all profiles with their records
      const start = startOfMonth(currentMonth).toISOString();
      const end = endOfMonth(currentMonth).toISOString();

      const { data: profiles } = await supabase
        .from("profiles")
        .select(`
          id,
          nome,
          departamentos:departamento_id (id, nome)
        `)
        .eq("ativo", true);

      if (profiles) {
        // Fetch records for all users
        const { data: allRecords } = await supabase
          .from("registros_ponto")
          .select("usuario_id, tipo, data_hora")
          .gte("data_hora", start)
          .lte("data_hora", end)
          .order("data_hora", { ascending: true });

        if (allRecords) {
          // Process employee reports
          const reports: EmployeeReport[] = profiles.map((profile) => {
            const userRecords = allRecords.filter(r => r.usuario_id === profile.id);
            
            // Group by day and calculate hours
            const dailyMap = new Map<string, { entradas: Date[]; saidas: Date[] }>();
            userRecords.forEach((record) => {
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

            let totalMinutes = 0;
            dailyMap.forEach((value) => {
              const pairs = Math.min(value.entradas.length, value.saidas.length);
              for (let i = 0; i < pairs; i++) {
                totalMinutes += differenceInMinutes(value.saidas[i], value.entradas[i]);
              }
            });

            const expectedMinutes = dailyMap.size * 480; // 8 hours per day
            const horasExtras = Math.max(0, totalMinutes - expectedMinutes);
            const horasDevidas = Math.max(0, expectedMinutes - totalMinutes);

            return {
              id: profile.id,
              nome: profile.nome,
              departamento: (profile.departamentos as { nome: string })?.nome || "Sem departamento",
              horasTrabalhadas: totalMinutes,
              horasExtras,
              horasDevidas,
              diasTrabalhados: dailyMap.size,
            };
          });

          setEmployeeReports(reports);

          // Calculate department stats
          const deptStats: Record<string, DepartmentStats> = {};
          reports.forEach((report) => {
            if (!deptStats[report.departamento]) {
              deptStats[report.departamento] = {
                nome: report.departamento,
                totalHoras: 0,
                horasExtras: 0,
                funcionarios: 0,
                presenca: 0,
              };
            }
            deptStats[report.departamento].totalHoras += report.horasTrabalhadas;
            deptStats[report.departamento].horasExtras += report.horasExtras;
            deptStats[report.departamento].funcionarios += 1;
            deptStats[report.departamento].presenca += report.diasTrabalhados > 0 ? 1 : 0;
          });

          setDepartmentStats(Object.values(deptStats));
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [currentMonth]);

  // Filter reports
  const filteredReports = employeeReports.filter(
    (r) => selectedDepartment === "todos" || r.departamento === selectedDepartment
  );

  // Format minutes to hours
  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins.toString().padStart(2, "0")}min`;
  };

  // Pie chart colors
  const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

  // Calculate totals
  const totalHorasExtras = filteredReports.reduce((sum, r) => sum + r.horasExtras, 0);
  const totalFuncionarios = filteredReports.length;
  const mediaPresenca = totalFuncionarios > 0
    ? (filteredReports.filter(r => r.diasTrabalhados > 0).length / totalFuncionarios) * 100
    : 0;

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Relatórios</h1>
            <p className="text-muted-foreground">
              Análise completa de ponto e horas trabalhadas
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar Excel
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
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

              {/* Department Filter */}
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Todos os departamentos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os departamentos</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.nome}>
                      {dept.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="card-stat">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Total de Funcionários
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="text-3xl font-bold">{totalFuncionarios}</span>
                </CardContent>
              </Card>

              <Card className="card-stat">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Total Horas Extras
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="text-3xl font-bold text-success">
                    {formatMinutes(totalHorasExtras)}
                  </span>
                </CardContent>
              </Card>

              <Card className="card-stat">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Taxa de Presença
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="text-3xl font-bold">
                    {mediaPresenca.toFixed(0)}%
                  </span>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Department Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Horas por Departamento</CardTitle>
                </CardHeader>
                <CardContent>
                  {departmentStats.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p>Sem dados para exibir</p>
                    </div>
                  ) : (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={departmentStats}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="nome" tick={{ fontSize: 12 }} />
                          <YAxis tickFormatter={(value) => `${Math.floor(value / 60)}h`} />
                          <Tooltip
                            formatter={(value: number) => [formatMinutes(value), "Horas"]}
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                            }}
                          />
                          <Bar dataKey="totalHoras" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Distribuição por Departamento</CardTitle>
                </CardHeader>
                <CardContent>
                  {departmentStats.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p>Sem dados para exibir</p>
                    </div>
                  ) : (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={departmentStats}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="funcionarios"
                            nameKey="nome"
                            label={({ nome, percent }) => `${nome} (${(percent * 100).toFixed(0)}%)`}
                          >
                            {departmentStats.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Employee Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Relatório Individual
                  <Badge variant="secondary" className="ml-2">
                    {filteredReports.length} funcionários
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Funcionário</TableHead>
                        <TableHead>Departamento</TableHead>
                        <TableHead>Dias Trab.</TableHead>
                        <TableHead>Horas Trab.</TableHead>
                        <TableHead>Horas Extras</TableHead>
                        <TableHead>Horas Devidas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReports.map((report) => (
                        <TableRow key={report.id}>
                          <TableCell className="font-medium">{report.nome}</TableCell>
                          <TableCell>{report.departamento}</TableCell>
                          <TableCell>{report.diasTrabalhados}</TableCell>
                          <TableCell className="font-mono">
                            {formatMinutes(report.horasTrabalhadas)}
                          </TableCell>
                          <TableCell className="font-mono text-success">
                            +{formatMinutes(report.horasExtras)}
                          </TableCell>
                          <TableCell className="font-mono text-destructive">
                            {report.horasDevidas > 0 ? `-${formatMinutes(report.horasDevidas)}` : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </MainLayout>
  );
}
