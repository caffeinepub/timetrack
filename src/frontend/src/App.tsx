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

function GrassDecoration() {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 overflow-hidden"
      style={{ height: "80px" }}
      role="presentation"
    >
      <div
        className="absolute bottom-0 w-full h-full"
        style={{
          background: "linear-gradient(to bottom, #16a34a 0%, #15803d 100%)",
          clipPath:
            "polygon(0% 75%, 2.5% 56%, 5% 63%, 7.5% 44%, 10% 25%, 12.5% 44%, 15% 56%, 17.5% 38%, 20% 19%, 22.5% 38%, 25% 50%, 27.5% 31%, 30% 19%, 32.5% 38%, 35% 56%, 37.5% 44%, 40% 25%, 42.5% 38%, 45% 50%, 47.5% 31%, 50% 44%, 52.5% 56%, 55% 38%, 57.5% 19%, 60% 38%, 62.5% 56%, 65% 44%, 67.5% 25%, 70% 38%, 72.5% 50%, 75% 31%, 77.5% 44%, 80% 56%, 82.5% 38%, 85% 25%, 87.5% 44%, 90% 56%, 92.5% 38%, 95% 50%, 97.5% 63%, 100% 56%, 100% 100%, 0% 100%)",
          opacity: 0.7,
        }}
      />
      <div
        className="absolute bottom-0 w-full h-full"
        style={{
          background: "linear-gradient(to bottom, #22c55e 0%, #16a34a 100%)",
          clipPath:
            "polygon(0% 88%, 2% 69%, 4% 75%, 6.5% 56%, 9% 38%, 11.5% 56%, 14% 75%, 16.5% 56%, 19% 38%, 21.5% 50%, 24% 63%, 26.5% 44%, 29% 31%, 31.5% 50%, 34% 63%, 36.5% 44%, 39% 31%, 41.5% 50%, 44% 63%, 46.5% 44%, 49% 56%, 51.5% 69%, 54% 50%, 56.5% 31%, 59% 50%, 61.5% 63%, 64% 50%, 66.5% 31%, 69% 44%, 71.5% 63%, 74% 75%, 76.5% 56%, 79% 38%, 81.5% 50%, 84% 63%, 86.5% 44%, 89% 56%, 91.5% 69%, 94% 56%, 96.5% 69%, 99% 75%, 100% 63%, 100% 100%, 0% 100%)",
        }}
      />
    </div>
  );
}

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
        className="min-h-screen flex flex-col overflow-x-hidden relative"
        style={{ backgroundColor: "#0f1e4a" }}
      >
        {/* Main content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 pb-32">
          <div className="w-full max-w-sm text-center space-y-6">
            {/* Logo vache */}
            <div className="flex flex-col items-center space-y-4">
              <div className="w-36 h-36 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center shadow-2xl border-4 border-white/20">
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
                  <div className="h-0.5 w-8 bg-white/40 rounded" />
                  <span className="text-white/70 text-xs font-medium uppercase tracking-widest">
                    Gestion du temps
                  </span>
                  <div className="h-0.5 w-8 bg-white/40 rounded" />
                </div>
              </div>
            </div>

            {/* Login card */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 space-y-4 border border-white/20 shadow-xl">
              <p className="text-white/90 text-sm leading-relaxed">
                Connectez-vous pour accéder à votre espace de gestion des
                journées de travail et interventions.
              </p>

              <Button
                type="button"
                onClick={() => login()}
                disabled={isLoggingIn}
                className="w-full h-12 text-base font-bold border-0 shadow-lg rounded-xl text-white hover:opacity-90"
                style={{ backgroundColor: "#ea580c" }}
                data-ocid="login.button"
              >
                {isLoggingIn ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
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

        <GrassDecoration />
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
