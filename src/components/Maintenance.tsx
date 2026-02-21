import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy } from 'firebase/firestore';
import { Plus, Edit2, Trash2, X, CheckCircle } from 'lucide-react';
import { formatDateLocal, getDateWithTimezoneOffset } from '../utils/dateUtils';
import { updateVehicleKm } from '../utils/vehicleKmUpdate';

import type { Maintenance, TireChange, Vehicle } from '../types';

type MaintenanceForm = Omit<Maintenance, 'id' | 'created_at'>;
type TireChangeForm = Omit<TireChange, 'id' | 'created_at'>;

type Tab = 'maintenances' | 'tires';

export default function Maintenance() {
  const [activeTab, setActiveTab] = useState<Tab>('maintenances');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [tireChanges, setTireChanges] = useState<TireChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Maintenance | TireChange | null>(null);
  const [viewingMaintenance, setViewingMaintenance] = useState<Maintenance | null>(null);

  const [maintenanceForm, setMaintenanceForm] = useState<MaintenanceForm>({
    vehicle_id: '',
    maintenance_date: getDateWithTimezoneOffset(),
    km_at_maintenance: 0,
    type: 'preventiva',
    description: '',
    cost: 0,
    next_maintenance_km: null,
    notes: '',
    status: 'in_progress',
  });

  const [tireForm, setTireForm] = useState<TireChangeForm>({
    vehicle_id: '',
    change_date: getDateWithTimezoneOffset(),
    km_at_change: 0,
    tire_position: '',
    tire_brand: '',
    cost: 0,
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [vehiclesSnap, maintenancesSnap, tiresSnap] = await Promise.all([
        getDocs(query(collection(db, 'vehicles'), orderBy('plate'))),
        getDocs(query(collection(db, 'maintenances'), orderBy('maintenance_date', 'desc'))),
        getDocs(query(collection(db, 'tire_changes'), orderBy('change_date', 'desc'))),
      ]);

      setVehicles(vehiclesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle)));
      setMaintenances(maintenancesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Maintenance)));
      setTireChanges(tiresSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TireChange)));
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Erro ao carregar dados. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  const handleMaintenanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const vehicle = vehicles.find(v => v.id === maintenanceForm.vehicle_id);

      if (editingItem && 'type' in editingItem) {
        await updateDoc(doc(db, 'maintenances', editingItem.id), maintenanceForm);

        if (maintenanceForm.status === 'in_progress' && vehicle && vehicle.status !== 'maintenance') {
          await updateDoc(doc(db, 'vehicles', maintenanceForm.vehicle_id), {
            status: 'maintenance'
          });
        } else if (maintenanceForm.status === 'completed' && vehicle && vehicle.status === 'maintenance') {
          await updateDoc(doc(db, 'vehicles', maintenanceForm.vehicle_id), {
            status: 'active'
          });
        }
      } else {
        await addDoc(collection(db, 'maintenances'), {
          ...maintenanceForm,
          created_at: new Date().toISOString()
        });

        if (maintenanceForm.status === 'in_progress' && vehicle) {
          await updateDoc(doc(db, 'vehicles', maintenanceForm.vehicle_id), {
            status: 'maintenance'
          });
        }
      }

      await updateVehicleKm(maintenanceForm.vehicle_id, maintenanceForm.km_at_maintenance);

      setShowModal(false);
      setEditingItem(null);
      resetMaintenanceForm();
      loadData();
    } catch (error) {
      console.error('Error saving maintenance:', error);
    }
  };

  const handleCompleteMaintenance = async (maintenance: Maintenance) => {
    try {
      await updateDoc(doc(db, 'maintenances', maintenance.id), {
        status: 'completed'
      });

      const vehicle = vehicles.find(v => v.id === maintenance.vehicle_id);
      if (vehicle && vehicle.status === 'maintenance') {
        const activeMaintenances = maintenances.filter(
          m => m.vehicle_id === maintenance.vehicle_id &&
          m.status === 'in_progress' &&
          m.id !== maintenance.id
        );

        if (activeMaintenances.length === 0) {
          await updateDoc(doc(db, 'vehicles', maintenance.vehicle_id), {
            status: 'active'
          });
        }
      }

      setViewingMaintenance(null);
      loadData();
    } catch (error) {
      console.error('Error completing maintenance:', error);
      alert('Erro ao concluir manutenção. Tente novamente.');
    }
  };

  const handleTireSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem && 'tire_position' in editingItem) {
        await updateDoc(doc(db, 'tire_changes', editingItem.id), tireForm);
      } else {
        await addDoc(collection(db, 'tire_changes'), {
          ...tireForm,
          created_at: new Date().toISOString()
        });
      }

      await updateVehicleKm(tireForm.vehicle_id, tireForm.km_at_change);

      setShowModal(false);
      setEditingItem(null);
      resetTireForm();
      loadData();
    } catch (error) {
      console.error('Error saving tire change:', error);
    }
  };

  const handleDelete = async (id: string, type: 'maintenance' | 'tire') => {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;

    try {
      const collectionName = type === 'maintenance' ? 'maintenances' : 'tire_changes';

      if (type === 'maintenance') {
        const maintenance = maintenances.find(m => m.id === id);
        if (maintenance && maintenance.status === 'in_progress') {
          const vehicle = vehicles.find(v => v.id === maintenance.vehicle_id);
          if (vehicle && vehicle.status === 'maintenance') {
            const activeMaintenances = maintenances.filter(
              m => m.vehicle_id === maintenance.vehicle_id &&
              m.status === 'in_progress' &&
              m.id !== id
            );

            if (activeMaintenances.length === 0) {
              await updateDoc(doc(db, 'vehicles', maintenance.vehicle_id), {
                status: 'active'
              });
            }
          }
        }
      }

      await deleteDoc(doc(db, collectionName, id));
      loadData();
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const openMaintenanceModal = (maintenance?: Maintenance) => {
    if (maintenance) {
      setEditingItem(maintenance);
      setMaintenanceForm(maintenance);
    } else {
      resetMaintenanceForm();
    }
    setShowModal(true);
  };

  const openTireModal = (tire?: TireChange) => {
    if (tire) {
      setEditingItem(tire);
      setTireForm(tire);
    } else {
      resetTireForm();
    }
    setShowModal(true);
  };

  const resetMaintenanceForm = () => {
    setMaintenanceForm({
      vehicle_id: '',
      maintenance_date: new Date().toISOString().split('T')[0],
      km_at_maintenance: 0,
      type: 'preventiva',
      description: '',
      cost: 0,
      next_maintenance_km: null,
      notes: '',
      status: 'in_progress',
    });
  };

  const resetTireForm = () => {
    setTireForm({
      vehicle_id: '',
      change_date: new Date().toISOString().split('T')[0],
      km_at_change: 0,
      tire_position: '',
      tire_brand: '',
      cost: 0,
      notes: '',
    });
  };

  const getVehiclePlate = (vehicleId: string) => {
    return vehicles.find(v => v.id === vehicleId)?.plate || 'N/A';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress':
        return 'bg-orange-100 text-orange-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'in_progress':
        return 'Em Manutenção';
      case 'completed':
        return 'Concluída';
      default:
        return status;
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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Manutenção</h1>
          <p className="text-slate-600 mt-2">Gerencie manutenções e trocas de pneus</p>
        </div>
        <button
          onClick={() => activeTab === 'maintenances' ? openMaintenanceModal() : openTireModal()}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          {activeTab === 'maintenances' ? 'Adicionar Manutenção' : 'Adicionar Troca de Pneu'}
        </button>
      </div>

      <div className="border-b border-slate-200 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('maintenances')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'maintenances'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            Manutenções
          </button>
          <button
            onClick={() => setActiveTab('tires')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'tires'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            Trocas de Pneus
          </button>
        </nav>
      </div>

      {activeTab === 'maintenances' ? (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Veículo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    KM
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Custo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Descrição
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-700 uppercase">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {maintenances.map((maintenance) => (
                  <tr
                    key={maintenance.id}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => setViewingMaintenance(maintenance)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      {getVehiclePlate(maintenance.vehicle_id)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {formatDateLocal(maintenance.maintenance_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {maintenance.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(maintenance.status)}`}>
                        {getStatusLabel(maintenance.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {maintenance.km_at_maintenance.toLocaleString()} km
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      R$ {Number(maintenance.cost).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">
                      {maintenance.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openMaintenanceModal(maintenance);
                        }}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(maintenance.id, 'maintenance');
                        }}
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
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Veículo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    KM
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Posição
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Marca
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Custo
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-700 uppercase">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {tireChanges.map((tire) => (
                  <tr key={tire.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      {getVehiclePlate(tire.vehicle_id)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {formatDateLocal(tire.change_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {tire.km_at_change.toLocaleString()} km
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {tire.tire_position}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {tire.tire_brand}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      R$ {Number(tire.cost).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => openTireModal(tire)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(tire.id, 'tire')}
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
        </div>
      )}

      {viewingMaintenance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="flex justify-between items-center p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">
                Detalhes da Manutenção
              </h2>
              <button
                onClick={() => setViewingMaintenance(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Veículo</label>
                  <p className="text-lg font-semibold text-slate-900 mt-1">
                    {getVehiclePlate(viewingMaintenance.vehicle_id)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Status</label>
                  <p className="mt-1">
                    <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(viewingMaintenance.status)}`}>
                      {getStatusLabel(viewingMaintenance.status)}
                    </span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Data</label>
                  <p className="text-slate-900 mt-1">
                    {formatDateLocal(viewingMaintenance.maintenance_date)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Tipo</label>
                  <p className="text-slate-900 mt-1 capitalize">
                    {viewingMaintenance.type}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">KM na Manutenção</label>
                  <p className="text-slate-900 mt-1">
                    {viewingMaintenance.km_at_maintenance.toLocaleString()} km
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Custo</label>
                  <p className="text-slate-900 mt-1">
                    R$ {Number(viewingMaintenance.cost).toFixed(2)}
                  </p>
                </div>
              </div>

              {viewingMaintenance.next_maintenance_km && (
                <div>
                  <label className="text-sm font-medium text-slate-700">Próxima Manutenção</label>
                  <p className="text-slate-900 mt-1">
                    {viewingMaintenance.next_maintenance_km.toLocaleString()} km
                  </p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-slate-700">Descrição</label>
                <p className="text-slate-900 mt-1 bg-slate-50 p-3 rounded-lg">
                  {viewingMaintenance.description}
                </p>
              </div>

              {viewingMaintenance.notes && (
                <div>
                  <label className="text-sm font-medium text-slate-700">Observações</label>
                  <p className="text-slate-900 mt-1 bg-slate-50 p-3 rounded-lg">
                    {viewingMaintenance.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-slate-200">
              <button
                onClick={() => setViewingMaintenance(null)}
                className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Fechar
              </button>
              {viewingMaintenance.status === 'in_progress' && (
                <button
                  onClick={() => handleCompleteMaintenance(viewingMaintenance)}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Concluir Manutenção
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showModal && activeTab === 'maintenances' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">
                {editingItem ? 'Editar Manutenção' : 'Adicionar Manutenção'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingItem(null);
                  resetMaintenanceForm();
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleMaintenanceSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Veículo *
                  </label>
                  <select
                    required
                    value={maintenanceForm.vehicle_id}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, vehicle_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Selecione um veículo</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.plate} - {vehicle.brand} {vehicle.model}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Data *
                  </label>
                  <input
                    type="date"
                    required
                    value={maintenanceForm.maintenance_date}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, maintenance_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Status *
                  </label>
                  <select
                    required
                    value={maintenanceForm.status}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="in_progress">Em Manutenção</option>
                    <option value="completed">Concluída</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Tipo *
                  </label>
                  <select
                    required
                    value={maintenanceForm.type}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="preventiva">Preventiva</option>
                    <option value="corretiva">Corretiva</option>
                    <option value="revisão">Revisão</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    KM na Manutenção *
                  </label>
                  <input
                    type="number"
                    required
                    value={maintenanceForm.km_at_maintenance}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, km_at_maintenance: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Custo (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={maintenanceForm.cost}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, cost: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Próxima Manutenção (KM)
                  </label>
                  <input
                    type="number"
                    value={maintenanceForm.next_maintenance_km || ''}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, next_maintenance_km: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Descrição *
                  </label>
                  <textarea
                    required
                    value={maintenanceForm.description}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Observações
                  </label>
                  <textarea
                    value={maintenanceForm.notes || ''}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingItem(null);
                    resetMaintenanceForm();
                  }}
                  className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingItem ? 'Atualizar' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModal && activeTab === 'tires' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">
                {editingItem ? 'Editar Troca de Pneu' : 'Adicionar Troca de Pneu'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingItem(null);
                  resetTireForm();
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleTireSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Veículo *
                  </label>
                  <select
                    required
                    value={tireForm.vehicle_id}
                    onChange={(e) => setTireForm({ ...tireForm, vehicle_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Selecione um veículo</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.plate} - {vehicle.brand} {vehicle.model}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Data *
                  </label>
                  <input
                    type="date"
                    required
                    value={tireForm.change_date}
                    onChange={(e) => setTireForm({ ...tireForm, change_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    KM na Troca *
                  </label>
                  <input
                    type="number"
                    required
                    value={tireForm.km_at_change}
                    onChange={(e) => setTireForm({ ...tireForm, km_at_change: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Posição do Pneu *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Dianteiro esquerdo"
                    value={tireForm.tire_position}
                    onChange={(e) => setTireForm({ ...tireForm, tire_position: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Marca do Pneu *
                  </label>
                  <input
                    type="text"
                    required
                    value={tireForm.tire_brand}
                    onChange={(e) => setTireForm({ ...tireForm, tire_brand: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Custo (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={tireForm.cost}
                    onChange={(e) => setTireForm({ ...tireForm, cost: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Observações
                  </label>
                  <textarea
                    value={tireForm.notes || ''}
                    onChange={(e) => setTireForm({ ...tireForm, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingItem(null);
                    resetTireForm();
                  }}
                  className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingItem ? 'Atualizar' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
