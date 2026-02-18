import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy } from 'firebase/firestore';
import type { Driver } from '../types';
import { Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import { formatDateLocal } from '../utils/dateUtils';

type DriverForm = Omit<Driver, 'id' | 'created_at'>;

export default function Drivers() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<DriverForm>({
    name: '',
    cpf: '',
    phone: '',
    email: '',
    cnh_number: '',
    cnh_validity: '',
    status: 'active',
    notes: '',
  });

  useEffect(() => {
    loadDrivers();
  }, []);

  const loadDrivers = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'drivers'), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      const driversData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Driver));
      setDrivers(driversData);
    } catch (error) {
      console.error('Erro ao carregar motoristas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name?.trim()) {
      alert('Nome do motorista é obrigatório');
      return;
    }

    try {
      const submitData = {
        ...formData,
        cnh_validity: formData.cnh_validity && formData.cnh_validity.trim() ? formData.cnh_validity : '',
      };

      if (editingId) {
        await updateDoc(doc(db, 'drivers', editingId), submitData);
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'drivers'), {
          ...submitData,
          created_at: new Date().toISOString()
        });
      }

      setFormData({
        name: '',
        cpf: '',
        phone: '',
        email: '',
        cnh_number: '',
        cnh_validity: '',
        status: 'active',
        notes: '',
      });
      setShowForm(false);
      loadDrivers();
    } catch (error) {
      console.error('Erro ao salvar motorista:', error);
      alert('Erro ao salvar motorista');
    }
  };

  const handleEdit = (driver: Driver) => {
    const { id, created_at, ...rest } = driver;
    setFormData(rest);
    setEditingId(driver.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este motorista?')) return;

    try {
      await deleteDoc(doc(db, 'drivers', id));
      loadDrivers();
    } catch (error) {
      console.error('Erro ao deletar motorista:', error);
      alert('Erro ao deletar motorista');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      name: '',
      cpf: '',
      phone: '',
      email: '',
      cnh_number: '',
      cnh_validity: '',
      status: 'active',
      notes: '',
    });
  };

  if (loading) {
    return <div className="text-center py-8">Carregando motoristas...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">Gerenciar Motoristas</h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Novo Motorista
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            {editingId ? 'Editar Motorista' : 'Novo Motorista'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nome *
                </label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome completo"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  CPF
                </label>
                <input
                  type="text"
                  value={formData.cpf || ''}
                  onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="000.000.000-00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Telefone
                </label>
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="email@exemplo.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Número CNH
                </label>
                <input
                  type="text"
                  value={formData.cnh_number || ''}
                  onChange={(e) => setFormData({ ...formData, cnh_number: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="CNH"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Validade CNH
                </label>
                <input
                  type="date"
                  value={formData.cnh_validity || ''}
                  onChange={(e) => setFormData({ ...formData, cnh_validity: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status || 'active'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Observações
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Observações adicionais"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={handleCancel}
                className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <X className="w-5 h-5" />
                Cancelar
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Check className="w-5 h-5" />
                {editingId ? 'Atualizar' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {drivers.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center border border-slate-200">
          <p className="text-slate-600 mb-4">Nenhum motorista cadastrado</p>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Cadastrar Motorista
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Nome</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">CPF</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Telefone</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">CNH</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Status</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {drivers.map((driver) => (
                  <tr key={driver.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 text-sm text-slate-900 font-medium">{driver.name}</td>
                    <td className="px-6 py-3 text-sm text-slate-600">{driver.cpf || '-'}</td>
                    <td className="px-6 py-3 text-sm text-slate-600">{driver.phone || '-'}</td>
                    <td className="px-6 py-3 text-sm text-slate-600">{driver.email || '-'}</td>
                    <td className="px-6 py-3 text-sm text-slate-600">
                      {driver.cnh_number ? (
                        <span>
                          {driver.cnh_number}
                          {driver.cnh_validity && ` (${formatDateLocal(driver.cnh_validity)})`}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          driver.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {driver.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(driver)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(driver.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Deletar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
