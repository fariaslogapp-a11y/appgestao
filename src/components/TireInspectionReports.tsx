import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { Download, FileText, Filter } from 'lucide-react';
import { exportToExcel, exportToPDF } from '../utils/reportExport';
import type { Vehicle, TireInspectionForm, TireInspectionResponse } from '../types';

export default function TireInspectionReports() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [forms, setForms] = useState<TireInspectionForm[]>([]);
  const [responses, setResponses] = useState<Record<string, TireInspectionResponse[]>>({});
  const [loading, setLoading] = useState(true);

  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [vehiclesSnapshot, formsSnapshot] = await Promise.all([
        getDocs(query(collection(db, 'vehicles'), orderBy('plate'))),
        getDocs(query(collection(db, 'tire_inspection_forms'), orderBy('created_at', 'desc')))
      ]);

      const vehiclesData = vehiclesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Vehicle));

      const formsData = formsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as TireInspectionForm));

      setVehicles(vehiclesData);
      setForms(formsData);

      const responsesMap: Record<string, TireInspectionResponse[]> = {};

      for (const form of formsData) {
        const responsesSnapshot = await getDocs(
          query(collection(db, 'tire_inspection_responses'), where('form_id', '==', form.id))
        );
        responsesMap[form.id] = responsesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as TireInspectionResponse));
      }

      setResponses(responsesMap);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Erro ao carregar dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredForms = () => {
    return forms.filter(form => {
      if (selectedVehicle && form.vehicle_id !== selectedVehicle) return false;
      if (selectedStatus !== 'all' && form.status !== selectedStatus) return false;

      if (startDate) {
        const formDate = new Date(form.created_at);
        const start = new Date(startDate);
        if (formDate < start) return false;
      }

      if (endDate) {
        const formDate = new Date(form.created_at);
        const end = new Date(endDate);
        end.setHours(23, 59, 59);
        if (formDate > end) return false;
      }

      return true;
    });
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const filteredForms = getFilteredForms();
      const data = filteredForms.map(form => ({
        form,
        vehicle: vehicles.find(v => v.id === form.vehicle_id),
        responses: responses[form.id] || []
      }));

      const timestamp = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
      exportToExcel(data, `relatorio-pneus-${timestamp}`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Erro ao exportar para Excel. Tente novamente.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const filteredForms = getFilteredForms();
      const data = filteredForms.map(form => ({
        form,
        vehicle: vehicles.find(v => v.id === form.vehicle_id),
        responses: responses[form.id] || []
      }));

      const timestamp = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
      exportToPDF(data, `relatorio-pneus-${timestamp}`);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      alert('Erro ao exportar para PDF. Tente novamente.');
    } finally {
      setExporting(false);
    }
  };

  const filteredForms = getFilteredForms();

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
        <h1 className="text-3xl font-bold text-slate-900">Relatórios de Inspeção</h1>
        <p className="text-slate-600 mt-2">Gere relatórios personalizados em Excel e PDF</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 mb-8">
        <div className="flex items-center gap-2 mb-6">
          <Filter className="h-5 w-5 text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-900">Filtros</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Veículo
            </label>
            <select
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos os Veículos</option>
              {vehicles.map(vehicle => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.plate}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos</option>
              <option value="pending">Pendentes</option>
              <option value="completed">Preenchidos</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Data Inicial
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Data Final
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleExportExcel}
            disabled={filteredForms.length === 0 || exporting}
            className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
              filteredForms.length === 0 || exporting
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            <Download className="h-5 w-5" />
            {exporting ? 'Exportando...' : 'Exportar Excel'}
          </button>

          <button
            onClick={handleExportPDF}
            disabled={filteredForms.length === 0 || exporting}
            className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
              filteredForms.length === 0 || exporting
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            <Download className="h-5 w-5" />
            {exporting ? 'Exportando...' : 'Exportar PDF'}
          </button>

          {(selectedVehicle || selectedStatus !== 'all' || startDate || endDate) && (
            <button
              onClick={() => {
                setSelectedVehicle('');
                setSelectedStatus('all');
                setStartDate('');
                setEndDate('');
              }}
              className="px-6 py-3 bg-slate-200 text-slate-900 rounded-lg hover:bg-slate-300 transition-colors font-medium"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Fichas Encontradas: {filteredForms.length}
        </h2>

        {filteredForms.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">Nenhuma ficha encontrada com os filtros selecionados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                    Veículo
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                    Motorista
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                    Criada em
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                    Pneus
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredForms.map(form => {
                  const formResponses = responses[form.id] || [];
                  return (
                    <tr key={form.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-900">
                        {vehicles.find(v => v.id === form.vehicle_id)?.plate || form.vehicle_id}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {form.driver_name}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          form.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {form.status === 'completed' ? 'Preenchido' : 'Pendente'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {new Date(form.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {formResponses.length}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
