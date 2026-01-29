import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Pages
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import RegistrarPonto from "./pages/RegistrarPonto";
import MeuHistorico from "./pages/MeuHistorico";
import BancoHoras from "./pages/BancoHoras";
import Solicitacoes from "./pages/Solicitacoes";
import GestaoEquipe from "./pages/GestaoEquipe";
import Relatorios from "./pages/Relatorios";
import Configuracoes from "./pages/Configuracoes";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/auth" element={<Auth />} />
            
            <Route path="/dashboard" element={
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            } />
            <Route path="/registrar-ponto" element={
              <ProtectedRoute><RegistrarPonto /></ProtectedRoute>
            } />
            <Route path="/meu-historico" element={
              <ProtectedRoute><MeuHistorico /></ProtectedRoute>
            } />
            <Route path="/banco-horas" element={
              <ProtectedRoute><BancoHoras /></ProtectedRoute>
            } />
            <Route path="/solicitacoes" element={
              <ProtectedRoute><Solicitacoes /></ProtectedRoute>
            } />
            <Route path="/gestao-equipe" element={
              <ProtectedRoute requiredRole="gestor"><GestaoEquipe /></ProtectedRoute>
            } />
            <Route path="/relatorios" element={
              <ProtectedRoute requiredRole="rh"><Relatorios /></ProtectedRoute>
            } />
            <Route path="/configuracoes" element={
              <ProtectedRoute requiredRole="admin"><Configuracoes /></ProtectedRoute>
            } />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
