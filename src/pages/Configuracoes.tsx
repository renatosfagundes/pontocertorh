import { useState, useEffect } from "react";
import { MainLayout } from "@/components/MainLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Settings,
  Building,
  Users,
  Calendar,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Clock,
  Save,
} from "lucide-react";
import { format } from "date-fns";

interface Departamento {
  id: string;
  nome: string;
  hora_entrada_padrao: string;
  hora_saida_padrao: string;
  tolerancia_minutos: number;
  tipo_jornada: "fixa" | "flexivel";
  ativo: boolean;
}

interface Feriado {
  id: string;
  data: string;
  descricao: string;
  nacional: boolean;
}

interface ConfiguracaoEmpresa {
  selfie_obrigatoria: boolean;
  raio_geolocalizacao_km: number;
  notificar_gestor_atraso: boolean;
  periodo_retencao_anos: number;
}

export default function Configuracoes() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [feriados, setFeriados] = useState<Feriado[]>([]);
  const [config, setConfig] = useState<ConfiguracaoEmpresa>({
    selfie_obrigatoria: true,
    raio_geolocalizacao_km: 0.5,
    notificar_gestor_atraso: true,
    periodo_retencao_anos: 5,
  });

  // Department dialog
  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Departamento | null>(null);
  const [deptForm, setDeptForm] = useState({
    nome: "",
    hora_entrada_padrao: "09:00",
    hora_saida_padrao: "18:00",
    tolerancia_minutos: 10,
    tipo_jornada: "fixa" as "fixa" | "flexivel",
  });

  // Holiday dialog
  const [holidayDialogOpen, setHolidayDialogOpen] = useState(false);
  const [holidayForm, setHolidayForm] = useState({
    data: "",
    descricao: "",
    nacional: true,
  });

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // Fetch departments
      const { data: depts } = await supabase
        .from("departamentos")
        .select("*")
        .order("nome");

      if (depts) {
        setDepartamentos(depts as Departamento[]);
      }

      // Fetch holidays
      const { data: hols } = await supabase
        .from("feriados")
        .select("*")
        .order("data", { ascending: false });

      if (hols) {
        setFeriados(hols as Feriado[]);
      }

      // Fetch config
      const { data: configData } = await supabase
        .from("configuracoes_empresa")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (configData) {
        setConfig(configData as ConfiguracaoEmpresa);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  // Save department
  const saveDepartment = async () => {
    setSaving(true);

    try {
      if (editingDept) {
        const { error } = await supabase
          .from("departamentos")
          .update(deptForm)
          .eq("id", editingDept.id);

        if (error) throw error;

        setDepartamentos((prev) =>
          prev.map((d) => (d.id === editingDept.id ? { ...d, ...deptForm } : d))
        );
      } else {
        const { data, error } = await supabase
          .from("departamentos")
          .insert(deptForm)
          .select()
          .single();

        if (error) throw error;

        setDepartamentos((prev) => [...prev, data as Departamento]);
      }

      toast({
        title: "Sucesso!",
        description: `Departamento ${editingDept ? "atualizado" : "criado"} com sucesso.`,
      });

      setDeptDialogOpen(false);
      setEditingDept(null);
      setDeptForm({
        nome: "",
        hora_entrada_padrao: "09:00",
        hora_saida_padrao: "18:00",
        tolerancia_minutos: 10,
        tipo_jornada: "fixa",
      });
    } catch (error) {
      console.error("Error saving department:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o departamento.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Delete department
  const deleteDepartment = async (id: string) => {
    try {
      const { error } = await supabase.from("departamentos").delete().eq("id", id);

      if (error) throw error;

      setDepartamentos((prev) => prev.filter((d) => d.id !== id));

      toast({
        title: "Sucesso!",
        description: "Departamento excluído com sucesso.",
      });
    } catch (error) {
      console.error("Error deleting department:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o departamento.",
        variant: "destructive",
      });
    }
  };

  // Save holiday
  const saveHoliday = async () => {
    setSaving(true);

    try {
      const { data, error } = await supabase
        .from("feriados")
        .insert(holidayForm)
        .select()
        .single();

      if (error) throw error;

      setFeriados((prev) => [data as Feriado, ...prev]);

      toast({
        title: "Sucesso!",
        description: "Feriado adicionado com sucesso.",
      });

      setHolidayDialogOpen(false);
      setHolidayForm({ data: "", descricao: "", nacional: true });
    } catch (error) {
      console.error("Error saving holiday:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o feriado.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Delete holiday
  const deleteHoliday = async (id: string) => {
    try {
      const { error } = await supabase.from("feriados").delete().eq("id", id);

      if (error) throw error;

      setFeriados((prev) => prev.filter((f) => f.id !== id));

      toast({
        title: "Sucesso!",
        description: "Feriado excluído com sucesso.",
      });
    } catch (error) {
      console.error("Error deleting holiday:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o feriado.",
        variant: "destructive",
      });
    }
  };

  // Save config
  const saveConfig = async () => {
    setSaving(true);

    try {
      // Check if config exists
      const { data: existing } = await supabase
        .from("configuracoes_empresa")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (existing) {
        await supabase.from("configuracoes_empresa").update(config).eq("id", existing.id);
      } else {
        await supabase.from("configuracoes_empresa").insert(config);
      }

      toast({
        title: "Sucesso!",
        description: "Configurações salvas com sucesso.",
      });
    } catch (error) {
      console.error("Error saving config:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie as configurações do sistema de ponto
          </p>
        </div>

        <Tabs defaultValue="geral">
          <TabsList>
            <TabsTrigger value="geral">
              <Settings className="w-4 h-4 mr-2" />
              Geral
            </TabsTrigger>
            <TabsTrigger value="departamentos">
              <Building className="w-4 h-4 mr-2" />
              Departamentos
            </TabsTrigger>
            <TabsTrigger value="feriados">
              <Calendar className="w-4 h-4 mr-2" />
              Feriados
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="geral">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Configurações Gerais</CardTitle>
                <CardDescription>
                  Configure as regras gerais do sistema de ponto
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Selfie Obrigatória</Label>
                    <p className="text-sm text-muted-foreground">
                      Exigir foto para registro remoto
                    </p>
                  </div>
                  <Switch
                    checked={config.selfie_obrigatoria}
                    onCheckedChange={(checked) =>
                      setConfig((prev) => ({ ...prev, selfie_obrigatoria: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notificar Gestor em Atraso</Label>
                    <p className="text-sm text-muted-foreground">
                      Enviar notificação quando funcionário atrasar
                    </p>
                  </div>
                  <Switch
                    checked={config.notificar_gestor_atraso}
                    onCheckedChange={(checked) =>
                      setConfig((prev) => ({ ...prev, notificar_gestor_atraso: checked }))
                    }
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="raio">Raio de Geolocalização (km)</Label>
                    <Input
                      id="raio"
                      type="number"
                      step="0.1"
                      value={config.raio_geolocalizacao_km}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          raio_geolocalizacao_km: parseFloat(e.target.value),
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="retencao">Período de Retenção (anos)</Label>
                    <Input
                      id="retencao"
                      type="number"
                      value={config.periodo_retencao_anos}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          periodo_retencao_anos: parseInt(e.target.value),
                        }))
                      }
                    />
                  </div>
                </div>

                <Button onClick={saveConfig} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Configurações
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Departments */}
          <TabsContent value="departamentos">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Departamentos</CardTitle>
                  <CardDescription>
                    Gerencie os departamentos e suas jornadas
                  </CardDescription>
                </div>
                <Dialog open={deptDialogOpen} onOpenChange={setDeptDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      onClick={() => {
                        setEditingDept(null);
                        setDeptForm({
                          nome: "",
                          hora_entrada_padrao: "09:00",
                          hora_saida_padrao: "18:00",
                          tolerancia_minutos: 10,
                          tipo_jornada: "fixa",
                        });
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Novo Departamento
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingDept ? "Editar" : "Novo"} Departamento
                      </DialogTitle>
                      <DialogDescription>
                        Preencha os dados do departamento
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="nome">Nome</Label>
                        <Input
                          id="nome"
                          value={deptForm.nome}
                          onChange={(e) =>
                            setDeptForm((prev) => ({ ...prev, nome: e.target.value }))
                          }
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="entrada">Hora de Entrada</Label>
                          <Input
                            id="entrada"
                            type="time"
                            value={deptForm.hora_entrada_padrao}
                            onChange={(e) =>
                              setDeptForm((prev) => ({
                                ...prev,
                                hora_entrada_padrao: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="saida">Hora de Saída</Label>
                          <Input
                            id="saida"
                            type="time"
                            value={deptForm.hora_saida_padrao}
                            onChange={(e) =>
                              setDeptForm((prev) => ({
                                ...prev,
                                hora_saida_padrao: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="tolerancia">Tolerância (min)</Label>
                          <Input
                            id="tolerancia"
                            type="number"
                            value={deptForm.tolerancia_minutos}
                            onChange={(e) =>
                              setDeptForm((prev) => ({
                                ...prev,
                                tolerancia_minutos: parseInt(e.target.value),
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="jornada">Tipo de Jornada</Label>
                          <Select
                            value={deptForm.tipo_jornada}
                            onValueChange={(v) =>
                              setDeptForm((prev) => ({
                                ...prev,
                                tipo_jornada: v as "fixa" | "flexivel",
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fixa">Fixa</SelectItem>
                              <SelectItem value="flexivel">Flexível</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDeptDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={saveDepartment} disabled={saving || !deptForm.nome}>
                        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Salvar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Horário</TableHead>
                      <TableHead>Tolerância</TableHead>
                      <TableHead>Jornada</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departamentos.map((dept) => (
                      <TableRow key={dept.id}>
                        <TableCell className="font-medium">{dept.nome}</TableCell>
                        <TableCell className="font-mono">
                          {dept.hora_entrada_padrao?.substring(0, 5)} - {dept.hora_saida_padrao?.substring(0, 5)}
                        </TableCell>
                        <TableCell>{dept.tolerancia_minutos} min</TableCell>
                        <TableCell className="capitalize">{dept.tipo_jornada}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingDept(dept);
                              setDeptForm({
                                nome: dept.nome,
                                hora_entrada_padrao: dept.hora_entrada_padrao?.substring(0, 5) || "09:00",
                                hora_saida_padrao: dept.hora_saida_padrao?.substring(0, 5) || "18:00",
                                tolerancia_minutos: dept.tolerancia_minutos,
                                tipo_jornada: dept.tipo_jornada,
                              });
                              setDeptDialogOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => deleteDepartment(dept.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Holidays */}
          <TabsContent value="feriados">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Feriados</CardTitle>
                  <CardDescription>Gerencie os feriados e dias especiais</CardDescription>
                </div>
                <Dialog open={holidayDialogOpen} onOpenChange={setHolidayDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      onClick={() => {
                        setHolidayForm({ data: "", descricao: "", nacional: true });
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Novo Feriado
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Novo Feriado</DialogTitle>
                      <DialogDescription>Adicione um novo feriado</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="data">Data</Label>
                        <Input
                          id="data"
                          type="date"
                          value={holidayForm.data}
                          onChange={(e) =>
                            setHolidayForm((prev) => ({ ...prev, data: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="descricao">Descrição</Label>
                        <Input
                          id="descricao"
                          value={holidayForm.descricao}
                          onChange={(e) =>
                            setHolidayForm((prev) => ({
                              ...prev,
                              descricao: e.target.value,
                            }))
                          }
                          placeholder="Ex: Natal"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Feriado Nacional</Label>
                        <Switch
                          checked={holidayForm.nacional}
                          onCheckedChange={(checked) =>
                            setHolidayForm((prev) => ({ ...prev, nacional: checked }))
                          }
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setHolidayDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button
                        onClick={saveHoliday}
                        disabled={saving || !holidayForm.data || !holidayForm.descricao}
                      >
                        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Salvar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feriados.map((feriado) => (
                      <TableRow key={feriado.id}>
                        <TableCell className="font-mono">
                          {format(new Date(feriado.data + "T12:00:00"), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell>{feriado.descricao}</TableCell>
                        <TableCell>
                          {feriado.nacional ? "Nacional" : "Local"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => deleteHoliday(feriado.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
