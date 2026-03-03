import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ExternalLink, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useRestartPublish } from "../hooks/useQueries";
import { useSafeTap } from "../hooks/useSafeTap";

export default function PublishRetryDialog() {
  const [open, setOpen] = useState(false);
  const [checklistConfirmed, setChecklistConfirmed] = useState(false);
  const restartPublish = useRestartPublish();
  const safeTap = useSafeTap();

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setChecklistConfirmed(false);
    }
  };

  const handleRestartPublish = safeTap(async () => {
    if (!checklistConfirmed) {
      return;
    }

    try {
      await restartPublish.mutateAsync();
      setOpen(false);
      setChecklistConfirmed(false);
    } catch (error) {
      console.error("Restart publish error:", error);
    }
  });

  const handleChecklistLinkClick = safeTap(() => {
    window.open("/ANDROID_REGRESSION_CHECKLIST.md", "_blank");
  });

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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Restart Publish Workflow</DialogTitle>
          <DialogDescription>
            This will trigger a publish restart. Ensure all pre-publish
            verification steps are completed.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
            <h4 className="font-semibold text-sm text-amber-900 dark:text-amber-100 mb-2">
              ⚠️ Pre-Publish Verification Required
            </h4>
            <p className="text-xs text-amber-800 dark:text-amber-200 mb-3">
              Before restarting the publish workflow, you must complete the
              Android regression checklist to verify that all icon-based
              controls work correctly on Android Chrome.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleChecklistLinkClick}
              className="w-full gap-2 touch-action-manipulation select-none"
            >
              <ExternalLink className="w-4 h-4 pointer-events-none" />
              <span className="pointer-events-none">View Checklist</span>
            </Button>
          </div>
          <div className="flex items-start space-x-3 p-3 bg-muted rounded-lg">
            <Checkbox
              id="checklist-confirm"
              checked={checklistConfirmed}
              onCheckedChange={(checked) =>
                setChecklistConfirmed(checked === true)
              }
              className="mt-1"
            />
            <Label
              htmlFor="checklist-confirm"
              className="text-sm font-normal cursor-pointer leading-relaxed"
            >
              I confirm that I have completed the Android regression checklist
              and verified that all icon-based controls work correctly on
              Android Chrome without DOMException errors.
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="touch-action-manipulation"
          >
            Cancel
          </Button>
          <Button
            onClick={handleRestartPublish}
            disabled={!checklistConfirmed || restartPublish.isPending}
            className="touch-action-manipulation"
          >
            {restartPublish.isPending ? "Restarting..." : "Restart Publish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
