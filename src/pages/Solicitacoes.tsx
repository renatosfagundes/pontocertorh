import { useState, useEffect } from "react";
import { MainLayout } from "@/components/MainLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ClipboardList,
  Clock,
  Check,
  X,
  Loader2,
  AlertCircle,
  User,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Solicitacao {
  id: string;
  usuario_id: string;
  registro_id: string | null;
  nova_data_hora: string;
  tipo: "entrada" | "saida";
  motivo: string;
  status: "pendente" | "aprovado" | "rejeitado";
  aprovador_id: string | null;
  data_aprovacao: string | null;
  justificativa_aprovador: string | null;
  created_at: string;
  profiles?: {
    nome: string;
    email: string;
  };
}

export default function Solicitacoes() {
  const { user, isManager } = useAuth();
  const { toast } = useToast();

  const [minhasSolicitacoes, setMinhasSolicitacoes] = useState<Solicitacao[]>([]);
  const [equipesolicitacoes, setEquipeSolicitacoes] = useState<Solicitacao[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Solicitacao | null>(null);
  const [justificativa, setJustificativa] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch requests
  useEffect(() => {
    if (!user) return;

    const fetchRequests = async () => {
      setLoading(true);

      // Fetch my requests
      const { data: myRequests } = await supabase
        .from("solicitacoes_ajuste")
        .select("*")
        .eq("usuario_id", user.id)
        .order("created_at", { ascending: false });

      if (myRequests) {
        setMinhasSolicitacoes(myRequests as Solicitacao[]);
      }

      // Fetch team requests (for managers)
      if (isManager) {
        const { data: teamRequests } = await supabase
          .from("solicitacoes_ajuste")
          .select("*")
          .eq("status", "pendente")
          .neq("usuario_id", user.id)
          .order("created_at", { ascending: false });

        if (teamRequests) {
          setEquipeSolicitacoes(teamRequests as Solicitacao[]);
        }
      }

      setLoading(false);
    };

    fetchRequests();
  }, [user, isManager]);

  // Handle review
  const handleReview = (request: Solicitacao) => {
    setSelectedRequest(request);
    setJustificativa("");
    setReviewDialogOpen(true);
  };

  const submitReview = async (approved: boolean) => {
    if (!selectedRequest || !user) return;

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from("solicitacoes_ajuste")
        .update({
          status: approved ? "aprovado" : "rejeitado",
          aprovador_id: user.id,
          data_aprovacao: new Date().toISOString(),
          justificativa_aprovador: justificativa || null,
        })
        .eq("id", selectedRequest.id);

      if (error) throw error;

      // If approved, update the original record
      if (approved && selectedRequest.registro_id) {
        await supabase
          .from("registros_ponto")
          .update({ data_hora: selectedRequest.nova_data_hora })
          .eq("id", selectedRequest.registro_id);
      }

      toast({
        title: approved ? "Solicitação aprovada!" : "Solicitação rejeitada",
        description: `A solicitação foi ${approved ? "aprovada" : "rejeitada"} com sucesso.`,
      });

      // Remove from list
      setEquipeSolicitacoes(prev => prev.filter(r => r.id !== selectedRequest.id));
      setReviewDialogOpen(false);
    } catch (error) {
      console.error("Error reviewing request:", error);
      toast({
        title: "Erro ao processar solicitação",
        description: "Tente novamente em alguns instantes",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pendente":
        return <Badge className="status-pendente">Pendente</Badge>;
      case "aprovado":
        return <Badge className="status-aprovado">Aprovado</Badge>;
      case "rejeitado":
        return <Badge className="status-rejeitado">Rejeitado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Solicitações</h1>
          <p className="text-muted-foreground">
            Gerencie suas solicitações de ajuste de ponto
          </p>
        </div>

        <Tabs defaultValue="minhas">
          <TabsList>
            <TabsTrigger value="minhas">Minhas Solicitações</TabsTrigger>
            {isManager && (
              <TabsTrigger value="equipe" className="relative">
                Aprovações Pendentes
                {equipesolicitacoes.length > 0 && (
                  <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs">
                    {equipesolicitacoes.length}
                  </Badge>
                )}
              </TabsTrigger>
            )}
          </TabsList>

          {/* My Requests Tab */}
          <TabsContent value="minhas">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ClipboardList className="w-5 h-5" />
                  Minhas Solicitações
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : minhasSolicitacoes.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>Você não tem solicitações de ajuste</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data Solicitada</TableHead>
                          <TableHead>Novo Horário</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Motivo</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {minhasSolicitacoes.map((request) => (
                          <TableRow key={request.id}>
                            <TableCell>
                              {format(parseISO(request.created_at), "dd/MM/yyyy")}
                            </TableCell>
                            <TableCell className="font-mono">
                              {format(parseISO(request.nova_data_hora), "dd/MM/yyyy HH:mm")}
                            </TableCell>
                            <TableCell>
                              {request.tipo === "entrada" ? "Entrada" : "Saída"}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {request.motivo}
                            </TableCell>
                            <TableCell>{getStatusBadge(request.status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Team Requests Tab (for managers) */}
          {isManager && (
            <TabsContent value="equipe">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-warning" />
                    Aprovações Pendentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : equipesolicitacoes.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Check className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p>Não há solicitações pendentes para aprovação</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {equipesolicitacoes.map((request) => (
                        <div
                          key={request.id}
                          className="p-4 border rounded-lg hover:border-primary/50 transition-colors"
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium">
                                  {request.profiles?.nome || "Funcionário"}
                                </span>
                                <Badge variant="outline">
                                  {request.tipo === "entrada" ? "Entrada" : "Saída"}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="w-4 h-4" />
                                <span>
                                  Novo horário: {format(parseISO(request.nova_data_hora), "dd/MM/yyyy 'às' HH:mm")}
                                </span>
                              </div>
                              <p className="text-sm">
                                <span className="text-muted-foreground">Motivo:</span> {request.motivo}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReview(request)}
                                className="text-destructive hover:text-destructive"
                              >
                                <X className="w-4 h-4 mr-1" />
                                Rejeitar
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  submitReview(true);
                                }}
                                className="bg-success hover:bg-success/90"
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Aprovar
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {/* Review Dialog */}
        <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rejeitar Solicitação</DialogTitle>
              <DialogDescription>
                Forneça uma justificativa para a rejeição.
              </DialogDescription>
            </DialogHeader>

            {selectedRequest && (
              <div className="space-y-4 py-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Solicitante</p>
                  <p className="font-medium">{selectedRequest.profiles?.nome}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Motivo do ajuste</p>
                  <p className="text-sm">{selectedRequest.motivo}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Justificativa da rejeição</label>
                  <Textarea
                    placeholder="Explique o motivo da rejeição..."
                    value={justificativa}
                    onChange={(e) => setJustificativa(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => submitReview(false)}
                disabled={submitting}
                variant="destructive"
              >
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Confirmar Rejeição
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
