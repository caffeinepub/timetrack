import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { LogIn, LogOut } from "lucide-react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useSafeTap } from "../hooks/useSafeTap";

interface HeaderProps {
  userName?: string;
  missionsBadgeCount?: number;
}

export default function Header({ userName, missionsBadgeCount }: HeaderProps) {
  const { login, clear, loginStatus, identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const safeTap = useSafeTap();

  const isAuthenticated = !!identity;
  const disabled = loginStatus === "logging-in";
  const principalId = identity?.getPrincipal().toText();

  const handleAuth = safeTap(async () => {
    if (isAuthenticated) {
      await clear();
      queryClient.clear();
    } else {
      try {
        await login();
      } catch (error: any) {
        console.error("Login error:", error);
        if (error.message === "User is already authenticated") {
          await clear();
          setTimeout(() => login(), 300);
        }
      }
    }
  });

  return (
    <header
      className="sticky top-0 z-50 overflow-x-hidden shadow-md"
      style={{
        backgroundColor: "oklch(var(--navy-dark))",
        borderBottom: "3px solid oklch(var(--vts-green))",
      }}
    >
      <div className="w-full mx-auto px-3 sm:px-4 md:px-6 py-3">
        <div className="flex items-center justify-between gap-2 sm:gap-3 min-w-0">
          {/* Left: Logo + Branding */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner overflow-hidden"
              style={{
                backgroundColor: "#0f1e4a",
                border: "2px solid rgba(255,255,255,0.3)",
              }}
            >
              <img
                src="/assets/generated/vts-pwa-icon.dim_512x512.png"
                alt="VTS"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white truncate leading-tight">
                  Vial Traite Service
                </h1>
                {userName && (
                  <span
                    className="text-xs sm:text-sm font-semibold truncate"
                    style={{ color: "oklch(var(--vts-green))" }}
                  >
                    Bonjour {userName}
                  </span>
                )}
              </div>
              {/* DEBUG: affiche le Principal ID pour vérification admin */}
              {isAuthenticated && principalId && (
                <div className="mt-0.5">
                  <span className="text-[9px] font-mono text-white/40 break-all">
                    ID: {principalId}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {missionsBadgeCount && missionsBadgeCount > 0 ? (
              <span
                className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white flex-shrink-0"
                style={{ backgroundColor: "#ea580c" }}
                title={`${missionsBadgeCount} mission(s) à réaliser aujourd'hui`}
              >
                {missionsBadgeCount}
              </span>
            ) : null}
            <Button
              type="button"
              onClick={handleAuth}
              disabled={disabled}
              size="sm"
              className="gap-1 sm:gap-2 touch-action-manipulation select-none text-xs sm:text-sm font-semibold border border-white/20 bg-white/10 hover:bg-white/20 text-white"
            >
              {disabled ? (
                <span className="pointer-events-none">Connexion...</span>
              ) : isAuthenticated ? (
                <>
                  <LogOut className="w-3 h-3 sm:w-4 sm:h-4 pointer-events-none" />
                  <span className="pointer-events-none hidden sm:inline">
                    Déconnexion
                  </span>
                </>
              ) : (
                <>
                  <LogIn className="w-3 h-3 sm:w-4 sm:h-4 pointer-events-none" />
                  <span className="pointer-events-none">Connexion</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
