import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Truck, Calendar, Wrench, TrendingUp } from 'lucide-react';

interface Stats {
  totalVehicles: number;
  activeVehicles: number;
  maintenanceVehicles: number;
  upcomingTrips: number;
  completedTrips: number;
  totalMaintenances: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalVehicles: 0,
    activeVehicles: 0,
    maintenanceVehicles: 0,
    upcomingTrips: 0,
    completedTrips: 0,
    totalMaintenances: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [vehiclesSnap, tripsSnap, maintenancesSnap] = await Promise.all([
        getDocs(collection(db, 'vehicles')),
        getDocs(collection(db, 'trips')),
        getDocs(collection(db, 'maintenances')),
      ]);

      const vehicles = vehiclesSnap.docs.map(doc => doc.data());
      const trips = tripsSnap.docs.map(doc => doc.data());
      const maintenances = maintenancesSnap.docs;

      setStats({
        totalVehicles: vehicles.length,
        activeVehicles: vehicles.filter((v: any) => v.status === 'active').length,
        maintenanceVehicles: vehicles.filter((v: any) => v.status === 'maintenance').length,
        upcomingTrips: trips.filter((t: any) => t.status === 'planned' || t.status === 'in_progress').length,
        completedTrips: trips.filter((t: any) => t.status === 'completed').length,
        totalMaintenances: maintenances.length,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total de Veículos',
      value: stats.totalVehicles,
      icon: Truck,
      color: 'bg-blue-500',
    },
    {
      title: 'Veículos Ativos',
      value: stats.activeVehicles,
      icon: TrendingUp,
      color: 'bg-green-500',
    },
    {
      title: 'Em Manutenção',
      value: stats.maintenanceVehicles,
      icon: Wrench,
      color: 'bg-orange-500',
    },
    {
      title: 'Viagens Futuras',
      value: stats.upcomingTrips,
      icon: Calendar,
      color: 'bg-cyan-500',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-2">Visão geral da sua frota</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="bg-white rounded-lg shadow-sm border border-slate-200 p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">{stat.title}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Resumo de Viagens</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Viagens Concluídas</span>
              <span className="text-lg font-semibold text-slate-900">{stats.completedTrips}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Viagens Planejadas</span>
              <span className="text-lg font-semibold text-slate-900">{stats.upcomingTrips}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Manutenções</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Total de Manutenções</span>
              <span className="text-lg font-semibold text-slate-900">{stats.totalMaintenances}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Veículos em Manutenção</span>
              <span className="text-lg font-semibold text-slate-900">{stats.maintenanceVehicles}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
