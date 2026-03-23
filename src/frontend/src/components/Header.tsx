import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { LogIn, LogOut } from "lucide-react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useIsCallerAdmin } from "../hooks/useQueries";
import { useSafeTap } from "../hooks/useSafeTap";
import PublishRetryDialog from "./PublishRetryDialog";

interface HeaderProps {
  userName?: string;
}

export default function Header({ userName }: HeaderProps) {
  const { login, clear, loginStatus, identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const { data: isAdmin, isLoading: isAdminLoading } = useIsCallerAdmin();
  const safeTap = useSafeTap();

  const isAuthenticated = !!identity;
  const disabled = loginStatus === "logging-in";

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
            {/* VTS Logo badge */}
            <div
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-extrabold text-sm shadow-inner"
              style={{
                backgroundColor: "oklch(var(--vts-orange))",
                color: "white",
              }}
            >
              🐄
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
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {isAuthenticated && !isAdminLoading && isAdmin && (
              <PublishRetryDialog />
            )}
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
