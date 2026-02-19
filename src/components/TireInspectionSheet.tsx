import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, query, orderBy, addDoc, where, deleteDoc, doc } from 'firebase/firestore';
import { Printer, FileText, Link as LinkIcon, Copy, CheckCircle2, List, Eye, Trash2 } from 'lucide-react';
import PrintableTireSheet from './PrintableTireSheet';
import TireInspectionViewer from './TireInspectionViewer';

import type { Vehicle, TireInspectionForm } from '../types';

export default function TireInspectionSheet() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [coupledVehicle, setCoupledVehicle] = useState<Vehicle | null>(null);
  const [showPrintView, setShowPrintView] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'generate' | 'manage'>('generate');

  const [driverName, setDriverName] = useState('');
  const [driverCpf, setDriverCpf] = useState('');
  const [generatingLink, setGeneratingLink] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const [forms, setForms] = useState<TireInspectionForm[]>([]);
  const [loadingForms, setLoadingForms] = useState(false);
  const [selectedForm, setSelectedForm] = useState<TireInspectionForm | null>(null);
  const [deletingFormId, setDeletingFormId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [copiedFormLink, setCopiedFormLink] = useState<string | null>(null);

  useEffect(() => {
    loadVehicles();
  }, []);

  useEffect(() => {
    if (activeTab === 'manage') {
      loadForms();
    }
  }, [activeTab]);

  const loadVehicles = async () => {
    try {
      const q = query(collection(db, 'vehicles'), orderBy('plate'));
      const querySnapshot = await getDocs(q);
      const vehiclesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Vehicle));
      setVehicles(vehiclesData);
    } catch (error) {
      console.error('Error loading vehicles:', error);
      alert('Erro ao carregar veículos. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  const loadForms = async () => {
    setLoadingForms(true);
    try {
      const q = query(collection(db, 'tire_inspection_forms'), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      const formsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as TireInspectionForm));
      setForms(formsData);
    } catch (error) {
      console.error('Error loading forms:', error);
    } finally {
      setLoadingForms(false);
    }
  };

  const handleVehicleSelect = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    setSelectedVehicle(vehicle || null);

    if (vehicle?.coupled_vehicle_id) {
      const coupled = vehicles.find(v => v.id === vehicle.coupled_vehicle_id);
      setCoupledVehicle(coupled || null);
    } else {
      setCoupledVehicle(null);
    }
  };

  const handleGenerateSheet = () => {
    if (selectedVehicle) {
      setShowPrintView(true);
    }
  };

  const handleGenerateLink = async () => {
    if (!selectedVehicle || !driverName.trim()) {
      alert('Por favor, preencha o veículo e o nome do responsável');
      return;
    }

    setGeneratingLink(true);
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48);

      const token = crypto.randomUUID();

      await addDoc(collection(db, 'tire_inspection_forms'), {
        vehicle_id: selectedVehicle.id,
        driver_name: driverName,
        driver_cpf: driverCpf,
        status: 'pending',
        token: token,
        expires_at: expiresAt.toISOString(),
        completed_at: null,
        created_at: new Date().toISOString(),
      });

      const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
      const link = `${appUrl}/tire-inspection/${token}`;
      setGeneratedLink(link);

      setDriverName('');
      setDriverCpf('');
      setSelectedVehicle(null);
      setCoupledVehicle(null);
    } catch (error) {
      console.error('Error generating link:', error);
      alert('Erro ao gerar link. Tente novamente.');
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleCopyLink = async () => {
    if (!generatedLink) return;

    await navigator.clipboard.writeText(generatedLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleClosePrintView = () => {
    setShowPrintView(false);
  };

  const handleDeleteForm = async (formId: string) => {
    if (deleteConfirm !== formId) {
      setDeleteConfirm(formId);
      return;
    }

    setDeletingFormId(formId);
    try {
      const q = query(collection(db, 'tire_inspection_responses'), where('form_id', '==', formId));
      const responsesSnapshot = await getDocs(q);

      for (const responseDoc of responsesSnapshot.docs) {
        await deleteDoc(doc(db, 'tire_inspection_responses', responseDoc.id));
      }

      await deleteDoc(doc(db, 'tire_inspection_forms', formId));

      setForms(forms.filter(f => f.id !== formId));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting form:', error);
      alert('Erro ao deletar ficha. Tente novamente.');
    } finally {
      setDeletingFormId(null);
    }
  };

  const handleCopyFormLink = async (token: string, formId: string) => {
    const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    const link = `${appUrl}/tire-inspection/${token}`;

    await navigator.clipboard.writeText(link);
    setCopiedFormLink(formId);
    setTimeout(() => setCopiedFormLink(null), 2000);
  };

  const getStatusBadge = (status: string, expiresAt: string) => {
    const isExpired = new Date(expiresAt) < new Date();

    if (isExpired && status === 'pending') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Expirado
        </span>
      );
    }

    if (status === 'completed') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Preenchido
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        Pendente
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (showPrintView && selectedVehicle) {
    return (
      <PrintableTireSheet
        vehicle={selectedVehicle}
        coupledVehicle={coupledVehicle}
        onClose={handleClosePrintView}
        onPrint={handlePrint}
      />
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Ficha de Inspeção de Pneus</h1>
        <p className="text-slate-600 mt-2">Gere fichas para inspeção dos pneus</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('generate')}
              className={`flex-1 px-6 py-4 font-medium flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'generate'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LinkIcon className="h-5 w-5" />
              Gerar Link
            </button>
            <button
              onClick={() => setActiveTab('manage')}
              className={`flex-1 px-6 py-4 font-medium flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'manage'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="h-5 w-5" />
              Gerenciar Fichas
            </button>
            <button
              onClick={() => setActiveTab('generate')}
              className={`flex-1 px-6 py-4 font-medium flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'generate' && driverName === ''
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              style={{ display: 'none' }}
            >
              <Printer className="h-5 w-5" />
              PDF
            </button>
          </div>
        </div>

        <div className="p-8">
          {activeTab === 'generate' ? (
            <div className="max-w-2xl mx-auto">
              {generatedLink ? (
                <div className="mb-8 p-6 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-start gap-4">
                    <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-green-900 mb-2">
                        Link Gerado com Sucesso!
                      </h3>
                      <p className="text-sm text-green-800 mb-4">
                        Este link expira em 48 horas. Compartilhe-o com o motorista para que ele preencha a ficha.
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={generatedLink}
                          readOnly
                          className="flex-1 px-3 py-2 bg-white border border-green-300 rounded-lg text-sm font-mono text-green-900"
                        />
                        <button
                          onClick={handleCopyLink}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                            copiedLink
                              ? 'bg-green-600 text-white'
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          <Copy className="h-4 w-4" />
                          {copiedLink ? 'Copiado!' : 'Copiar'}
                        </button>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setGeneratedLink(null)}
                    className="w-full mt-4 px-4 py-2 bg-slate-100 text-slate-900 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                  >
                    Gerar Novo Link
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Selecione o Veículo
                    </label>
                    <select
                      value={selectedVehicle?.id || ''}
                      onChange={(e) => handleVehicleSelect(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                    >
                      <option value="">Escolha um veículo</option>
                      {vehicles.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {vehicle.plate} - {vehicle.brand} {vehicle.model} ({vehicle.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedVehicle && (
                    <div className="bg-slate-50 rounded-lg p-6 mb-6">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4">
                        Informações do Veículo
                      </h3>
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                          <span className="text-sm text-slate-600">Placa:</span>
                          <p className="font-medium text-slate-900">{selectedVehicle.plate}</p>
                        </div>
                        <div>
                          <span className="text-sm text-slate-600">Tipo:</span>
                          <p className="font-medium text-slate-900">{selectedVehicle.type}</p>
                        </div>
                        <div>
                          <span className="text-sm text-slate-600">Marca/Modelo:</span>
                          <p className="font-medium text-slate-900">
                            {selectedVehicle.brand} {selectedVehicle.model}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm text-slate-600">Ano:</span>
                          <p className="font-medium text-slate-900">{selectedVehicle.year}</p>
                        </div>
                        {coupledVehicle && (
                          <div className="col-span-2">
                            <span className="text-sm text-slate-600">Veículo Acoplado:</span>
                            <p className="font-medium text-slate-900">
                              {coupledVehicle.plate} - {coupledVehicle.type}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="border-t border-slate-300 pt-6 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Responsável
                          </label>
                          <input
                            type="text"
                            value={driverName}
                            onChange={(e) => setDriverName(e.target.value)}
                            placeholder="Ex: João Silva"
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            CPF <span className="text-slate-500 text-xs">(opcional)</span>
                          </label>
                          <input
                            type="text"
                            value={driverCpf}
                            onChange={(e) => setDriverCpf(e.target.value)}
                            placeholder="Ex: 123.456.789-00"
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-center space-x-4">
                    <button
                      onClick={handleGenerateLink}
                      disabled={!selectedVehicle || !driverName.trim() || generatingLink}
                      className={`inline-flex items-center px-6 py-3 rounded-lg font-medium transition-colors ${
                        selectedVehicle && driverName.trim()
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <LinkIcon className="h-5 w-5 mr-2" />
                      {generatingLink ? 'Gerando...' : 'Gerar Link'}
                    </button>
                    <button
                      onClick={handleGenerateSheet}
                      disabled={!selectedVehicle}
                      className={`inline-flex items-center px-6 py-3 rounded-lg font-medium transition-colors ${
                        selectedVehicle
                          ? 'bg-slate-600 text-white hover:bg-slate-700'
                          : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <FileText className="h-5 w-5 mr-2" />
                      Gerar PDF
                    </button>
                  </div>

                  <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-900 mb-2">Como funciona</h4>
                    <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                      <li>Selecione o veículo e informe os dados do motorista</li>
                      <li>Clique em "Gerar Link" para criar um link único</li>
                      <li>Compartilhe o link com o motorista (via WhatsApp, email, etc)</li>
                      <li>O motorista preenche a ficha clicando nos pneus do diagrama</li>
                      <li>Você recebe a ficha preenchida automaticamente no sistema</li>
                    </ol>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Fichas Geradas</h3>

              {loadingForms ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : forms.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">Nenhuma ficha gerada ainda</p>
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
                          Responsável
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                          Criada em
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                          Expira em
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {forms.map((form) => (
                        <tr key={form.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm text-slate-900">
                            {vehicles.find((v) => v.id === form.vehicle_id)?.plate || form.vehicle_id}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {form.driver_name}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {getStatusBadge(form.status, form.expires_at)}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {new Date(form.created_at).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {new Date(form.expires_at).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex gap-2">
                              {form.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleCopyFormLink(form.token, form.id)}
                                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg transition-colors ${
                                      copiedFormLink === form.id
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                    }`}
                                  >
                                    <Copy className="h-4 w-4" />
                                    {copiedFormLink === form.id ? 'Copiado!' : 'Copiar Link'}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteForm(form.id)}
                                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg transition-colors ${
                                      deleteConfirm === form.id
                                        ? 'bg-red-200 text-red-800 hover:bg-red-300'
                                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                                    }`}
                                    disabled={deletingFormId === form.id}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    {deleteConfirm === form.id ? 'Confirmar?' : 'Deletar'}
                                  </button>
                                </>
                              )}
                              {form.status === 'completed' && (
                                <>
                                  <button
                                    onClick={() => setSelectedForm(form)}
                                    className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                                  >
                                    <Eye className="h-4 w-4" />
                                    Ver
                                  </button>
                                  <button
                                    onClick={() => handleDeleteForm(form.id)}
                                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg transition-colors ${
                                      deleteConfirm === form.id
                                        ? 'bg-red-200 text-red-800 hover:bg-red-300'
                                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                                    }`}
                                    disabled={deletingFormId === form.id}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    {deleteConfirm === form.id ? 'Confirmar?' : 'Deletar'}
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {selectedForm && (
        <TireInspectionViewer
          form={selectedForm}
          onClose={() => setSelectedForm(null)}
        />
      )}
    </div>
  );
}
