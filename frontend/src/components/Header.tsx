import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useQueryClient } from '@tanstack/react-query';
import { useIsCallerAdmin } from '../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { Clock, LogOut, LogIn } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import PublishRetryDialog from './PublishRetryDialog';
import { useSafeTap } from '../hooks/useSafeTap';
import { getBuildInfo } from '../utils/buildInfo';

interface HeaderProps {
  userName?: string;
}

export default function Header({ userName }: HeaderProps) {
  const { login, clear, loginStatus, identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const { data: isAdmin, isLoading: isAdminLoading } = useIsCallerAdmin();
  const safeTap = useSafeTap();

  const isAuthenticated = !!identity;
  const disabled = loginStatus === 'logging-in';
  const buildInfo = getBuildInfo();

  const handleAuth = safeTap(async () => {
    if (isAuthenticated) {
      await clear();
      queryClient.clear();
    } else {
      try {
        await login();
      } catch (error: any) {
        console.error('Login error:', error);
        if (error.message === 'User is already authenticated') {
          await clear();
          setTimeout(() => login(), 300);
        }
      }
    }
  });

  return (
    <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50 overflow-x-hidden">
      <div className="w-full mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2 sm:gap-3 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground pointer-events-none" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg md:text-xl font-bold text-foreground truncate">TimeTrack</h1>
                <Badge variant="outline" className="text-[10px] sm:text-xs bg-green-50 dark:bg-green-950 border-green-500 text-green-700 dark:text-green-300 whitespace-nowrap flex-shrink-0">
                  v7 {buildInfo.mode && `(${buildInfo.mode})`}
                </Badge>
              </div>
              {userName && (
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Bonjour, {userName}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isAuthenticated && !isAdminLoading && isAdmin && (
              <PublishRetryDialog />
            )}
            <Button
              type="button"
              onClick={handleAuth}
              disabled={disabled}
              variant={isAuthenticated ? 'outline' : 'default'}
              size="sm"
              className="gap-1 sm:gap-2 touch-action-manipulation select-none text-xs sm:text-sm"
            >
              {disabled ? (
                <span className="pointer-events-none">Connexion...</span>
              ) : isAuthenticated ? (
                <>
                  <LogOut className="w-3 h-3 sm:w-4 sm:h-4 pointer-events-none" />
                  <span className="pointer-events-none hidden sm:inline">Déconnexion</span>
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
