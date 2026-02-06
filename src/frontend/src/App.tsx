import { useState, useEffect } from 'react';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useGetCallerUserProfile, useSaveCallerUserProfile } from './hooks/useQueries';
import Header from './components/Header';
import Footer from './components/Footer';
import Dashboard from './pages/Dashboard';
import Calendar from './pages/Calendar';
import Journal from './pages/Journal';
import Reports from './pages/Reports';
import MobileBottomNav from './components/MobileBottomNav';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Toaster } from '@/components/ui/sonner';
import { logDebug } from './utils/debugLogging';

function AppContent() {
  const { identity, isInitializing } = useInternetIdentity();
  const { data: userProfile, isLoading: profileLoading, isFetched } = useGetCallerUserProfile();
  const saveProfile = useSaveCallerUserProfile();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', email: '' });

  const isAuthenticated = !!identity;

  useEffect(() => {
    if (isAuthenticated && !profileLoading && isFetched && userProfile === null) {
      setShowProfileSetup(true);
    }
  }, [isAuthenticated, profileLoading, isFetched, userProfile]);

  const handleSaveProfile = async () => {
    if (!profileForm.name.trim()) {
      alert('Veuillez entrer votre nom');
      return;
    }

    try {
      await saveProfile.mutateAsync({
        name: profileForm.name.trim(),
        email: profileForm.email.trim(),
      });
      setShowProfileSetup(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Erreur lors de l\'enregistrement du profil');
    }
  };

  const handleTabChange = (tab: string) => {
    try {
      logDebug('App', `Tab change requested: ${tab}`);
      setActiveTab(tab);
    } catch (error) {
      console.error('Error changing tab:', error);
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Initialisation...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
        <div className="absolute top-4 right-4">
          <Badge variant="default" className="text-sm px-3 py-1">
            Version 7 - Production
          </Badge>
        </div>
        <div className="text-center max-w-md">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Suivi du Temps
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Gérez vos heures de travail, congés et astreintes en toute simplicité
          </p>
          <Header />
          <div className="mt-8 p-6 bg-card rounded-lg shadow-lg border">
            <h2 className="text-lg font-semibold mb-3">Fonctionnalités</h2>
            <ul className="text-left space-y-2 text-sm text-muted-foreground">
              <li>📊 Tableau de bord avec statistiques détaillées</li>
              <li>📅 Calendrier interactif pour la gestion des journées</li>
              <li>📝 Journal de travail avec notes et photos</li>
              <li>📄 Génération de rapports PDF et CSV</li>
              <li>🔒 Authentification sécurisée avec Internet Identity</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background pb-safe">
      <Header userName={userProfile?.name} />
      
      <main className="flex-1 container mx-auto px-4 py-6 pb-24 md:pb-8">
        {/* Content Area */}
        <div className="mt-2">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'calendar' && <Calendar />}
          {activeTab === 'journal' && <Journal />}
          {activeTab === 'reports' && <Reports />}
        </div>
      </main>

      <Footer />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav activeTab={activeTab} onTabChange={handleTabChange} />

      <Dialog open={showProfileSetup} onOpenChange={setShowProfileSetup}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configuration du profil</DialogTitle>
            <DialogDescription>
              Veuillez compléter votre profil pour continuer
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom complet *</Label>
              <Input
                id="name"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                placeholder="Jean Dupont"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email (optionnel)</Label>
              <Input
                id="email"
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                placeholder="jean.dupont@example.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button"
              onClick={handleSaveProfile} 
              disabled={saveProfile.isPending}
              className="touch-action-manipulation"
            >
              {saveProfile.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
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
