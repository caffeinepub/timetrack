import { useState } from 'react';
import { useRestartPublish } from '../hooks/useQueries';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { logDebug } from '../utils/debugLogging';

export default function PublishRetryDialog() {
  const [open, setOpen] = useState(false);
  const restartPublish = useRestartPublish();

  const handleRestartPublish = async () => {
    try {
      logDebug('PublishRetryDialog', 'Restart publish button clicked');
      await restartPublish.mutateAsync();
    } catch (error: any) {
      // Error is handled by mutation state
      console.error('Restart publish error:', error);
    }
  };

  const handleClose = () => {
    setOpen(false);
    // Reset mutation state when closing
    restartPublish.reset();
  };

  const handleOpenChange = (newOpen: boolean) => {
    logDebug('PublishRetryDialog', `Dialog ${newOpen ? 'opened' : 'closed'}`);
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2 touch-action-manipulation select-none"
        >
          <RefreshCw className="w-4 h-4 pointer-events-none" />
          <span className="pointer-events-none">Restart Publish</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Restart Publish Workflow</DialogTitle>
          <DialogDescription>
            Trigger a restart of the publish/deployment process. This is useful if a previous deployment failed.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {restartPublish.isPending && (
            <Alert>
              <RefreshCw className="h-4 w-4 animate-spin pointer-events-none" />
              <AlertTitle>Processing</AlertTitle>
              <AlertDescription>
                Restarting publish workflow...
              </AlertDescription>
            </Alert>
          )}

          {restartPublish.isSuccess && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 pointer-events-none" />
              <AlertTitle className="text-green-800 dark:text-green-200">Success</AlertTitle>
              <AlertDescription className="text-green-700 dark:text-green-300">
                Publish workflow restarted successfully.
              </AlertDescription>
            </Alert>
          )}

          {restartPublish.isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4 pointer-events-none" />
              <AlertTitle>Restart Publish Failed</AlertTitle>
              <AlertDescription className="space-y-2">
                <p className="font-semibold">Action: Restart Publish</p>
                <p className="text-sm">
                  <strong>Error:</strong>{' '}
                  {restartPublish.error instanceof Error
                    ? restartPublish.error.message
                    : 'An unknown error occurred'}
                </p>
                <p className="text-xs mt-2 opacity-90">
                  If the issue persists, please check the deployment logs or contact support with the error message above.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {!restartPublish.isPending && !restartPublish.isSuccess && !restartPublish.isError && (
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                This will attempt to restart the publish/deployment process. The canister is already running the latest version.
              </p>
              <p>
                <strong>Note:</strong> If a publish failure occurred, redeploying should automatically resolve it.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={restartPublish.isPending}
            className="touch-action-manipulation"
          >
            Close
          </Button>
          {!restartPublish.isSuccess && (
            <Button
              onClick={handleRestartPublish}
              disabled={restartPublish.isPending}
              className="gap-2 touch-action-manipulation"
            >
              {restartPublish.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin pointer-events-none" />
                  <span className="pointer-events-none">Restarting...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 pointer-events-none" />
                  <span className="pointer-events-none">Restart Publish</span>
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
