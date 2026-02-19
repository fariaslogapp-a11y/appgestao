import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, query, where, orderBy as firestoreOrderBy } from 'firebase/firestore';
import { TrendingUp, Calendar, Download, Filter, X, ChevronRight, Users, Plus, Edit2, Trash2, DollarSign } from 'lucide-react';
import { formatDateLocal } from '../utils/dateUtils';
import { exportToExcel } from '../utils/excelExport';

import type { Trip, Driver, Vehicle, CommissionRule, ManualCommission } from '../types';

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
  manualCommissions: number;
}

type Tab = 'summary' | 'rules' | 'manual';

export default function CommissionRanking() {
  const [trips, setTrips] = useState<TripWithDetails[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [commissionRules, setCommissionRules] = useState<CommissionRule[]>([]);
  const [manualCommissions, setManualCommissions] = useState<ManualCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeTab, setActiveTab] = useState<Tab>('summary');

  const [selectedDriver, setSelectedDriver] = useState<string>('');
  const [selectedOrigin, setSelectedOrigin] = useState<string>('');
  const [selectedDestination, setSelectedDestination] = useState<string>('');
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');

  const [view, setView] = useState<'summary' | 'details'>('summary');

  const [showRuleModal, setShowRuleModal] = useState(false);
  const [ruleForm, setRuleForm] = useState({ origin: '', destination: '', commission_value: 0 });

  const [showManualModal, setShowManualModal] = useState(false);
  const [manualForm, setManualForm] = useState({
    driver_id: '',
    driver_name: '',
    description: '',
    origin: '',
    commission_value: 0,
    notes: '',
    date: new Date().toISOString().split('T')[0],
  });

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

      const [tripsSnap, driversSnap, vehiclesSnap, rulesSnap, manualSnap] = await Promise.all([
        getDocs(query(collection(db, 'trips'), where('status', '==', 'completed'))),
        getDocs(query(collection(db, 'drivers'), firestoreOrderBy('name'))),
        getDocs(query(collection(db, 'vehicles'), firestoreOrderBy('plate'))),
        getDocs(query(collection(db, 'commission_rules'), firestoreOrderBy('created_at', 'desc'))),
        getDocs(query(collection(db, 'manual_commissions'), firestoreOrderBy('created_at', 'desc'))),
      ]);

      const tripsData = tripsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trip)).filter(trip => {
        const depDate = trip.departure_date;
        return depDate >= firstDay && depDate <= lastDay;
      });
      const driversData = driversSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Driver));
      const vehiclesData = vehiclesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
      const rulesData = rulesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommissionRule));
      const manualData = manualSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ManualCommission)).filter(m => {
        const mDate = m.date;
        return mDate >= firstDay && mDate <= lastDay;
      });

      setDrivers(driversData);
      setVehicles(vehiclesData);
      setCommissionRules(rulesData);
      setManualCommissions(manualData);

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
          manualCommissions: 0,
        });
      }
    });

    manualCommissions.forEach(manual => {
      const existing = summaryMap.get(manual.driver_id);
      const driver = drivers.find(d => d.id === manual.driver_id);
      const driverName = driver?.name || manual.driver_id || '';

      if (existing) {
        existing.totalCommission += manual.commission_value;
        existing.manualCommissions += manual.commission_value;
      } else {
        summaryMap.set(manual.driver_id, {
          driverId: manual.driver_id,
          driverName: driverName,
          totalCommission: manual.commission_value,
          tripCount: 0,
          totalFreight: 0,
          manualCommissions: manual.commission_value,
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
      const exportData = summaries.map((summary, index) => ({
        'Rank': index + 1,
        'Motorista': summary.driverName,
        'Total de Comissão': `R$ ${summary.totalCommission.toFixed(2)}`,
      }));

      const monthName = currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      exportToExcel(exportData, `comissoes-resumo-${monthName}.csv`);
    } else {
      const filteredTrips = getFilteredTrips();
      const selectedDriverManualCommissions = selectedDriver
        ? manualCommissions.filter(m => m.driver_id === selectedDriver)
        : [];

      const tripExportData = filteredTrips.map(trip => ({
        'Tipo': 'Viagem',
        'Data': formatDateLocal(trip.departure_date),
        'Origem': trip.origin,
        'Destino': trip.destination,
        'Placa': trip.vehiclePlate,
        'Descrição': `${trip.origin} → ${trip.destination}`,
        'Comissão': `R$ ${Number(trip.driver_commission).toFixed(2)}`,
      }));

      const manualExportData = selectedDriverManualCommissions.map(manual => ({
        'Tipo': 'Comissão Manual',
        'Data': formatDateLocal(manual.date),
        'Origem': manual.origin || '-',
        'Destino': '-',
        'Placa': '-',
        'Descrição': manual.description,
        'Comissão': `R$ ${Number(manual.commission_value).toFixed(2)}`,
      }));

      const exportData = [...tripExportData, ...manualExportData];

      const monthName = currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      const driverName = selectedDriver
        ? drivers.find(d => d.id === selectedDriver)?.name.replace(/\s+/g, '-') || 'motorista'
        : 'filtrado';
      exportToExcel(exportData, `comissoes-detalhes-${driverName}-${monthName}.csv`);
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

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleForm.origin.trim() || !ruleForm.destination.trim() || ruleForm.commission_value <= 0) {
      alert('Preencha todos os campos corretamente');
      return;
    }

    try {
      await addDoc(collection(db, 'commission_rules'), {
        ...ruleForm,
        created_at: new Date().toISOString(),
      });
      setShowRuleModal(false);
      setRuleForm({ origin: '', destination: '', commission_value: 0 });
      loadCommissionData();
    } catch (error) {
      console.error('Error saving rule:', error);
      alert('Erro ao salvar regra');
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta regra?')) return;

    try {
      await deleteDoc(doc(db, 'commission_rules', id));
      loadCommissionData();
    } catch (error) {
      console.error('Error deleting rule:', error);
    }
  };

  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    const driverIdentifier = manualForm.driver_id || manualForm.driver_name.trim();
    if (!driverIdentifier || !manualForm.description.trim() || manualForm.commission_value <= 0) {
      alert('Preencha todos os campos corretamente');
      return;
    }

    try {
      await addDoc(collection(db, 'manual_commissions'), {
        driver_id: manualForm.driver_id || manualForm.driver_name.trim(),
        description: manualForm.description,
        origin: manualForm.origin,
        commission_value: manualForm.commission_value,
        notes: manualForm.notes,
        date: manualForm.date,
        created_at: new Date().toISOString(),
      });
      setShowManualModal(false);
      setManualForm({
        driver_id: '',
        driver_name: '',
        description: '',
        origin: '',
        commission_value: 0,
        notes: '',
        date: new Date().toISOString().split('T')[0],
      });
      loadCommissionData();
    } catch (error) {
      console.error('Error saving manual commission:', error);
      alert('Erro ao salvar comissão manual');
    }
  };

  const handleDeleteManual = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta comissão manual?')) return;

    try {
      await deleteDoc(doc(db, 'manual_commissions', id));
      loadCommissionData();
    } catch (error) {
      console.error('Error deleting manual commission:', error);
    }
  };

  const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
  const monthDisplay = monthFormatter.format(currentMonth).toUpperCase();

  const driverSummaries = getDriverSummaries();
  const filteredTrips = getFilteredTrips();

  const totalCommission = view === 'summary'
    ? driverSummaries.reduce((sum, summary) => sum + summary.totalCommission, 0)
    : filteredTrips.reduce((sum, trip) => sum + (trip.driver_commission || 0), 0) +
      (selectedDriver ? manualCommissions.filter(m => m.driver_id === selectedDriver).reduce((sum, m) => sum + m.commission_value, 0) : 0);

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
          <p className="text-slate-600 mt-2">Resumo, detalhamento e regras de comissões</p>
        </div>
        {activeTab === 'summary' && (
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
        )}
      </div>

      <div className="border-b border-slate-200 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('summary')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'summary'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            Resumo e Viagens
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'rules'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            Regras de Comissão ({commissionRules.length})
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'manual'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            Comissões Manuais ({manualCommissions.filter(m => {
              const year = currentMonth.getFullYear();
              const month = currentMonth.getMonth();
              const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
              const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];
              return m.date >= firstDay && m.date <= lastDay;
            }).length})
          </button>
        </nav>
      </div>

      {activeTab === 'rules' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <p className="text-slate-600">
              Configure valores de comissão automáticos por origem e destino
            </p>
            <button
              onClick={() => setShowRuleModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Nova Regra
            </button>
          </div>

          {commissionRules.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
              <DollarSign className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 mb-4">Nenhuma regra de comissão cadastrada</p>
              <button
                onClick={() => setShowRuleModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-5 w-5 mr-2" />
                Cadastrar Primeira Regra
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                      Origem
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                      Destino
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                      Valor da Comissão
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-700 uppercase">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {commissionRules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                        {rule.origin}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {rule.destination}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                        R$ {Number(rule.commission_value).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'manual' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <p className="text-slate-600">
              Adicione comissões manuais (pernoites, bonificações, etc.)
            </p>
            <button
              onClick={() => setShowManualModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Nova Comissão Manual
            </button>
          </div>

          {manualCommissions.filter(m => {
            const year = currentMonth.getFullYear();
            const month = currentMonth.getMonth();
            const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
            const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];
            return m.date >= firstDay && m.date <= lastDay;
          }).length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
              <DollarSign className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 mb-2">Nenhuma comissão manual para {monthDisplay}</p>
              <button
                onClick={() => setShowManualModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mt-4"
              >
                <Plus className="h-5 w-5 mr-2" />
                Adicionar Comissão Manual
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                      Motorista
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                      Descrição
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                      Origem
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                      Valor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                      Observações
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-700 uppercase">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {manualCommissions.filter(m => {
                    const year = currentMonth.getFullYear();
                    const month = currentMonth.getMonth();
                    const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
                    const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];
                    return m.date >= firstDay && m.date <= lastDay;
                  }).map((manual) => (
                    <tr key={manual.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {formatDateLocal(manual.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                        {drivers.find(d => d.id === manual.driver_id)?.name || manual.driver_id}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {manual.description}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {manual.origin || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                        R$ {Number(manual.commission_value).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {manual.notes || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleDeleteManual(manual.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'summary' && (
        <>
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
                    .filter(driver => trips.some(trip => trip.driver_id === driver.id) || manualCommissions.some(m => m.driver_id === driver.id))
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
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-slate-900">Ranking de Comissões</h3>
                  <button
                    onClick={handleExportExcel}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Download className="h-5 w-5 mr-2" />
                    Exportar Excel
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {driverSummaries.map((summary, index) => (
                    <div
                      key={summary.driverId}
                      className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`flex items-center justify-center w-12 h-12 rounded-full font-bold text-lg ${
                            index === 0 ? 'bg-yellow-100 text-yellow-700' :
                            index === 1 ? 'bg-slate-200 text-slate-700' :
                            index === 2 ? 'bg-orange-100 text-orange-700' :
                            'bg-blue-100 text-blue-600'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-slate-900">{summary.driverName}</h4>
                            <p className="text-xs text-slate-600">{summary.tripCount} viagens</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4 mb-4">
                        <p className="text-sm text-green-700 mb-1">Total de Comissão</p>
                        <p className="text-2xl font-bold text-green-600">
                          R$ {summary.totalCommission.toFixed(2)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleViewDetails(summary.driverId)}
                        className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Ver Detalhes
                        <ChevronRight className="h-5 w-5 ml-1" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          ) : (
            <div>
              <div className="flex justify-between items-center mb-6">
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
                      Mostrando dados de: <span className="font-semibold text-slate-900">
                        {drivers.find(d => d.id === selectedDriver)?.name}
                      </span>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleExportExcel}
                  disabled={filteredTrips.length === 0 && (!selectedDriver || manualCommissions.filter(m => m.driver_id === selectedDriver).length === 0)}
                  className={`inline-flex items-center px-4 py-2 rounded-lg transition-colors ${
                    filteredTrips.length > 0 || (selectedDriver && manualCommissions.filter(m => m.driver_id === selectedDriver).length > 0)
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Download className="h-5 w-5 mr-2" />
                  Exportar Excel
                </button>
              </div>

              {filteredTrips.length === 0 && (!selectedDriver || manualCommissions.filter(m => m.driver_id === selectedDriver).length === 0) ? (
                <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
                  <TrendingUp className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600">Nenhuma comissão encontrada com os filtros aplicados</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {selectedDriver && manualCommissions.filter(m => m.driver_id === selectedDriver).length > 0 && (
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                      <div className="bg-blue-50 px-6 py-4 border-b border-blue-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-5 w-5 text-blue-700" />
                          <h3 className="font-semibold text-blue-900">Comissões Manuais</h3>
                        </div>
                        <div className="text-sm font-semibold text-blue-900">
                          Total: R$ {manualCommissions.filter(m => m.driver_id === selectedDriver).reduce((sum, m) => sum + m.commission_value, 0).toFixed(2)}
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                                Data
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                                Descrição
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                                Origem
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                                Comissão
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-slate-200">
                            {manualCommissions.filter(m => m.driver_id === selectedDriver).map((manual) => (
                              <tr key={manual.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                                  {formatDateLocal(manual.date)}
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600">
                                  {manual.description}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                  {manual.origin || '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600">
                                  R$ {Number(manual.commission_value).toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {filteredTrips.length > 0 && (
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                      <div className="bg-green-50 px-6 py-4 border-b border-green-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-green-700" />
                          <h3 className="font-semibold text-green-900">Comissões de Viagens</h3>
                        </div>
                        <div className="text-sm font-semibold text-green-900">
                          Total: R$ {filteredTrips.reduce((sum, trip) => sum + (trip.driver_commission || 0), 0).toFixed(2)}
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                                Data
                              </th>
                              {!selectedDriver && (
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                                  Motorista
                                </th>
                              )}
                              <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                                Origem
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                                Destino
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                                Placa
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
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
                                {!selectedDriver && (
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                    {trip.driverName}
                                  </td>
                                )}
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                  {trip.origin}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                  {trip.destination}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                  {trip.vehiclePlate}
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
          )}
        </>
      )}

      {showRuleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full">
            <div className="flex justify-between items-center p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">Nova Regra de Comissão</h2>
              <button
                onClick={() => {
                  setShowRuleModal(false);
                  setRuleForm({ origin: '', destination: '', commission_value: 0 });
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Origem *
                </label>
                <input
                  type="text"
                  required
                  value={ruleForm.origin}
                  onChange={(e) => setRuleForm({ ...ruleForm, origin: e.target.value })}
                  placeholder="Ex: CD FARIAS"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Destino *
                </label>
                <input
                  type="text"
                  required
                  value={ruleForm.destination}
                  onChange={(e) => setRuleForm({ ...ruleForm, destination: e.target.value })}
                  placeholder="Ex: BOA MESA (GASPAR)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Valor da Comissão (R$) *
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={ruleForm.commission_value}
                  onChange={(e) => setRuleForm({ ...ruleForm, commission_value: parseFloat(e.target.value) })}
                  placeholder="Ex: 60.00"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowRuleModal(false);
                    setRuleForm({ origin: '', destination: '', commission_value: 0 });
                  }}
                  className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showManualModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full">
            <div className="flex justify-between items-center p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">Nova Comissão Manual</h2>
              <button
                onClick={() => {
                  setShowManualModal(false);
                  setManualForm({
                    driver_id: '',
                    driver_name: '',
                    description: '',
                    origin: '',
                    commission_value: 0,
                    notes: '',
                    date: new Date().toISOString().split('T')[0],
                  });
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSaveManual} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Motorista *
                </label>
                <div className="space-y-2">
                  <select
                    value={manualForm.driver_id}
                    onChange={(e) => setManualForm({ ...manualForm, driver_id: e.target.value, driver_name: '' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Selecione um motorista cadastrado</option>
                    {drivers.map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-slate-300"></div>
                    <span className="text-xs text-slate-600 px-2">OU</span>
                    <div className="flex-1 h-px bg-slate-300"></div>
                  </div>
                  <input
                    type="text"
                    value={manualForm.driver_name}
                    onChange={(e) => setManualForm({ ...manualForm, driver_name: e.target.value, driver_id: '' })}
                    placeholder="Digite o nome do motorista"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                {!manualForm.driver_id && !manualForm.driver_name.trim() && (
                  <p className="text-xs text-red-600 mt-1">Selecione ou digite um motorista</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Data *
                </label>
                <input
                  type="date"
                  required
                  value={manualForm.date}
                  onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Descrição *
                </label>
                <input
                  type="text"
                  required
                  value={manualForm.description}
                  onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })}
                  placeholder="Ex: Pernoite, Bonificação, etc"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Origem (opcional)
                </label>
                <input
                  type="text"
                  value={manualForm.origin}
                  onChange={(e) => setManualForm({ ...manualForm, origin: e.target.value })}
                  placeholder="Local de origem"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Valor da Comissão (R$) *
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={manualForm.commission_value}
                  onChange={(e) => setManualForm({ ...manualForm, commission_value: parseFloat(e.target.value) })}
                  placeholder="Ex: 100.00"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Observações
                </label>
                <textarea
                  value={manualForm.notes}
                  onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                  rows={3}
                  placeholder="Observações adicionais"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowManualModal(false);
                    setManualForm({
                      driver_id: '',
                      driver_name: '',
                      description: '',
                      origin: '',
                      commission_value: 0,
                      notes: '',
                      date: new Date().toISOString().split('T')[0],
                    });
                  }}
                  className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
