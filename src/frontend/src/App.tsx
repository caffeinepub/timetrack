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
      <div
        className="min-h-screen flex flex-col overflow-x-hidden"
        style={{
          background:
            "linear-gradient(135deg, #1d4ed8 0%, #1d4ed8 35%, #16a34a 60%, #ea580c 100%)",
        }}
      >
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm text-center space-y-6">
            {/* Logo vache */}
            <div className="flex flex-col items-center space-y-4">
              <div className="w-36 h-36 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-2xl border-4 border-white/40">
                <img
                  src="/assets/generated/vache-logo-transparent.dim_300x300.png"
                  alt="Vial Traite Service logo"
                  className="w-28 h-28 object-contain drop-shadow-lg"
                />
              </div>
              <div className="space-y-1">
                <h1 className="text-3xl font-extrabold text-white tracking-tight drop-shadow-md">
                  Vial Traite Service
                </h1>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <div className="h-0.5 w-8 bg-white/50 rounded" />
                  <span className="text-white/80 text-xs font-medium uppercase tracking-widest">
                    Gestion du temps
                  </span>
                  <div className="h-0.5 w-8 bg-white/50 rounded" />
                </div>
              </div>
            </div>

            {/* Login card */}
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-6 space-y-4 border border-white/30 shadow-xl">
              <p className="text-white/90 text-sm leading-relaxed">
                Connectez-vous pour accéder à votre espace de gestion des
                journées de travail et interventions.
              </p>

              <Button
                type="button"
                onClick={() => login()}
                disabled={isLoggingIn}
                className="w-full h-12 text-base font-bold bg-white text-blue-700 hover:bg-white/90 border-0 shadow-lg rounded-xl"
                data-ocid="login.button"
              >
                {isLoggingIn ? (
                  <>
                    <div className="w-4 h-4 border-2 border-blue-700 border-t-transparent rounded-full animate-spin mr-2" />
                    Connexion en cours...
                  </>
                ) : (
                  "Se connecter"
                )}
              </Button>

              <p className="text-white/60 text-xs">
                Authentification sécurisée via Internet Identity
              </p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background pb-safe overflow-x-hidden">
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
