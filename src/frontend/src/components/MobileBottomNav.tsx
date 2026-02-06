interface MobileBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function MobileBottomNav({ activeTab, onTabChange }: MobileBottomNavProps) {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: '/assets/generated/chart-icon-transparent.dim_64x64.png',
      ariaLabel: 'Tableau de bord',
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: '/assets/generated/calendar-icon-transparent.dim_64x64.png',
      ariaLabel: 'Calendrier',
    },
    {
      id: 'journal',
      label: 'Journal',
      icon: '/assets/generated/microphone-icon-transparent.dim_64x64.png',
      ariaLabel: 'Journal',
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: '/assets/generated/pdf-icon-transparent.dim_64x64.png',
      ariaLabel: 'Rapports',
    },
  ];

  const handleTabClick = (tabId: string) => {
    try {
      onTabChange(tabId);
    } catch (error) {
      console.error('Error changing tab:', error);
    }
  };

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-lg md:hidden safe-area-bottom"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around h-20 px-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleTabClick(item.id)}
            className={`
              flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl
              transition-all duration-200 min-w-[72px] min-h-[56px]
              ${
                activeTab === item.id
                  ? 'bg-primary text-primary-foreground shadow-md scale-105'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground active:scale-95'
              }
            `}
            aria-label={item.ariaLabel}
            aria-current={activeTab === item.id ? 'page' : undefined}
          >
            <img 
              src={item.icon} 
              alt="" 
              className="w-7 h-7"
              aria-hidden="true"
            />
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
