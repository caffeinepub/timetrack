import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

interface WelcomeDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function WelcomeDialog({ open, onClose }: WelcomeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-sm mx-auto rounded-2xl">
        <DialogHeader className="items-center text-center gap-3">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-1">
            <CheckCircle className="w-7 h-7 text-primary" />
          </div>
          <DialogTitle className="text-xl font-bold">Welcome to TimeTracker</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground text-center leading-relaxed">
            Track your work days, on-call periods, and interventions with ease.
            Log your hours, add journal notes, and export reports — all in one place.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-2">
          <Button
            className="w-full"
            onClick={onClose}
          >
            Get Started
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
