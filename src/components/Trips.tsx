import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy } from 'firebase/firestore';
import { Plus, Edit2, Trash2, X, MapPin, Calendar, DollarSign, FileText, Download, Upload, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { formatDateLocal, getDateWithTimezoneOffset } from '../utils/dateUtils';
import { exportToExcel } from '../utils/excelExport';
import BulkTripImportModal from './BulkTripImportModal';

import type { Trip, Vehicle, Driver } from '../types';

type TripForm = Omit<Trip, 'id' | 'created_at'>;

const ITEMS_PER_PAGE = 100;

export default function Trips() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [formData, setFormData] = useState<TripForm>({
    vehicle_id: '',
    driver_id: '',
    status: 'completed',
    origin: '',
    destination: '',
    departure_date: getDateWithTimezoneOffset(),
    arrival_date: null,
    freight_value: 0,
    driver_commission: null,
    cte: '',
    nfe: '',
    pallet_term: '',
    mdfe: '',
    receipt: '',
    notes: '',
  });

  const [isCustomDriver, setIsCustomDriver] = useState(false);
  const [customDriverName, setCustomDriverName] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tripsSnap, vehiclesSnap, driversSnap] = await Promise.all([
        getDocs(query(collection(db, 'trips'), orderBy('departure_date', 'desc'))),
        getDocs(query(collection(db, 'vehicles'), orderBy('plate'))),
        getDocs(query(collection(db, 'drivers'), orderBy('name'))),
      ]);

      setTrips(tripsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trip)));
      setVehicles(vehiclesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle)));
      setDrivers(driversSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Driver)));
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Erro ao carregar dados. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.vehicle_id?.trim()) {
      alert('Veículo é obrigatório');
      return;
    }

    if (isCustomDriver) {
      if (!customDriverName.trim()) {
        alert('Nome do motorista é obrigatório');
        return;
      }
    } else {
      if (!formData.driver_id?.trim()) {
        alert('Motorista é obrigatório');
        return;
      }
    }

    try {
      const submitData = {
        ...formData,
        vehicle_id: formData.vehicle_id,
        driver_id: isCustomDriver ? customDriverName : formData.driver_id,
        driver_commission: isCustomDriver ? 0 : formData.driver_commission,
      };

      if (editingTrip) {
        await updateDoc(doc(db, 'trips', editingTrip.id), submitData);
      } else {
        await addDoc(collection(db, 'trips'), {
          ...submitData,
          created_at: new Date().toISOString()
        });
      }

      setShowModal(false);
      setEditingTrip(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving trip:', error);
      alert('Erro ao salvar viagem. Por favor, tente novamente.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta viagem?')) return;

    try {
      await deleteDoc(doc(db, 'trips', id));
      loadData();
    } catch (error) {
      console.error('Error deleting trip:', error);
    }
  };

  const openModal = (trip?: Trip) => {
    if (trip) {
      setEditingTrip(trip);
      setFormData(trip);

      const isDriverRegistered = drivers.find(d => d.id === trip.driver_id);
      if (!isDriverRegistered && trip.driver_id) {
        setIsCustomDriver(true);
        setCustomDriverName(trip.driver_id);
      } else {
        setIsCustomDriver(false);
        setCustomDriverName('');
      }
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      vehicle_id: '',
      driver_id: '',
      status: 'completed',
      origin: '',
      destination: '',
      departure_date: getDateWithTimezoneOffset(),
      arrival_date: null,
      freight_value: 0,
      driver_commission: null,
      cte: '',
      nfe: '',
      pallet_term: '',
      mdfe: '',
      receipt: '',
      notes: '',
    });
    setIsCustomDriver(false);
    setCustomDriverName('');
  };

  const getVehicleInfo = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle ? `${vehicle.plate} - ${vehicle.type}` : 'N/A';
  };

  const getDriverName = (driverId: string | null) => {
    if (!driverId) return '-';
    const driver = drivers.find(d => d.id === driverId);
    return driver ? driver.name : driverId;
  };

  const filteredTrips = trips.filter(trip => {
    if (startDate) {
      const tripDate = new Date(trip.departure_date);
      const filterStart = new Date(startDate);
      if (tripDate < filterStart) return false;
    }

    if (endDate) {
      const tripDate = new Date(trip.departure_date);
      const filterEnd = new Date(endDate);
      filterEnd.setHours(23, 59, 59);
      if (tripDate > filterEnd) return false;
    }

    return true;
  });

  const totalPages = Math.ceil(filteredTrips.length / ITEMS_PER_PAGE);
  const paginatedTrips = filteredTrips.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleExportExcel = () => {
    const exportData = filteredTrips.map(trip => ({
      'Data de Partida': formatDateLocal(trip.departure_date),
      'Data de Chegada': trip.arrival_date ? formatDateLocal(trip.arrival_date) : '-',
      'Motorista': getDriverName(trip.driver_id),
      'Veículo': getVehicleInfo(trip.vehicle_id),
      'Origem': trip.origin,
      'Destino': trip.destination,
      'Valor do Frete': `R$ ${Number(trip.freight_value).toFixed(2)}`,
      'Comissão': trip.driver_commission ? `R$ ${Number(trip.driver_commission).toFixed(2)}` : '-',
      'CT-e': trip.cte || '-',
      'NF-e': trip.nfe || '-',
      'MDF-e': trip.mdfe || '-',
      'Termo Pallet': trip.pallet_term || '-',
      'Canhoto': trip.receipt || '-',
      'Observações': trip.notes || '-',
    }));

    exportToExcel(exportData, `viagens.csv`);
  };

  const handleBulkImport = async (tripsToImport: Array<Omit<Trip, 'id' | 'created_at'>>) => {
    try {
      for (const trip of tripsToImport) {
        await addDoc(collection(db, 'trips'), {
          ...trip,
          created_at: new Date().toISOString()
        });
      }
      loadData();
    } catch (error) {
      console.error('Error bulk importing trips:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Viagens</h1>
          <p className="text-slate-600 mt-2">Gerencie o histórico de viagens concluídas</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            <Filter className="h-5 w-5 mr-2" />
            Filtros
          </button>
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
          <button
            onClick={() => setShowBulkImport(true)}
            className="inline-flex items-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
          >
            <Upload className="h-5 w-5 mr-2" />
            Importar em Lote
          </button>
          <button
            onClick={() => openModal()}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Adicionar Viagem
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Filtros de Data</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Data Inicial
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Data Final
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 bg-slate-200 text-slate-900 rounded-lg hover:bg-slate-300 transition-colors"
              >
                Limpar Filtros
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Mostrando {paginatedTrips.length} de {filteredTrips.length} viagens
            {(startDate || endDate) && ' (filtradas)'}
          </p>
          {totalPages > 1 && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`p-2 rounded-lg transition-colors ${
                  currentPage === 1
                    ? 'text-slate-400 cursor-not-allowed'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-sm text-slate-700">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={`p-2 rounded-lg transition-colors ${
                  currentPage === totalPages
                    ? 'text-slate-400 cursor-not-allowed'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {paginatedTrips.map((trip) => (
          <div
            key={trip.id}
            className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-lg font-semibold text-slate-900">
                    {getVehicleInfo(trip.vehicle_id)}
                  </h3>
                </div>
                <div className="flex items-center space-x-4 text-sm text-slate-600 mb-2">
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {trip.origin} → {trip.destination}
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {formatDateLocal(trip.departure_date)}
                    {trip.arrival_date && ` - ${formatDateLocal(trip.arrival_date)}`}
                  </div>
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 mr-1" />
                    R$ {Number(trip.freight_value).toFixed(2)}
                  </div>
                  {trip.driver_commission && (
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-1" />
                      Comissão: R$ {Number(trip.driver_commission).toFixed(2)}
                    </div>
                  )}
                </div>
                {trip.driver_id && (
                  <div className="text-sm text-slate-600">
                    <span className="font-medium">Motorista:</span> {getDriverName(trip.driver_id)}
                  </div>
                )}
              </div>
              <div className="flex space-x-2 ml-4">
                <button
                  onClick={() => openModal(trip)}
                  className="text-blue-600 hover:text-blue-900"
                >
                  <Edit2 className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleDelete(trip.id)}
                  className="text-red-600 hover:text-red-900"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-4 border-t border-slate-200">
              {trip.cte && (
                <div className="text-sm">
                  <div className="text-slate-500 mb-1">CT-e</div>
                  <div className="text-slate-900 font-medium">{trip.cte}</div>
                </div>
              )}
              {trip.nfe && (
                <div className="text-sm">
                  <div className="text-slate-500 mb-1">NF-e</div>
                  <div className="text-slate-900 font-medium">{trip.nfe}</div>
                </div>
              )}
              {trip.mdfe && (
                <div className="text-sm">
                  <div className="text-slate-500 mb-1">MDF-e</div>
                  <div className="text-slate-900 font-medium">{trip.mdfe}</div>
                </div>
              )}
              {trip.pallet_term && (
                <div className="text-sm">
                  <div className="text-slate-500 mb-1">Termo Pallet</div>
                  <div className="text-slate-900 font-medium">{trip.pallet_term}</div>
                </div>
              )}
              {trip.receipt && (
                <div className="text-sm">
                  <div className="text-slate-500 mb-1">Canhoto</div>
                  <div className="text-slate-900 font-medium">{trip.receipt}</div>
                </div>
              )}
            </div>

            {trip.notes && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="text-sm text-slate-600">{trip.notes}</div>
              </div>
            )}
          </div>
        ))}

        {paginatedTrips.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
            <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600">Nenhuma viagem encontrada</p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center space-x-2">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentPage === 1
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
            }`}
          >
            Primeira
          </button>
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className={`p-2 rounded-lg transition-colors ${
              currentPage === 1
                ? 'text-slate-400 cursor-not-allowed'
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
            }`}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="px-4 py-2 text-sm text-slate-700 bg-white border border-slate-300 rounded-lg">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className={`p-2 rounded-lg transition-colors ${
              currentPage === totalPages
                ? 'text-slate-400 cursor-not-allowed'
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
            }`}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentPage === totalPages
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
            }`}
          >
            Última
          </button>
        </div>
      )}

      {showBulkImport && (
        <BulkTripImportModal
          onClose={() => setShowBulkImport(false)}
          onImport={handleBulkImport}
          drivers={drivers}
          vehicles={vehicles}
        />
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">
                {editingTrip ? 'Editar Viagem' : 'Adicionar Viagem'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingTrip(null);
                  resetForm();
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Veículo *
                  </label>
                  <select
                    required
                    value={formData.vehicle_id}
                    onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Selecione um veículo</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.plate} - {vehicle.brand} {vehicle.model} ({vehicle.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Motorista *
                  </label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={!isCustomDriver}
                          onChange={() => {
                            setIsCustomDriver(false);
                            setCustomDriverName('');
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">Cadastrado</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={isCustomDriver}
                          onChange={() => {
                            setIsCustomDriver(true);
                            setFormData({ ...formData, driver_id: '' });
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">Não Cadastrado</span>
                      </label>
                    </div>

                    {!isCustomDriver ? (
                      <select
                        required
                        value={formData.driver_id || ''}
                        onChange={(e) => setFormData({ ...formData, driver_id: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Selecione um motorista</option>
                        {drivers.map((driver) => (
                          <option key={driver.id} value={driver.id}>
                            {driver.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div>
                        <input
                          type="text"
                          required
                          value={customDriverName}
                          onChange={(e) => setCustomDriverName(e.target.value)}
                          placeholder="Nome do motorista"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="text-xs text-amber-600 mt-1">
                          Motorista não cadastrado - comissão será zerada
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Valor do Frete (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.freight_value}
                    onChange={(e) => setFormData({ ...formData, freight_value: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Comissão do Motorista (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={isCustomDriver ? 0 : (formData.driver_commission || '')}
                    onChange={(e) => setFormData({ ...formData, driver_commission: e.target.value ? parseFloat(e.target.value) : null })}
                    disabled={isCustomDriver}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:text-slate-500"
                    placeholder="Opcional"
                  />
                  {isCustomDriver && (
                    <p className="text-xs text-slate-500 mt-1">
                      Comissão bloqueada para motorista não cadastrado
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Origem *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.origin}
                    onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
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
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Data de Partida *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.departure_date}
                    onChange={(e) => setFormData({ ...formData, departure_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Data de Chegada
                  </label>
                  <input
                    type="date"
                    value={formData.arrival_date || ''}
                    onChange={(e) => setFormData({ ...formData, arrival_date: e.target.value || null })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="border-t border-slate-200 pt-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Documentação</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      CT-e
                    </label>
                    <input
                      type="text"
                      value={formData.cte || ''}
                      onChange={(e) => setFormData({ ...formData, cte: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      NF-e
                    </label>
                    <input
                      type="text"
                      value={formData.nfe || ''}
                      onChange={(e) => setFormData({ ...formData, nfe: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      MDF-e
                    </label>
                    <input
                      type="text"
                      value={formData.mdfe || ''}
                      onChange={(e) => setFormData({ ...formData, mdfe: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Termo Pallet
                    </label>
                    <input
                      type="text"
                      value={formData.pallet_term || ''}
                      onChange={(e) => setFormData({ ...formData, pallet_term: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Canhoto/Recibo
                    </label>
                    <input
                      type="text"
                      value={formData.receipt || ''}
                      onChange={(e) => setFormData({ ...formData, receipt: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Observações
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingTrip(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingTrip ? 'Atualizar' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
