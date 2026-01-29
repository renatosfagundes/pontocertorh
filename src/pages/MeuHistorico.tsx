import { useState, useEffect } from "react";
import { MainLayout } from "@/components/MainLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar,
  Clock,
  LogIn,
  LogOut,
  MapPin,
  Edit,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, addMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RegistroPonto {
  id: string;
  data_hora: string;
  tipo: "entrada" | "saida";
  metodo: string;
  endereco?: string;
  observacao?: string;
}

export default function MeuHistorico() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [records, setRecords] = useState<RegistroPonto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"todos" | "entrada" | "saida">("todos");
  const [searchDate, setSearchDate] = useState("");
  
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<RegistroPonto | null>(null);
  const [newDateTime, setNewDateTime] = useState("");
  const [motivo, setMotivo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch records
  useEffect(() => {
    if (!user) return;

    const fetchRecords = async () => {
      setLoading(true);
      
      const start = startOfMonth(currentMonth).toISOString();
      const end = endOfMonth(currentMonth).toISOString();

      const { data, error } = await supabase
        .from("registros_ponto")
        .select("*")
        .eq("usuario_id", user.id)
        .gte("data_hora", start)
        .lte("data_hora", end)
        .order("data_hora", { ascending: false });

      if (error) {
        console.error("Error fetching records:", error);
      } else {
        setRecords(data as RegistroPonto[]);
      }
      
      setLoading(false);
    };

    fetchRecords();
  }, [user, currentMonth]);

  // Filter records
  const filteredRecords = records.filter((record) => {
    const matchesType = filter === "todos" || record.tipo === filter;
    const matchesDate = !searchDate || record.data_hora.includes(searchDate);
    return matchesType && matchesDate;
  });

  // Group records by date
  const groupedRecords = filteredRecords.reduce((groups, record) => {
    const date = format(parseISO(record.data_hora), "yyyy-MM-dd");
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(record);
    return groups;
  }, {} as Record<string, RegistroPonto[]>);

  // Handle adjustment request
  const handleRequestAdjust = (record: RegistroPonto) => {
    setSelectedRecord(record);
    setNewDateTime(format(parseISO(record.data_hora), "yyyy-MM-dd'T'HH:mm"));
    setMotivo("");
    setAdjustDialogOpen(true);
  };

  const submitAdjustment = async () => {
    if (!selectedRecord || !user || !motivo.trim()) return;

    setSubmitting(true);

    try {
      const { error } = await supabase.from("solicitacoes_ajuste").insert({
        usuario_id: user.id,
        registro_id: selectedRecord.id,
        nova_data_hora: new Date(newDateTime).toISOString(),
        tipo: selectedRecord.tipo,
        motivo: motivo.trim(),
      });

      if (error) throw error;

      toast({
        title: "Solicitação enviada!",
        description: "Sua solicitação de ajuste foi enviada para aprovação.",
      });

      setAdjustDialogOpen(false);
    } catch (error) {
      console.error("Error submitting adjustment:", error);
      toast({
        title: "Erro ao enviar solicitação",
        description: "Tente novamente em alguns instantes",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Meu Histórico</h1>
            <p className="text-muted-foreground">
              Visualize seus registros de ponto
            </p>
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

              {/* Type Filter */}
              <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="entrada">Entradas</SelectItem>
                  <SelectItem value="saida">Saídas</SelectItem>
                </SelectContent>
              </Select>

              {/* Date Search */}
              <Input
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="w-full md:w-auto"
              />
            </div>
          </CardContent>
        </Card>

        {/* Records Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Registros
              <Badge variant="secondary" className="ml-2">
                {filteredRecords.length} registros
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>Nenhum registro encontrado para este período</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Horário</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead className="hidden md:table-cell">Localização</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          {format(parseISO(record.data_hora), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell className="font-mono font-medium">
                          {format(parseISO(record.data_hora), "HH:mm")}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={record.tipo === "entrada" ? "status-presente" : "status-rejeitado"}
                          >
                            {record.tipo === "entrada" ? (
                              <LogIn className="w-3 h-3 mr-1" />
                            ) : (
                              <LogOut className="w-3 h-3 mr-1" />
                            )}
                            {record.tipo === "entrada" ? "Entrada" : "Saída"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="capitalize text-sm">
                            {record.metodo === "app" ? "Aplicativo" : 
                             record.metodo === "biometria" ? "Biometria" : "QR Code"}
                          </span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell max-w-[200px] truncate text-sm text-muted-foreground">
                          {record.endereco ? (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {record.endereco.substring(0, 40)}...
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRequestAdjust(record)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Ajustar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Adjustment Dialog */}
        <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Solicitar Ajuste de Ponto</DialogTitle>
              <DialogDescription>
                Preencha os dados para solicitar um ajuste no registro.
              </DialogDescription>
            </DialogHeader>

            {selectedRecord && (
              <div className="space-y-4 py-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Registro Original</p>
                  <p className="font-medium">
                    {format(parseISO(selectedRecord.data_hora), "dd/MM/yyyy 'às' HH:mm")}
                    {" - "}
                    {selectedRecord.tipo === "entrada" ? "Entrada" : "Saída"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newDateTime">Novo horário</Label>
                  <Input
                    id="newDateTime"
                    type="datetime-local"
                    value={newDateTime}
                    onChange={(e) => setNewDateTime(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="motivo">Motivo do ajuste *</Label>
                  <Textarea
                    id="motivo"
                    placeholder="Descreva o motivo do ajuste..."
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setAdjustDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={submitAdjustment} disabled={submitting || !motivo.trim()}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Enviar Solicitação
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
