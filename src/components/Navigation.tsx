import { useState } from 'react';
import { Menu, X, Truck, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavigationItem {
  id: string;
  name: string;
  icon: React.ElementType;
}

interface NavigationProps {
  items: NavigationItem[];
  currentPage: string;
  onPageChange: (page: string) => void;
}

export default function Navigation({ items, currentPage, onPageChange }: NavigationProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { logout } = useAuth();

  const handlePageChange = (page: string) => {
    onPageChange(page);
    setIsMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    setIsMenuOpen(false);
    window.location.reload();
  };

  return (
    <nav className="bg-white shadow-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-3 min-w-0">
            <Truck className="h-8 w-8 text-blue-600 flex-shrink-0" />
            <span className="text-xl font-bold text-slate-900 hidden md:block whitespace-nowrap">
              Sistema de Gestão de Frota
            </span>
            <span className="text-base font-bold text-slate-900 md:hidden whitespace-nowrap">
              SGF
            </span>
          </div>

          <div className="hidden md:flex md:items-center md:space-x-1 flex-shrink-0">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onPageChange(item.id)}
                  className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                    currentPage === item.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-2" />
                  {item.name}
                </button>
              );
            })}
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors text-slate-600 hover:bg-red-50 hover:text-red-700"
              title="Sair do sistema"
            >
              <LogOut className="h-5 w-5 mr-2" />
              Sair
            </button>
          </div>

          <div className="md:hidden flex items-center flex-shrink-0">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden border-t border-slate-200">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handlePageChange(item.id)}
                    className={`w-full text-left flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors ${
                      currentPage === item.id
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {item.name}
                  </button>
                );
              })}
              <button
                onClick={handleLogout}
                className="w-full text-left flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors text-slate-600 hover:bg-red-50 hover:text-red-700"
              >
                <LogOut className="h-5 w-5 mr-3" />
                Sair
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
