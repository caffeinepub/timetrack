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
import Facturation from "./pages/Facturation";
import Memo from "./pages/Memo";

export type Page =
  | "dashboard"
  | "calendar"
  | "memo"
  | "facturation"
  | "clients";

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(true);
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");

  const { identity, isInitializing, login, isLoggingIn } =
    useInternetIdentity();
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
    return (
      <div className="min-h-screen flex flex-col bg-background overflow-x-hidden">
        <WelcomeDialog
          open={showWelcomeDialog}
          onClose={() => setShowWelcomeDialog(false)}
        />
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm text-center space-y-8">
            {/* Logo / Icon */}
            <div className="space-y-3">
              <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
                <span className="text-4xl">⏱️</span>
              </div>
              <h1 className="text-2xl font-bold text-foreground">
                Suivi du Temps
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Connectez-vous pour accéder à l'application et gérer vos
                journées de travail, rapports et interventions.
              </p>
            </div>

            {/* Features list */}
            <div className="space-y-2 text-left">
              {[
                { icon: "📅", label: "Calendrier & journées de travail" },
                { icon: "📝", label: "Mémo partagé entre utilisateurs" },
                { icon: "📊", label: "Rapports communs" },
                { icon: "👥", label: "Fichier clients partagé" },
              ].map(({ icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 text-sm text-muted-foreground"
                >
                  <span className="text-base">{icon}</span>
                  <span>{label}</span>
                </div>
              ))}
            </div>

            {/* Login button */}
            <Button
              type="button"
              onClick={() => login()}
              disabled={isLoggingIn}
              className="w-full h-12 text-base font-semibold"
              data-ocid="login.button"
            >
              {isLoggingIn ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Connexion en cours...
                </>
              ) : (
                "Se connecter"
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              Authentification sécurisée via Internet Identity
            </p>
          </div>
        </div>
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
        <div className={currentPage === "facturation" ? "block" : "hidden"}>
          <Facturation />
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
                data-ocid="profile.input"
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
            data-ocid="profile.submit_button"
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
