import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/MainLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Clock,
  MapPin,
  Camera,
  LogIn,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Loader2,
  QrCode,
  Fingerprint,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LocationData {
  latitude: number;
  longitude: number;
  endereco: string;
}

export default function RegistrarPonto() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [location, setLocation] = useState<LocationData | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  
  const [cameraActive, setCameraActive] = useState(false);
  const [selfieData, setSelfieData] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [observacao, setObservacao] = useState("");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"entrada" | "saida" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [todayRecords, setTodayRecords] = useState<Array<{ tipo: string; data_hora: string }>>([]);
  const [method, setMethod] = useState<"app" | "biometria" | "qrcode">("app");

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

    const fetchRecords = async () => {
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      
      const { data } = await supabase
        .from("registros_ponto")
        .select("tipo, data_hora")
        .eq("usuario_id", user.id)
        .gte("data_hora", startOfDay)
        .order("data_hora", { ascending: true });

      if (data) {
        setTodayRecords(data);
      }
    };

    fetchRecords();
  }, [user]);

  // Get geolocation
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          // Reverse geocoding (simplified - in production use a proper API)
          let endereco = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          
          try {
            // Using a free reverse geocoding service
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            );
            const data = await response.json();
            if (data.display_name) {
              endereco = data.display_name;
            }
          } catch (error) {
            console.log("Could not get address from coordinates");
          }
          
          setLocation({ latitude, longitude, endereco });
          setLocationLoading(false);
        },
        (error) => {
          setLocationError("Não foi possível obter sua localização");
          setLocationLoading(false);
        },
        { enableHighAccuracy: true }
      );
    } else {
      setLocationError("Geolocalização não suportada");
      setLocationLoading(false);
    }
  }, []);

  // Camera functions
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (error) {
      toast({
        title: "Erro na câmera",
        description: "Não foi possível acessar a câmera",
        variant: "destructive",
      });
    }
  };

  const takeSelfie = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      
      // Add timestamp overlay
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(0, canvas.height - 60, canvas.width, 60);
      ctx.fillStyle = "white";
      ctx.font = "16px monospace";
      ctx.fillText(format(new Date(), "dd/MM/yyyy HH:mm:ss"), 10, canvas.height - 35);
      ctx.fillText(location?.endereco?.substring(0, 50) || "Localização não disponível", 10, canvas.height - 15);
      
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      setSelfieData(dataUrl);
    }

    stopCamera();
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Determine next action
  const getNextAction = () => {
    if (todayRecords.length === 0) {
      return "entrada" as const;
    }
    const lastRecord = todayRecords[todayRecords.length - 1];
    return lastRecord.tipo === "entrada" ? "saida" as const : "entrada" as const;
  };

  const nextAction = getNextAction();

  // Handle registration
  const handleRegister = (tipo: "entrada" | "saida") => {
    setPendingAction(tipo);
    setConfirmDialogOpen(true);
  };

  const confirmRegister = async () => {
    if (!user || !pendingAction) return;

    setSubmitting(true);

    try {
      let selfieUrl = null;

      // Upload selfie if exists
      if (selfieData) {
        const fileName = `${user.id}/${Date.now()}.jpg`;
        const base64Data = selfieData.split(",")[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "image/jpeg" });

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("selfies")
          .upload(fileName, blob);

        if (uploadError) {
          console.error("Error uploading selfie:", uploadError);
        } else {
          selfieUrl = uploadData.path;
        }
      }

      // Insert record
      const { error } = await supabase.from("registros_ponto").insert({
        usuario_id: user.id,
        tipo: pendingAction,
        metodo: method,
        latitude: location?.latitude,
        longitude: location?.longitude,
        endereco: location?.endereco,
        selfie_url: selfieUrl,
        observacao: observacao || null,
      });

      if (error) throw error;

      toast({
        title: pendingAction === "entrada" ? "Entrada registrada!" : "Saída registrada!",
        description: `Ponto registrado às ${format(new Date(), "HH:mm")}`,
      });

      navigate("/dashboard");
    } catch (error) {
      console.error("Error registering:", error);
      toast({
        title: "Erro ao registrar ponto",
        description: "Tente novamente em alguns instantes",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
      setConfirmDialogOpen(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold">Registrar Ponto</h1>
          <p className="text-muted-foreground">
            {format(currentTime, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>

        {/* Time Display */}
        <Card className="overflow-hidden">
          <div className="gradient-corporate p-8 text-white text-center">
            <p className="text-white/80 text-sm mb-2">Horário atual</p>
            <div className="time-display text-6xl">
              {format(currentTime, "HH:mm:ss")}
            </div>
          </div>
        </Card>

        {/* Location Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Localização
            </CardTitle>
          </CardHeader>
          <CardContent>
            {locationLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Obtendo localização...
              </div>
            ) : locationError ? (
              <div className="flex items-center gap-2 text-warning">
                <AlertCircle className="w-4 h-4" />
                {locationError}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle2 className="w-4 h-4" />
                  Localização obtida
                </div>
                <p className="text-sm text-muted-foreground">
                  {location?.endereco}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Camera/Selfie Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Selfie
            </CardTitle>
            <CardDescription>
              Tire uma foto para confirmar sua identidade
            </CardDescription>
          </CardHeader>
          <CardContent>
            {cameraActive ? (
              <div className="space-y-4">
                <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-4 left-4 text-white text-sm font-mono bg-black/70 px-2 py-1 rounded">
                    {format(currentTime, "dd/MM/yyyy HH:mm:ss")}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={takeSelfie} className="flex-1">
                    <Camera className="w-4 h-4 mr-2" />
                    Tirar Foto
                  </Button>
                  <Button variant="outline" onClick={stopCamera}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : selfieData ? (
              <div className="space-y-4">
                <div className="relative rounded-lg overflow-hidden aspect-video">
                  <img src={selfieData} alt="Selfie" className="w-full h-full object-cover" />
                  <Badge className="absolute top-2 right-2 status-aprovado">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Foto capturada
                  </Badge>
                </div>
                <Button variant="outline" onClick={() => { setSelfieData(null); startCamera(); }}>
                  Tirar outra foto
                </Button>
              </div>
            ) : (
              <Button variant="outline" onClick={startCamera} className="w-full">
                <Camera className="w-4 h-4 mr-2" />
                Ativar Câmera
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Method Selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Método de Registro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={method === "app" ? "default" : "outline"}
                onClick={() => setMethod("app")}
                className="flex flex-col h-auto py-4"
              >
                <Clock className="w-5 h-5 mb-1" />
                <span className="text-xs">App</span>
              </Button>
              <Button
                variant={method === "biometria" ? "default" : "outline"}
                onClick={() => setMethod("biometria")}
                className="flex flex-col h-auto py-4"
              >
                <Fingerprint className="w-5 h-5 mb-1" />
                <span className="text-xs">Biometria</span>
              </Button>
              <Button
                variant={method === "qrcode" ? "default" : "outline"}
                onClick={() => setMethod("qrcode")}
                className="flex flex-col h-auto py-4"
              >
                <QrCode className="w-5 h-5 mb-1" />
                <span className="text-xs">QR Code</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Observation */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Observação (opcional)</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Adicione uma observação se necessário..."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              className="resize-none"
              rows={2}
            />
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <Button
            size="lg"
            onClick={() => handleRegister("entrada")}
            disabled={nextAction !== "entrada"}
            className={`h-16 text-lg ${nextAction === "entrada" ? "btn-entrada" : ""}`}
            variant={nextAction !== "entrada" ? "outline" : "default"}
          >
            <LogIn className="w-5 h-5 mr-2" />
            Entrada
          </Button>
          <Button
            size="lg"
            onClick={() => handleRegister("saida")}
            disabled={nextAction !== "saida"}
            className={`h-16 text-lg ${nextAction === "saida" ? "btn-saida" : ""}`}
            variant={nextAction !== "saida" ? "outline" : "default"}
          >
            <LogOut className="w-5 h-5 mr-2" />
            Saída
          </Button>
        </div>

        {/* Today's Records Summary */}
        {todayRecords.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Registros de Hoje</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {todayRecords.map((record, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className={record.tipo === "entrada" ? "status-presente" : "status-rejeitado"}
                  >
                    {record.tipo === "entrada" ? (
                      <LogIn className="w-3 h-3 mr-1" />
                    ) : (
                      <LogOut className="w-3 h-3 mr-1" />
                    )}
                    {format(new Date(record.data_hora), "HH:mm")}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Confirmation Dialog */}
        <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Confirmar {pendingAction === "entrada" ? "Entrada" : "Saída"}
              </DialogTitle>
              <DialogDescription>
                Você está prestes a registrar sua {pendingAction === "entrada" ? "entrada" : "saída"}.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Clock className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Horário</p>
                  <p className="font-mono font-bold">{format(currentTime, "HH:mm:ss")}</p>
                </div>
              </div>
              
              {location && (
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <MapPin className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Localização</p>
                    <p className="text-sm">{location.endereco?.substring(0, 60)}...</p>
                  </div>
                </div>
              )}
              
              {selfieData && (
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Camera className="w-5 h-5 text-success" />
                  <div>
                    <p className="text-sm text-muted-foreground">Selfie</p>
                    <p className="text-sm text-success">Foto capturada</p>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={confirmRegister}
                disabled={submitting}
                className={pendingAction === "entrada" ? "btn-entrada" : "btn-saida"}
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : pendingAction === "entrada" ? (
                  <LogIn className="w-4 h-4 mr-2" />
                ) : (
                  <LogOut className="w-4 h-4 mr-2" />
                )}
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
