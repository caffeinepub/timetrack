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
import Dashboard from "./pages/Dashboard";
import Journal from "./pages/Journal";
import Reports from "./pages/Reports";
import { getBuildInfo } from "./utils/buildInfo";

type Page = "dashboard" | "calendar" | "journal" | "reports";

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(true);
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");

  const { identity, isInitializing } = useInternetIdentity();
  const isAuthenticated = !!identity;
  const buildInfo = getBuildInfo();

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
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        {/* Welcome dialog shown even on the login screen */}
        <WelcomeDialog
          open={showWelcomeDialog}
          onClose={() => setShowWelcomeDialog(false)}
        />
        <div className="text-center max-w-md w-full">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4 text-primary">
            Suivi du Temps
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground mb-8">
            Gérez vos heures de travail, congés et astreintes en toute
            simplicité
          </p>
          <Header />
          <div className="mt-8 p-4 sm:p-6 bg-card rounded-lg shadow-lg border">
            <h2 className="text-base sm:text-lg font-semibold mb-3">
              Fonctionnalités
            </h2>
            <ul className="text-left space-y-2 text-sm text-muted-foreground">
              <li>📊 Tableau de bord avec statistiques détaillées</li>
              <li>📅 Calendrier interactif pour la gestion des journées</li>
              <li>📝 Journal de travail avec notes et photos</li>
              <li>📄 Génération de rapports PDF et CSV</li>
              <li>🔒 Authentification sécurisée avec Internet Identity</li>
            </ul>
          </div>
          {buildInfo.mode && (
            <div className="mt-4 text-xs text-muted-foreground break-words">
              MODE={buildInfo.mode}
              {buildInfo.timestamp && ` • ${buildInfo.timestamp}`}
            </div>
          )}
        </div>
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
        <div className={currentPage === "journal" ? "block" : "hidden"}>
          <Journal />
        </div>
        <div className={currentPage === "reports" ? "block" : "hidden"}>
          <Reports />
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
