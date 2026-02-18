import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, query, where, orderBy as firestoreOrderBy } from 'firebase/firestore';
import { TrendingUp, Calendar, Download, ArrowUpDown, Filter, X } from 'lucide-react';
import { formatDateLocal } from '../utils/dateUtils';
import { exportToExcel } from '../utils/excelExport';

import type { Trip, Driver, Vehicle } from '../types';

interface TripWithDetails extends Trip {
  driverName: string;
  vehiclePlate: string;
}

type SortField = 'departure_date' | 'driverName' | 'origin' | 'destination' | 'vehiclePlate' | 'freight_value' | 'driver_commission';
type SortOrder = 'asc' | 'desc';

export default function CommissionRanking() {
  const [trips, setTrips] = useState<TripWithDetails[]>([]);
  const [filteredTrips, setFilteredTrips] = useState<TripWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [sortField, setSortField] = useState<SortField>('departure_date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const [filters, setFilters] = useState({
    driver: '',
    origin: '',
    destination: '',
    vehicle: '',
  });

  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadCommissionData();
  }, [currentMonth]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [trips, filters, sortField, sortOrder]);

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

  const applyFiltersAndSort = () => {
    let filtered = [...trips];

    if (filters.driver) {
      filtered = filtered.filter(trip =>
        trip.driverName.toLowerCase().includes(filters.driver.toLowerCase())
      );
    }

    if (filters.origin) {
      filtered = filtered.filter(trip =>
        trip.origin.toLowerCase().includes(filters.origin.toLowerCase())
      );
    }

    if (filters.destination) {
      filtered = filtered.filter(trip =>
        trip.destination.toLowerCase().includes(filters.destination.toLowerCase())
      );
    }

    if (filters.vehicle) {
      filtered = filtered.filter(trip =>
        trip.vehiclePlate.toLowerCase().includes(filters.vehicle.toLowerCase())
      );
    }

    filtered.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === 'departure_date') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    setFilteredTrips(filtered);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const clearFilters = () => {
    setFilters({
      driver: '',
      origin: '',
      destination: '',
      vehicle: '',
    });
  };

  const handleExportExcel = () => {
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
    exportToExcel(exportData, `comissoes-${monthName}.csv`);
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
  const monthDisplay = monthFormatter.format(currentMonth).toUpperCase();

  const totalCommission = filteredTrips.reduce((sum, trip) => sum + (trip.driver_commission || 0), 0);

  const hasActiveFilters = filters.driver || filters.origin || filters.destination || filters.vehicle;

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
          <p className="text-slate-600 mt-2">Detalhamento de viagens e comissões</p>
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

      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center px-4 py-2 rounded-lg transition-colors ${
              showFilters || hasActiveFilters
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Filter className="h-5 w-5 mr-2" />
            Filtros
            {hasActiveFilters && <span className="ml-2 bg-white text-blue-600 rounded-full px-2 py-0.5 text-xs font-bold">●</span>}
          </button>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center px-3 py-2 text-sm text-slate-600 hover:text-slate-900"
            >
              <X className="h-4 w-4 mr-1" />
              Limpar filtros
            </button>
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

      {showFilters && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Motorista
              </label>
              <input
                type="text"
                value={filters.driver}
                onChange={(e) => setFilters({ ...filters, driver: e.target.value })}
                placeholder="Filtrar por motorista"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Origem
              </label>
              <input
                type="text"
                value={filters.origin}
                onChange={(e) => setFilters({ ...filters, origin: e.target.value })}
                placeholder="Filtrar por origem"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Destino
              </label>
              <input
                type="text"
                value={filters.destination}
                onChange={(e) => setFilters({ ...filters, destination: e.target.value })}
                placeholder="Filtrar por destino"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Placa
              </label>
              <input
                type="text"
                value={filters.vehicle}
                onChange={(e) => setFilters({ ...filters, vehicle: e.target.value })}
                placeholder="Filtrar por placa"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-md p-6 mb-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-blue-100 text-sm">Total de Comissões - {monthDisplay}</p>
            <p className="text-4xl font-bold mt-1">R$ {totalCommission.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-blue-100 text-sm">Viagens Comissionadas</p>
            <p className="text-4xl font-bold mt-1">{filteredTrips.length}</p>
          </div>
        </div>
      </div>

      {filteredTrips.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
          <TrendingUp className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">
            {hasActiveFilters ? 'Nenhuma viagem encontrada com os filtros aplicados' : 'Nenhuma comissão registrada para este mês'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th
                    onClick={() => handleSort('departure_date')}
                    className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Data</span>
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('driverName')}
                    className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Motorista</span>
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('origin')}
                    className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Origem</span>
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('destination')}
                    className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Destino</span>
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('vehiclePlate')}
                    className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Placa</span>
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('freight_value')}
                    className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Valor</span>
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('driver_commission')}
                    className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Comissão</span>
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
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
  );
}
