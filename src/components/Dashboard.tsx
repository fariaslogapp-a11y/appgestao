import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Truck, Wrench, TrendingUp, X, Filter } from 'lucide-react';
import type { Vehicle } from '../types';

interface Stats {
  totalVehicles: number;
  activeVehicles: number;
  maintenanceVehicles: number;
  completedTrips: number;
  completedTripsFiltered: number;
  totalMaintenances: number;
  totalMaintenancesFiltered: number;
}

interface VehicleTypeStats {
  type: string;
  displayName: string;
  total: number;
  available: number;
  maintenance: number;
  inactive: number;
  vehicles: Vehicle[];
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalVehicles: 0,
    activeVehicles: 0,
    maintenanceVehicles: 0,
    completedTrips: 0,
    completedTripsFiltered: 0,
    totalMaintenances: 0,
    totalMaintenancesFiltered: 0,
  });
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleTypeStats, setVehicleTypeStats] = useState<VehicleTypeStats[]>([]);
  const [selectedType, setSelectedType] = useState<VehicleTypeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTripFilters, setShowTripFilters] = useState(false);
  const [showMaintenanceFilters, setShowMaintenanceFilters] = useState(false);
  const [tripStartDate, setTripStartDate] = useState('');
  const [tripEndDate, setTripEndDate] = useState('');
  const [maintenanceStartDate, setMaintenanceStartDate] = useState('');
  const [maintenanceEndDate, setMaintenanceEndDate] = useState('');

  useEffect(() => {
    loadStats();
  }, [tripStartDate, tripEndDate, maintenanceStartDate, maintenanceEndDate]);

  const loadStats = async () => {
    try {
      const [vehiclesSnap, tripsSnap, maintenancesSnap] = await Promise.all([
        getDocs(collection(db, 'vehicles')),
        getDocs(collection(db, 'trips')),
        getDocs(collection(db, 'maintenances')),
      ]);

      const vehiclesData = vehiclesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
      const allTrips = tripsSnap.docs.map(doc => doc.data());
      const allMaintenances = maintenancesSnap.docs.map(doc => doc.data());

      setVehicles(vehiclesData);

      const countableVehicles = vehiclesData.filter(v => {
        if (v.type === 'carreta' && v.coupled_vehicle_id) {
          return false;
        }
        return true;
      });

      const activeCountableVehicles = countableVehicles.filter(v => v.status === 'active');
      const maintenanceCountableVehicles = countableVehicles.filter(v => v.status === 'maintenance');

      const filteredTrips = allTrips.filter((t: any) => {
        if (tripStartDate) {
          const tripDate = new Date(t.departure_date);
          const filterStart = new Date(tripStartDate);
          if (tripDate < filterStart) return false;
        }
        if (tripEndDate) {
          const tripDate = new Date(t.departure_date);
          const filterEnd = new Date(tripEndDate);
          filterEnd.setHours(23, 59, 59);
          if (tripDate > filterEnd) return false;
        }
        return true;
      });

      const filteredMaintenances = allMaintenances.filter((m: any) => {
        if (maintenanceStartDate) {
          const maintenanceDate = new Date(m.maintenance_date);
          const filterStart = new Date(maintenanceStartDate);
          if (maintenanceDate < filterStart) return false;
        }
        if (maintenanceEndDate) {
          const maintenanceDate = new Date(m.maintenance_date);
          const filterEnd = new Date(maintenanceEndDate);
          filterEnd.setHours(23, 59, 59);
          if (maintenanceDate > filterEnd) return false;
        }
        return true;
      });

      setStats({
        totalVehicles: countableVehicles.length,
        activeVehicles: activeCountableVehicles.length,
        maintenanceVehicles: maintenanceCountableVehicles.length,
        completedTrips: allTrips.length,
        completedTripsFiltered: filteredTrips.length,
        totalMaintenances: allMaintenances.length,
        totalMaintenancesFiltered: filteredMaintenances.length,
      });

      calculateVehicleTypeStats(vehiclesData);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateVehicleTypeStats = (vehiclesData: Vehicle[]) => {
    const typeMap: Record<string, { vehicles: Vehicle[]; displayName: string }> = {};

    vehiclesData.forEach(vehicle => {
      let typeKey = vehicle.type;
      let displayName = vehicle.type.toUpperCase();

      if (vehicle.type === 'cavalo' && vehicle.coupled_vehicle_id) {
        typeKey = 'cavalo-carreta';
        displayName = 'CAVALO/CARRETA';
      } else if (vehicle.type === 'carreta' && vehicle.coupled_vehicle_id) {
        return;
      } else if (vehicle.type === 'carreta' && !vehicle.coupled_vehicle_id) {
        typeKey = 'carreta';
        displayName = 'CARRETA';
      } else if (vehicle.type === 'cavalo' && !vehicle.coupled_vehicle_id) {
        typeKey = 'cavalo';
        displayName = 'CAVALO';
      }

      if (!typeMap[typeKey]) {
        typeMap[typeKey] = { vehicles: [], displayName };
      }

      typeMap[typeKey].vehicles.push(vehicle);
    });

    const stats: VehicleTypeStats[] = Object.entries(typeMap).map(([type, data]) => ({
      type,
      displayName: data.displayName,
      total: data.vehicles.length,
      available: data.vehicles.filter(v => v.status === 'active').length,
      maintenance: data.vehicles.filter(v => v.status === 'maintenance').length,
      inactive: data.vehicles.filter(v => v.status === 'inactive').length,
      vehicles: data.vehicles,
    }));

    stats.sort((a, b) => b.total - a.total);

    setVehicleTypeStats(stats);
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
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'carro':
        return 'bg-blue-500';
      case '3/4':
        return 'bg-green-500';
      case 'toco':
        return 'bg-yellow-500';
      case 'truck':
        return 'bg-orange-500';
      case 'bitruck':
        return 'bg-red-500';
      case 'cavalo-carreta':
        return 'bg-slate-500';
      default:
        return 'bg-slate-400';
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-2">Visão geral da sua frota</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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

      <div className="mb-8">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Veículos por Tipo</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {vehicleTypeStats.map((typeStats) => (
            <button
              key={typeStats.type}
              onClick={() => setSelectedType(typeStats)}
              className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow text-left"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900">{typeStats.displayName}</h3>
                <div className={`${getTypeColor(typeStats.type)} p-2 rounded-lg`}>
                  <Truck className="h-5 w-5 text-white" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Total</span>
                  <span className="text-lg font-bold text-slate-900">{typeStats.total}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Disponíveis</span>
                  <span className="text-lg font-bold text-green-600">{typeStats.available}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Em Manutenção</span>
                  <span className="text-lg font-bold text-orange-600">{typeStats.maintenance}</span>
                </div>
                {typeStats.inactive > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Inativos</span>
                    <span className="text-lg font-bold text-slate-600">{typeStats.inactive}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200">
                <p className="text-xs text-blue-600 font-medium">Clique para ver detalhes</p>
              </div>
            </button>
          ))}
        </div>

        {vehicleTypeStats.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
            <Truck className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">Nenhum veículo cadastrado</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Resumo de Viagens</h2>
            <button
              onClick={() => setShowTripFilters(!showTripFilters)}
              className="inline-flex items-center px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm"
            >
              <Filter className="h-4 w-4 mr-1" />
              Filtrar
            </button>
          </div>

          {showTripFilters && (
            <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Data Inicial
                  </label>
                  <input
                    type="date"
                    value={tripStartDate}
                    onChange={(e) => setTripStartDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Data Final
                  </label>
                  <input
                    type="date"
                    value={tripEndDate}
                    onChange={(e) => setTripEndDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              {(tripStartDate || tripEndDate) && (
                <button
                  onClick={() => {
                    setTripStartDate('');
                    setTripEndDate('');
                  }}
                  className="mt-3 w-full px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm"
                >
                  Limpar Filtros
                </button>
              )}
            </div>
          )}

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">
                {tripStartDate || tripEndDate ? 'Viagens (Filtrado)' : 'Viagens Concluídas'}
              </span>
              <span className="text-lg font-semibold text-slate-900">
                {tripStartDate || tripEndDate ? stats.completedTripsFiltered : stats.completedTrips}
              </span>
            </div>
            {(tripStartDate || tripEndDate) && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Total (sem filtro)</span>
                <span className="text-slate-500">{stats.completedTrips}</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Manutenções</h2>
            <button
              onClick={() => setShowMaintenanceFilters(!showMaintenanceFilters)}
              className="inline-flex items-center px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm"
            >
              <Filter className="h-4 w-4 mr-1" />
              Filtrar
            </button>
          </div>

          {showMaintenanceFilters && (
            <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Data Inicial
                  </label>
                  <input
                    type="date"
                    value={maintenanceStartDate}
                    onChange={(e) => setMaintenanceStartDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Data Final
                  </label>
                  <input
                    type="date"
                    value={maintenanceEndDate}
                    onChange={(e) => setMaintenanceEndDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              {(maintenanceStartDate || maintenanceEndDate) && (
                <button
                  onClick={() => {
                    setMaintenanceStartDate('');
                    setMaintenanceEndDate('');
                  }}
                  className="mt-3 w-full px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm"
                >
                  Limpar Filtros
                </button>
              )}
            </div>
          )}

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">
                {maintenanceStartDate || maintenanceEndDate ? 'Manutenções (Filtrado)' : 'Total de Manutenções'}
              </span>
              <span className="text-lg font-semibold text-slate-900">
                {maintenanceStartDate || maintenanceEndDate ? stats.totalMaintenancesFiltered : stats.totalMaintenances}
              </span>
            </div>
            {(maintenanceStartDate || maintenanceEndDate) && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Total (sem filtro)</span>
                <span className="text-slate-500">{stats.totalMaintenances}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Veículos em Manutenção</span>
              <span className="text-lg font-semibold text-slate-900">{stats.maintenanceVehicles}</span>
            </div>
          </div>
        </div>
      </div>

      {selectedType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-slate-200 sticky top-0 bg-white">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{selectedType.displayName}</h2>
                <p className="text-slate-600 mt-1">
                  {selectedType.total} veículo{selectedType.total !== 1 ? 's' : ''} cadastrado{selectedType.total !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => setSelectedType(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {selectedType.available > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-green-700 mb-3 flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                    Disponíveis ({selectedType.available})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedType.vehicles
                      .filter(v => v.status === 'active')
                      .map(vehicle => (
                        <div
                          key={vehicle.id}
                          className="bg-green-50 border border-green-200 rounded-lg p-4"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-lg font-bold text-green-900">{vehicle.plate}</p>
                              <p className="text-sm text-green-700">
                                {vehicle.brand} {vehicle.model}
                              </p>
                              {vehicle.year && (
                                <p className="text-xs text-green-600 mt-1">Ano: {vehicle.year}</p>
                              )}
                              {vehicle.coupled_vehicle_id && (
                                <p className="text-xs text-green-600 mt-1">
                                  Acoplado: {vehicles.find(v => v.id === vehicle.coupled_vehicle_id)?.plate || 'N/A'}
                                </p>
                              )}
                            </div>
                            <Truck className="h-6 w-6 text-green-600" />
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {selectedType.maintenance > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-orange-700 mb-3 flex items-center gap-2">
                    <div className="w-3 h-3 bg-orange-600 rounded-full"></div>
                    Em Manutenção ({selectedType.maintenance})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedType.vehicles
                      .filter(v => v.status === 'maintenance')
                      .map(vehicle => (
                        <div
                          key={vehicle.id}
                          className="bg-orange-50 border border-orange-200 rounded-lg p-4"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-lg font-bold text-orange-900">{vehicle.plate}</p>
                              <p className="text-sm text-orange-700">
                                {vehicle.brand} {vehicle.model}
                              </p>
                              {vehicle.year && (
                                <p className="text-xs text-orange-600 mt-1">Ano: {vehicle.year}</p>
                              )}
                              {vehicle.coupled_vehicle_id && (
                                <p className="text-xs text-orange-600 mt-1">
                                  Acoplado: {vehicles.find(v => v.id === vehicle.coupled_vehicle_id)?.plate || 'N/A'}
                                </p>
                              )}
                            </div>
                            <Wrench className="h-6 w-6 text-orange-600" />
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {selectedType.inactive > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <div className="w-3 h-3 bg-slate-600 rounded-full"></div>
                    Inativos ({selectedType.inactive})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedType.vehicles
                      .filter(v => v.status === 'inactive')
                      .map(vehicle => (
                        <div
                          key={vehicle.id}
                          className="bg-slate-50 border border-slate-200 rounded-lg p-4"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-lg font-bold text-slate-900">{vehicle.plate}</p>
                              <p className="text-sm text-slate-700">
                                {vehicle.brand} {vehicle.model}
                              </p>
                              {vehicle.year && (
                                <p className="text-xs text-slate-600 mt-1">Ano: {vehicle.year}</p>
                              )}
                              {vehicle.coupled_vehicle_id && (
                                <p className="text-xs text-slate-600 mt-1">
                                  Acoplado: {vehicles.find(v => v.id === vehicle.coupled_vehicle_id)?.plate || 'N/A'}
                                </p>
                              )}
                            </div>
                            <Truck className="h-6 w-6 text-slate-600" />
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
