import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, query, where, orderBy as firestoreOrderBy } from 'firebase/firestore';
import { TrendingUp, Calendar, Download, Filter, X, ChevronRight, Users } from 'lucide-react';
import { formatDateLocal } from '../utils/dateUtils';
import { exportToExcel } from '../utils/excelExport';

import type { Trip, Driver, Vehicle } from '../types';

interface TripWithDetails extends Trip {
  driverName: string;
  vehiclePlate: string;
}

interface DriverSummary {
  driverId: string;
  driverName: string;
  totalCommission: number;
  tripCount: number;
  totalFreight: number;
}

export default function CommissionRanking() {
  const [trips, setTrips] = useState<TripWithDetails[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [selectedDriver, setSelectedDriver] = useState<string>('');
  const [selectedOrigin, setSelectedOrigin] = useState<string>('');
  const [selectedDestination, setSelectedDestination] = useState<string>('');
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');

  const [view, setView] = useState<'summary' | 'details'>('summary');

  useEffect(() => {
    loadCommissionData();
  }, [currentMonth]);

  const loadCommissionData = async () => {
    try {
      setLoading(true);

      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();

      const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
      const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];

      const [tripsSnap, driversSnap, vehiclesSnap] = await Promise.all([
        getDocs(query(collection(db, 'trips'), where('status', '==', 'completed'))),
        getDocs(query(collection(db, 'drivers'), firestoreOrderBy('name'))),
        getDocs(query(collection(db, 'vehicles'), firestoreOrderBy('plate'))),
      ]);

      const tripsData = tripsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trip)).filter(trip => {
        const depDate = trip.departure_date;
        return depDate >= firstDay && depDate <= lastDay;
      });
      const driversData = driversSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Driver));
      const vehiclesData = vehiclesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));

      setDrivers(driversData);
      setVehicles(vehiclesData);

      const tripsWithDetails: TripWithDetails[] = tripsData
        .filter(trip => trip.driver_commission && trip.driver_commission > 0)
        .map((trip) => ({
          ...trip,
          driverName: driversData.find(d => d.id === trip.driver_id)?.name || 'N/A',
          vehiclePlate: vehiclesData.find(v => v.id === trip.vehicle_id)?.plate || 'N/A',
        }));

      setTrips(tripsWithDetails);
    } catch (error) {
      console.error('Error loading commission data:', error);
      alert('Erro ao carregar dados de comissão.');
    } finally {
      setLoading(false);
    }
  };

  const getDriverSummaries = (): DriverSummary[] => {
    const summaryMap = new Map<string, DriverSummary>();

    trips.forEach(trip => {
      const existing = summaryMap.get(trip.driver_id || '');
      if (existing) {
        existing.totalCommission += trip.driver_commission || 0;
        existing.tripCount += 1;
        existing.totalFreight += trip.freight_value || 0;
      } else {
        summaryMap.set(trip.driver_id || '', {
          driverId: trip.driver_id || '',
          driverName: trip.driverName,
          totalCommission: trip.driver_commission || 0,
          tripCount: 1,
          totalFreight: trip.freight_value || 0,
        });
      }
    });

    return Array.from(summaryMap.values()).sort((a, b) => b.totalCommission - a.totalCommission);
  };

  const getFilteredTrips = (): TripWithDetails[] => {
    let filtered = [...trips];

    if (selectedDriver) {
      filtered = filtered.filter(trip => trip.driver_id === selectedDriver);
    }

    if (selectedOrigin) {
      filtered = filtered.filter(trip => trip.origin === selectedOrigin);
    }

    if (selectedDestination) {
      filtered = filtered.filter(trip => trip.destination === selectedDestination);
    }

    if (selectedVehicle) {
      filtered = filtered.filter(trip => trip.vehicle_id === selectedVehicle);
    }

    return filtered.sort((a, b) => new Date(b.departure_date).getTime() - new Date(a.departure_date).getTime());
  };

  const getUniqueOrigins = (): string[] => {
    const origins = new Set<string>();
    trips.forEach(trip => {
      if (trip.origin) origins.add(trip.origin);
    });
    return Array.from(origins).sort();
  };

  const getUniqueDestinations = (): string[] => {
    const destinations = new Set<string>();
    trips.forEach(trip => {
      if (trip.destination) destinations.add(trip.destination);
    });
    return Array.from(destinations).sort();
  };

  const getUniqueVehicles = (): string[] => {
    const vehicleIds = new Set<string>();
    trips.forEach(trip => {
      if (trip.vehicle_id) vehicleIds.add(trip.vehicle_id);
    });
    return Array.from(vehicleIds);
  };

  const handleClearFilters = () => {
    setSelectedDriver('');
    setSelectedOrigin('');
    setSelectedDestination('');
    setSelectedVehicle('');
    setView('summary');
  };

  const hasActiveFilters = selectedDriver || selectedOrigin || selectedDestination || selectedVehicle;

  const handleExportExcel = () => {
    if (view === 'summary') {
      const summaries = getDriverSummaries();
      const exportData = summaries.map(summary => ({
        'Motorista': summary.driverName,
        'Quantidade de Viagens': summary.tripCount,
        'Valor Total de Fretes': `R$ ${summary.totalFreight.toFixed(2)}`,
        'Total de Comissão': `R$ ${summary.totalCommission.toFixed(2)}`,
      }));

      const monthName = currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      exportToExcel(exportData, `comissoes-resumo-${monthName}.csv`);
    } else {
      const filteredTrips = getFilteredTrips();
      const exportData = filteredTrips.map(trip => ({
        'Data da Viagem': formatDateLocal(trip.departure_date),
        'Motorista': trip.driverName,
        'Origem': trip.origin,
        'Destino': trip.destination,
        'Placa': trip.vehiclePlate,
        'Valor': `R$ ${Number(trip.freight_value).toFixed(2)}`,
        'Comissão': `R$ ${Number(trip.driver_commission).toFixed(2)}`,
      }));

      const monthName = currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      exportToExcel(exportData, `comissoes-detalhes-${monthName}.csv`);
    }
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    handleClearFilters();
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
    handleClearFilters();
  };

  const handleViewDetails = (driverId: string) => {
    setSelectedDriver(driverId);
    setView('details');
  };

  const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
  const monthDisplay = monthFormatter.format(currentMonth).toUpperCase();

  const driverSummaries = getDriverSummaries();
  const filteredTrips = getFilteredTrips();
  const totalCommission = filteredTrips.reduce((sum, trip) => sum + (trip.driver_commission || 0), 0);

  useEffect(() => {
    if (hasActiveFilters) {
      setView('details');
    }
  }, [selectedDriver, selectedOrigin, selectedDestination, selectedVehicle]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Comissões</h1>
          <p className="text-slate-600 mt-2">Resumo e detalhamento de comissões</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handlePrevMonth}
            className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Anterior
          </button>
          <div className="flex items-center space-x-2 px-4 py-2 bg-blue-50 rounded-lg">
            <Calendar className="h-5 w-5 text-blue-600" />
            <span className="font-semibold text-slate-900">{monthDisplay}</span>
          </div>
          <button
            onClick={handleNextMonth}
            className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Próximo
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-900">Filtros</h2>
            {hasActiveFilters && (
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                Ativos
              </span>
            )}
          </div>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="inline-flex items-center px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="h-4 w-4 mr-1" />
              Limpar filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Motorista
            </label>
            <select
              value={selectedDriver}
              onChange={(e) => setSelectedDriver(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos os motoristas</option>
              {drivers
                .filter(driver => trips.some(trip => trip.driver_id === driver.id))
                .map(driver => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Origem
            </label>
            <select
              value={selectedOrigin}
              onChange={(e) => setSelectedOrigin(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todas as origens</option>
              {getUniqueOrigins().map(origin => (
                <option key={origin} value={origin}>
                  {origin}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Destino
            </label>
            <select
              value={selectedDestination}
              onChange={(e) => setSelectedDestination(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos os destinos</option>
              {getUniqueDestinations().map(destination => (
                <option key={destination} value={destination}>
                  {destination}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Veículo
            </label>
            <select
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos os veículos</option>
              {getUniqueVehicles().map(vehicleId => {
                const vehicle = vehicles.find(v => v.id === vehicleId);
                return vehicle ? (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.plate}
                  </option>
                ) : null;
              })}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-md p-6 mb-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-blue-100 text-sm">
              {view === 'summary' ? `Total de Comissões - ${monthDisplay}` : 'Total Filtrado'}
            </p>
            <p className="text-4xl font-bold mt-1">R$ {totalCommission.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-blue-100 text-sm">
              {view === 'summary' ? 'Motoristas Ativos' : 'Viagens'}
            </p>
            <p className="text-4xl font-bold mt-1">
              {view === 'summary' ? driverSummaries.length : filteredTrips.length}
            </p>
          </div>
        </div>
      </div>

      {view === 'summary' ? (
        driverSummaries.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
            <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600">Nenhuma comissão registrada para este mês</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Resumo por Motorista</h3>
              <button
                onClick={handleExportExcel}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="h-5 w-5 mr-2" />
                Exportar Excel
              </button>
            </div>
            {driverSummaries.map((summary, index) => (
              <div
                key={summary.driverId}
                className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-600 rounded-full font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-slate-900">{summary.driverName}</h4>
                        <p className="text-sm text-slate-600">{summary.tripCount} viagens no mês</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-sm text-slate-600 mb-1">Valor Total de Fretes</p>
                        <p className="text-lg font-semibold text-slate-900">
                          R$ {summary.totalFreight.toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3">
                        <p className="text-sm text-green-700 mb-1">Total de Comissão</p>
                        <p className="text-2xl font-bold text-green-600">
                          R$ {summary.totalCommission.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleViewDetails(summary.driverId)}
                    className="ml-6 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Ver Detalhes
                    <ChevronRight className="h-5 w-5 ml-1" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setView('summary');
                  handleClearFilters();
                }}
                className="inline-flex items-center px-4 py-2 bg-slate-200 text-slate-900 rounded-lg hover:bg-slate-300 transition-colors"
              >
                Voltar ao Resumo
              </button>
              {selectedDriver && (
                <div className="text-sm text-slate-600">
                  Mostrando viagens de: <span className="font-semibold text-slate-900">
                    {drivers.find(d => d.id === selectedDriver)?.name}
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={handleExportExcel}
              disabled={filteredTrips.length === 0}
              className={`inline-flex items-center px-4 py-2 rounded-lg transition-colors ${
                filteredTrips.length > 0
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Download className="h-5 w-5 mr-2" />
              Exportar Excel
            </button>
          </div>

          {filteredTrips.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
              <TrendingUp className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">Nenhuma viagem encontrada com os filtros aplicados</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                        Data
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                        Motorista
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                        Origem
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                        Destino
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                        Placa
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                        Valor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                        Comissão
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {filteredTrips.map((trip) => (
                      <tr key={trip.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          {formatDateLocal(trip.departure_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                          {trip.driverName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                          {trip.origin}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                          {trip.destination}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                          {trip.vehiclePlate}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          R$ {Number(trip.freight_value).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                          R$ {Number(trip.driver_commission).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
