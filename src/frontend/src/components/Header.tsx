import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useQueryClient } from '@tanstack/react-query';
import { useIsCallerAdmin } from '../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { Clock, LogOut, LogIn } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import PublishRetryDialog from './PublishRetryDialog';
import { logDebug } from '../utils/debugLogging';

interface HeaderProps {
  userName?: string;
}

export default function Header({ userName }: HeaderProps) {
  const { login, clear, loginStatus, identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const { data: isAdmin, isLoading: isAdminLoading } = useIsCallerAdmin();

  const isAuthenticated = !!identity;
  const disabled = loginStatus === 'logging-in';

  const handleAuth = async () => {
    try {
      logDebug('Header', `Auth button clicked: ${isAuthenticated ? 'logout' : 'login'}`);
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
    } catch (error) {
      console.error('Authentication error:', error);
    }
  };

  return (
    <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Clock className="w-6 h-6 text-primary-foreground pointer-events-none" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">TimeTrack</h1>
              <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-950 border-green-500 text-green-700 dark:text-green-300">
                v7
              </Badge>
            </div>
            {userName && (
              <p className="text-sm text-muted-foreground">Bonjour, {userName}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isAuthenticated && !isAdminLoading && isAdmin && (
            <PublishRetryDialog />
          )}
          <Button
            type="button"
            onClick={handleAuth}
            disabled={disabled}
            variant={isAuthenticated ? 'outline' : 'default'}
            className="gap-2 touch-action-manipulation select-none"
          >
            {disabled ? (
              'Connexion...'
            ) : isAuthenticated ? (
              <>
                <LogOut className="w-4 h-4 pointer-events-none" />
                <span className="pointer-events-none">Déconnexion</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4 pointer-events-none" />
                <span className="pointer-events-none">Connexion</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
