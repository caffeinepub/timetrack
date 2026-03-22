import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import React, { useState } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import Footer from "./components/Footer";
import Header from "./components/Header";
import MobileBottomNav from "./components/MobileBottomNav";
import WelcomeDialog from "./components/WelcomeDialog";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import {
  useGetCallerUserProfile,
  useSaveCallerUserProfile,
} from "./hooks/useQueries";
import Calendar from "./pages/Calendar";
import Clients from "./pages/Clients";
import Dashboard from "./pages/Dashboard";
import Memo from "./pages/Memo";
import Reports from "./pages/Reports";

export type Page = "dashboard" | "calendar" | "memo" | "reports" | "clients";

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(true);
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");

  const { identity, isInitializing, login } = useInternetIdentity();
  const isAuthenticated = !!identity;

  const {
    data: userProfile,
    isLoading: profileLoading,
    isFetched: profileFetched,
  } = useGetCallerUserProfile();

  const saveProfile = useSaveCallerUserProfile();

  const showProfileSetup =
    isAuthenticated &&
    !profileLoading &&
    profileFetched &&
    userProfile === null;

  const handleSaveProfile = async () => {
    if (!profileName.trim()) return;
    try {
      await saveProfile.mutateAsync({
        name: profileName.trim(),
        email: profileEmail.trim(),
      });
    } catch (error) {
      console.error("Error saving profile:", error);
    }
  };

  const handleTabChange = (page: Page) => {
    if (page === currentPage) return;
    requestAnimationFrame(() => {
      setCurrentPage(page);
    });
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Initialisation...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // If trying to access private sections, redirect to memo
    if (currentPage === "dashboard" || currentPage === "calendar") {
      setCurrentPage("memo");
      return null;
    }

    // Show public layout for memo, reports, clients
    return (
      <div className="min-h-screen flex flex-col bg-background overflow-x-hidden">
        <WelcomeDialog
          open={showWelcomeDialog}
          onClose={() => setShowWelcomeDialog(false)}
        />
        {/* Header */}
        <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <h1 className="text-base font-bold text-primary truncate">
            Suivi du Temps
          </h1>
          <button
            type="button"
            onClick={() => login()}
            className="text-sm px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium"
            data-ocid="login.button"
          >
            Se connecter
          </button>
        </div>
        {/* Content */}
        <main className="flex-1 w-full mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 max-w-7xl min-w-0">
          <div className={currentPage === "memo" ? "block" : "hidden"}>
            <Memo />
          </div>
          <div className={currentPage === "reports" ? "block" : "hidden"}>
            <Reports />
          </div>
          <div className={currentPage === "clients" ? "block" : "hidden"}>
            <Clients />
          </div>
        </main>
        {/* Bottom nav - public sections only */}
        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40">
          <div className="flex justify-around max-w-lg mx-auto">
            {(
              [
                { id: "memo", label: "Mémo", icon: "📝" },
                { id: "reports", label: "Rapports", icon: "📊" },
                { id: "clients", label: "Clients", icon: "👥" },
              ] as { id: Page; label: string; icon: string }[]
            ).map(({ id, label, icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setCurrentPage(id)}
                className={`flex flex-col items-center py-2 px-4 text-xs font-medium transition-colors ${
                  currentPage === id ? "text-primary" : "text-muted-foreground"
                }`}
                data-ocid={`nav.${id}.tab`}
              >
                <span className="text-lg mb-0.5">{icon}</span>
                {label}
              </button>
            ))}
          </div>
        </nav>
        <div className="h-16" />
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background pb-safe overflow-x-hidden">
      {/* Welcome dialog shown once per session */}
      <WelcomeDialog
        open={showWelcomeDialog}
        onClose={() => setShowWelcomeDialog(false)}
      />

      <Header userName={userProfile?.name} />

      <main className="flex-1 w-full mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-8 max-w-7xl min-w-0">
        {/* Keep all tabs mounted to avoid aggressive unmount/remount */}
        <div className={currentPage === "dashboard" ? "block" : "hidden"}>
          <Dashboard />
        </div>
        <div className={currentPage === "calendar" ? "block" : "hidden"}>
          <Calendar />
        </div>
        <div className={currentPage === "memo" ? "block" : "hidden"}>
          <Memo />
        </div>
        <div className={currentPage === "reports" ? "block" : "hidden"}>
          <Reports />
        </div>
        <div className={currentPage === "clients" ? "block" : "hidden"}>
          <Clients />
        </div>
      </main>

      <Footer />

      <MobileBottomNav currentPage={currentPage} onNavigate={handleTabChange} />

      {/* Profile setup dialog */}
      <Dialog open={showProfileSetup} onOpenChange={() => {}}>
        <DialogContent
          className="max-w-[calc(100vw-2rem)] sm:max-w-md max-h-[85vh] overflow-y-auto"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              Configuration du profil
            </DialogTitle>
            <DialogDescription className="text-sm">
              Veuillez compléter votre profil pour continuer
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm">
                Nom complet *
              </Label>
              <Input
                id="name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Jean Dupont"
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm">
                Email (optionnel)
              </Label>
              <Input
                id="email"
                type="email"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                placeholder="jean.dupont@example.com"
                className="text-base"
              />
            </div>
          </div>
          <Button
            type="button"
            onClick={handleSaveProfile}
            disabled={!profileName.trim() || saveProfile.isPending}
            className="w-full touch-action-manipulation"
          >
            {saveProfile.isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
      <Toaster position="top-center" />
    </ErrorBoundary>
  );
}
