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
import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import DesktopSideNav from "./components/DesktopSideNav";
import ErrorBoundary from "./components/ErrorBoundary";
import Footer from "./components/Footer";
import Header from "./components/Header";
import MobileBottomNav from "./components/MobileBottomNav";
import { ADMIN_PRINCIPAL_ID, useAccessControl } from "./hooks/useAccessControl";
import { useActor } from "./hooks/useActor";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { useGetCallerUserProfile } from "./hooks/useQueries";
import Calendar from "./pages/Calendar";
import Clients from "./pages/Clients";
import Dashboard from "./pages/Dashboard";
import Facturation from "./pages/Facturation";
import Memo from "./pages/Memo";
import Planning from "./pages/Planning";
import Profil from "./pages/Profil";
import TicketEssencePage from "./pages/TicketEssence";
import TicketRestoPage from "./pages/TicketResto";

export type Page =
  | "dashboard"
  | "calendar"
  | "memo"
  | "facturation"
  | "clients"
  | "ticket-resto"
  | "ticket-essence"
  | "planning"
  | "profil";

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
  const [profileError, setProfileError] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const { identity, isInitializing, login, isLoggingIn } =
    useInternetIdentity();
  const isAuthenticated = !!identity;

  const principalId = identity?.getPrincipal().toText() ?? null;
  const isAdmin = principalId === ADMIN_PRINCIPAL_ID;
  const { isSectionReadOnly, visiblePages } = useAccessControl(principalId);

  const { actor } = useActor();

  function nsToDateStr(ns: bigint): string {
    return new Date(Number(ns / BigInt(1_000_000))).toISOString().slice(0, 10);
  }

  const { data: planningItemsForBadge = [] } = useQuery({
    queryKey: ["planningItemsForBadge"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.obtenirTousPlanningItems();
    },
    enabled: !!actor,
    refetchInterval: 30000,
  });

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayMissionCount = (planningItemsForBadge as any[]).filter(
    (item) =>
      item.statut === "a_realiser" &&
      (item.dates as bigint[]).some((d) => nsToDateStr(d) === todayStr),
  ).length;

  const {
    data: userProfile,
    isLoading: profileLoading,
    isFetched: profileFetched,
    refetch: refetchProfile,
  } = useGetCallerUserProfile();

  const showProfileSetup =
    isAuthenticated &&
    !profileLoading &&
    profileFetched &&
    userProfile === null;

  const handleSaveProfile = async () => {
    if (!profileName.trim()) return;
    if (!actor) {
      setProfileError(
        "Connexion au serveur non disponible. Veuillez recharger la page.",
      );
      return;
    }
    setProfileError("");
    setIsSavingProfile(true);
    try {
      await actor.initializeAccessControl();
      await actor.saveCallerUserProfile({
        name: profileName.trim(),
        email: profileEmail.trim(),
        signatureIntervenant: undefined,
      });
      await refetchProfile();
    } catch (error) {
      console.error("Error saving profile:", error);
      setProfileError("Erreur lors de l'enregistrement. Veuillez réessayer.");
    } finally {
      setIsSavingProfile(false);
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
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 pb-32">
          <div className="w-full max-w-sm text-center space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative" style={{ width: 180, height: 180 }}>
                <svg
                  viewBox="0 0 180 180"
                  className="absolute inset-0 w-full h-full"
                  style={{ zIndex: 2 }}
                  aria-hidden="true"
                >
                  <defs>
                    <path id="topArc" d="M 20,90 A 70,70 0 1,1 160,90" />
                  </defs>
                  <text
                    fill="white"
                    fontSize="13"
                    fontWeight="800"
                    letterSpacing="2"
                    fontFamily="sans-serif"
                  >
                    <textPath
                      href="#topArc"
                      startOffset="50%"
                      textAnchor="middle"
                    >
                      VIAL TRAITE SERVICE
                    </textPath>
                  </text>
                </svg>
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ padding: "28px" }}
                >
                  <div className="w-full h-full rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center shadow-2xl border-4 border-white/20">
                    <img
                      src="/assets/generated/vache-logo-transparent.dim_300x300.png"
                      alt="Vial Traite Service logo"
                      className="w-20 h-20 object-contain drop-shadow-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2">
                <div className="h-0.5 w-8 bg-white/40 rounded" />
                <span className="text-white/70 text-xs font-medium uppercase tracking-widest">
                  Gestion du temps
                </span>
                <div className="h-0.5 w-8 bg-white/40 rounded" />
              </div>
            </div>

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
    <div className="min-h-screen flex flex-col bg-background overflow-x-hidden">
      <Header
        userName={userProfile?.name}
        missionsBadgeCount={todayMissionCount}
      />

      <div className="flex flex-1 min-h-0">
        <DesktopSideNav
          currentPage={currentPage}
          onNavigate={handleTabChange}
          visiblePages={visiblePages}
          isAdmin={isAdmin}
        />

        <main className="flex-1 min-w-0 px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-8 overflow-x-hidden">
          <div className={currentPage === "dashboard" ? "block" : "hidden"}>
            <Dashboard readOnly={isSectionReadOnly("dashboard")} />
          </div>
          <div className={currentPage === "calendar" ? "block" : "hidden"}>
            <Calendar readOnly={isSectionReadOnly("calendar")} />
          </div>
          <div className={currentPage === "memo" ? "block" : "hidden"}>
            <Memo readOnly={isSectionReadOnly("memo")} />
          </div>
          <div className={currentPage === "facturation" ? "block" : "hidden"}>
            <Facturation readOnly={isSectionReadOnly("facturation")} />
          </div>
          <div className={currentPage === "clients" ? "block" : "hidden"}>
            <Clients readOnly={isSectionReadOnly("clients")} />
          </div>
          <div className={currentPage === "ticket-resto" ? "block" : "hidden"}>
            <TicketRestoPage readOnly={isSectionReadOnly("ticket-resto")} />
          </div>
          <div
            className={currentPage === "ticket-essence" ? "block" : "hidden"}
          >
            <TicketEssencePage readOnly={isSectionReadOnly("ticket-essence")} />
          </div>
          <div className={currentPage === "planning" ? "block" : "hidden"}>
            <Planning
              onNavigate={handleTabChange}
              readOnly={isSectionReadOnly("planning")}
            />
          </div>
          {currentPage === "profil" && isAdmin && (
            <div>
              <Profil />
            </div>
          )}
        </main>
      </div>

      <Footer />

      <MobileBottomNav
        currentPage={currentPage}
        onNavigate={handleTabChange}
        visiblePages={visiblePages}
        isAdmin={isAdmin}
      />

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
            {profileError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {profileError}
              </p>
            )}
          </div>
          <Button
            type="button"
            onClick={handleSaveProfile}
            disabled={!profileName.trim() || isSavingProfile}
            className="w-full touch-action-manipulation"
            data-ocid="profile.submit_button"
          >
            {isSavingProfile ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Enregistrement...
              </>
            ) : (
              "Enregistrer"
            )}
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
