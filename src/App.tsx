import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import Vehicles from './components/Vehicles';
import Drivers from './components/Drivers';
import Maintenance from './components/Maintenance';
import Trips from './components/Trips';
import TireInspectionSheet from './components/TireInspectionSheet';
import TireInspectionFormPage from './components/TireInspectionFormPage';
import TireInspectionReports from './components/TireInspectionReports';
import CommissionRanking from './components/CommissionRanking';
import LoginPage from './components/LoginPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Truck, Users, Wrench, Route as RouteIcon, LayoutDashboard, FileText, TrendingUp, BarChart3 } from 'lucide-react';

type Page = 'dashboard' | 'vehicles' | 'drivers' | 'maintenance' | 'trips' | 'tire-inspection' | 'tire-inspection-reports' | 'commission-ranking';

function AppContent() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const isFormPage = location.pathname.startsWith('/tire-inspection/');

  if (isFormPage) {
    return <TireInspectionFormPage />;
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'vehicles', name: 'Veículos', icon: Truck },
    { id: 'drivers', name: 'Motoristas', icon: Users },
    { id: 'maintenance', name: 'Manutenção', icon: Wrench },
    { id: 'trips', name: 'Viagens', icon: RouteIcon },
    { id: 'commission-ranking', name: 'Comissões', icon: TrendingUp },
    { id: 'tire-inspection', name: 'Ficha de Pneus', icon: FileText },
    { id: 'tire-inspection-reports', name: 'Relatórios', icon: BarChart3 },
  ];

  const pathMap: Record<string, Page> = {
    '/': 'dashboard',
    '/vehicles': 'vehicles',
    '/drivers': 'drivers',
    '/maintenance': 'maintenance',
    '/trips': 'trips',
    '/commission-ranking': 'commission-ranking',
    '/tire-inspection': 'tire-inspection',
    '/tire-inspection-reports': 'tire-inspection-reports',
  };

  const currentPage = (pathMap[location.pathname] || 'dashboard') as Page;

  const handlePageChange = (page: string) => {
    const pageMap: Record<string, string> = {
      'dashboard': '/',
      'vehicles': '/vehicles',
      'drivers': '/drivers',
      'maintenance': '/maintenance',
      'trips': '/trips',
      'commission-ranking': '/commission-ranking',
      'tire-inspection': '/tire-inspection',
      'tire-inspection-reports': '/tire-inspection-reports',
    };
    window.location.pathname = pageMap[page] || '/';
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'vehicles':
        return <Vehicles />;
      case 'drivers':
        return <Drivers />;
      case 'maintenance':
        return <Maintenance />;
      case 'trips':
        return <Trips />;
      case 'commission-ranking':
        return <CommissionRanking />;
      case 'tire-inspection':
        return <TireInspectionSheet />;
      case 'tire-inspection-reports':
        return <TireInspectionReports />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation
        items={navigation}
        currentPage={currentPage}
        onPageChange={handlePageChange}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderPage()}
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/*" element={<AppContent />} />
          <Route path="/tire-inspection/:token" element={<TireInspectionFormPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
