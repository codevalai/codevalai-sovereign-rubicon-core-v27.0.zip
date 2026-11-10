import React from 'react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenDispatch: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenDispatch,
}) => {
  const navItems = [
    { id: 'swarm', label: 'Parliament Swarm' },
    { id: 'crypto', label: 'Quantum Lattice' },
    { id: 'gitvm', label: 'GitVM Hypergrid' },
    { id: 'clonefactory', label: 'Clone Factory & REA' },
    { id: 'hdc100', label: 'HDC 1.58b & 100 Workflows' },
  ];

  return (
    <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B0E17] sticky top-0 z-40 transition-colors">
      {/* Zone 1: Single text element wordmark */}
      <a
        href="#swarm"
        onClick={(e) => {
          e.preventDefault();
          setActiveTab('swarm');
        }}
        className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0"
      >
        Sovereign Lattice
      </a>

      {/* Zone 2: 5 clean single-line text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
                isActive
                  ? 'border-cyan-600 dark:border-cyan-400 text-slate-900 dark:text-white font-semibold'
                  : 'border-transparent hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenDispatch}
          className="px-4 py-2 text-xs font-semibold text-white dark:text-slate-950 bg-cyan-600 dark:bg-cyan-400 hover:bg-cyan-500 dark:hover:bg-cyan-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Dispatch Task
        </button>
      </div>
    </header>
  );
};
