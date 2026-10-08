import React, { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export interface AppLayoutProps {
  children?: React.ReactNode;
  activeTab: string;
  onSelectTab: (tabId: string) => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  activeTab,
  onSelectTab,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans">
      {/* Sidebar navigation (kept dark as requested) */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />

      {/* Main content frame with responsive desktop offset */}
      <div
        className={`${
          isCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        } flex flex-col min-h-screen transition-all duration-300 ease-in-out`}
      >
        <Header
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          activeTab={activeTab}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
