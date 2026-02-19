import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, getDocs, addDoc, updateDoc, doc, query, where } from 'firebase/firestore';
import type { Vehicle, TireInspectionForm, TireInspectionResponse } from '../types';

export default function TireInspectionFormPage() {
  const { token } = useParams<{ token: string }>();

  const [form, setForm] = useState<TireInspectionForm | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [coupledVehicle, setCoupledVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'verify' | 'form' | 'success'>('verify');
  const [driverName, setDriverName] = useState('');
  const [driverCpf, setDriverCpf] = useState('');
  const [verifyError, setVerifyError] = useState('');

  const [selectedVehicleType, setSelectedVehicleType] = useState<'main' | 'coupled'>('main');
  const [selectedTire, setSelectedTire] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<string, any>>({});

  useEffect(() => {
    loadForm();
  }, [token]);

  const loadForm = async () => {
    try {
      if (!token) {
        setError('Token inválido');
        setStep('verify');
        setLoading(false);
        return;
      }

      const q = query(collection(db, 'tire_inspection_forms'), where('token', '==', token));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError('Ficha não encontrada ou link expirado');
        setStep('verify');
        setLoading(false);
        return;
      }

      const formDoc = querySnapshot.docs[0];
      const formData = { id: formDoc.id, ...formDoc.data() } as TireInspectionForm;

      if (new Date(formData.expires_at) < new Date()) {
        setError('Este link expirou. Por favor, solicite uma nova ficha ao gerenciador.');
        setStep('verify');
        setLoading(false);
        return;
      }

      if (formData.status === 'completed') {
        setError('Esta ficha já foi preenchida');
        setStep('success');
        setLoading(false);
        return;
      }

      setForm(formData);
      setDriverName(formData.driver_name);
      setDriverCpf(formData.driver_cpf);

      const vehicleQuery = query(collection(db, 'vehicles'));
      const vehiclesSnapshot = await getDocs(vehicleQuery);
      const vehicles = vehiclesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));

      const vehicleData = vehicles.find(v => v.id === formData.vehicle_id);
      if (vehicleData) {
        setVehicle(vehicleData);

        if (vehicleData.coupled_vehicle_id) {
          const coupledData = vehicles.find(v => v.id === vehicleData.coupled_vehicle_id);
          if (coupledData) {
            setCoupledVehicle(coupledData);
          }
        }
      }

      const responsesQuery = query(collection(db, 'tire_inspection_responses'), where('form_id', '==', formData.id));
      const responsesSnapshot = await getDocs(responsesQuery);

      if (!responsesSnapshot.empty) {
        const resp: Record<string, any> = {};
        responsesSnapshot.docs.forEach((doc) => {
          const r = doc.data() as TireInspectionResponse;
          resp[r.tire_position] = {
            tire_brand: r.tire_brand,
            tire_size: r.tire_size,
            groove_depth: r.groove_depth,
            is_retreaded: r.is_retreaded,
            notes: r.notes,
          };
        });
        setResponses(resp);
      }

      setStep('form');
    } catch (err) {
      console.error('Error loading form:', err);
      setError('Erro ao carregar a ficha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError('');

    if (!driverName.trim()) {
      setVerifyError('Nome é obrigatório');
      return;
    }

    if (driverName.trim().toLowerCase() !== form?.driver_name.toLowerCase()) {
      setVerifyError('Nome não corresponde ao registrado');
      return;
    }

    if (driverCpf.trim()) {
      const cleanCpf = driverCpf.replace(/\D/g, '');
      const formCpf = form?.driver_cpf.replace(/\D/g, '');

      if (cleanCpf !== formCpf) {
        setVerifyError('CPF não corresponde ao registrado');
        return;
      }
    }

    setStep('form');
  };

  const getTirePositions = (vehicleType: string) => {
    const tireMap: Record<string, Array<{ id: string; label: string; x: number; y: number }>> = {
      '3/4': [
        { id: 'PDE1', label: 'Pneu Dianteiro Esquerdo', x: 20, y: 15 },
        { id: 'PDD1', label: 'Pneu Dianteiro Direito', x: 80, y: 15 },
        { id: 'TTE1', label: 'Pneu Traseiro Esquerdo Externo', x: 15, y: 70 },
        { id: 'TTI1', label: 'Pneu Traseiro Esquerdo Interno', x: 25, y: 75 },
        { id: 'TTE2', label: 'Pneu Traseiro Direito Externo', x: 75, y: 70 },
        { id: 'TTI2', label: 'Pneu Traseiro Direito Interno', x: 85, y: 75 },
      ],
      toco: [
        { id: 'PDE1', label: 'Pneu Dianteiro Esquerdo', x: 20, y: 15 },
        { id: 'PDD1', label: 'Pneu Dianteiro Direito', x: 80, y: 15 },
        { id: 'TTE1', label: 'Pneu Traseiro Esquerdo Externo', x: 15, y: 70 },
        { id: 'TTI1', label: 'Pneu Traseiro Esquerdo Interno', x: 25, y: 75 },
        { id: 'TTE2', label: 'Pneu Traseiro Direito Externo', x: 75, y: 70 },
        { id: 'TTI2', label: 'Pneu Traseiro Direito Interno', x: 85, y: 75 },
      ],
      truck: [
        { id: 'PDE1', label: 'Pneu Dianteiro Esquerdo', x: 20, y: 10 },
        { id: 'PDD1', label: 'Pneu Dianteiro Direito', x: 80, y: 10 },
        { id: 'T1E1', label: 'Pneu Traseiro 1 Esquerdo Externo', x: 15, y: 40 },
        { id: 'T1I1', label: 'Pneu Traseiro 1 Esquerdo Interno', x: 25, y: 45 },
        { id: 'T1E2', label: 'Pneu Traseiro 1 Direito Externo', x: 75, y: 40 },
        { id: 'T1I2', label: 'Pneu Traseiro 1 Direito Interno', x: 85, y: 45 },
        { id: 'T2E1', label: 'Pneu Traseiro 2 Esquerdo Externo', x: 15, y: 70 },
        { id: 'T2I1', label: 'Pneu Traseiro 2 Esquerdo Interno', x: 25, y: 75 },
        { id: 'T2E2', label: 'Pneu Traseiro 2 Direito Externo', x: 75, y: 70 },
        { id: 'T2I2', label: 'Pneu Traseiro 2 Direito Interno', x: 85, y: 75 },
      ],
      bitruck: [
        { id: 'PDE1', label: 'Pneu Dianteiro 1 Esquerdo', x: 20, y: 8 },
        { id: 'PDD1', label: 'Pneu Dianteiro 1 Direito', x: 80, y: 8 },
        { id: 'PDE2', label: 'Pneu Dianteiro 2 Esquerdo', x: 20, y: 18 },
        { id: 'PDD2', label: 'Pneu Dianteiro 2 Direito', x: 80, y: 18 },
        { id: 'T1E1', label: 'Pneu Traseiro 1 Esquerdo Externo', x: 15, y: 40 },
        { id: 'T1I1', label: 'Pneu Traseiro 1 Esquerdo Interno', x: 25, y: 45 },
        { id: 'T1E2', label: 'Pneu Traseiro 1 Direito Externo', x: 75, y: 40 },
        { id: 'T1I2', label: 'Pneu Traseiro 1 Direito Interno', x: 85, y: 45 },
        { id: 'T2E1', label: 'Pneu Traseiro 2 Esquerdo Externo', x: 15, y: 70 },
        { id: 'T2I1', label: 'Pneu Traseiro 2 Esquerdo Interno', x: 25, y: 75 },
        { id: 'T2E2', label: 'Pneu Traseiro 2 Direito Externo', x: 75, y: 70 },
        { id: 'T2I2', label: 'Pneu Traseiro 2 Direito Interno', x: 85, y: 75 },
      ],
      cavalo: [
        { id: 'PDE1', label: 'Pneu Dianteiro Esquerdo', x: 20, y: 10 },
        { id: 'PDD1', label: 'Pneu Dianteiro Direito', x: 80, y: 10 },
        { id: 'T1E1', label: 'Pneu Traseiro 1 Esquerdo Externo', x: 15, y: 40 },
        { id: 'T1I1', label: 'Pneu Traseiro 1 Esquerdo Interno', x: 25, y: 45 },
        { id: 'T1E2', label: 'Pneu Traseiro 1 Direito Externo', x: 75, y: 40 },
        { id: 'T1I2', label: 'Pneu Traseiro 1 Direito Interno', x: 85, y: 45 },
        { id: 'T2E1', label: 'Pneu Traseiro 2 Esquerdo Externo', x: 15, y: 70 },
        { id: 'T2I1', label: 'Pneu Traseiro 2 Esquerdo Interno', x: 25, y: 75 },
        { id: 'T2E2', label: 'Pneu Traseiro 2 Direito Externo', x: 75, y: 70 },
        { id: 'T2I2', label: 'Pneu Traseiro 2 Direito Interno', x: 85, y: 75 },
      ],
      carreta: [
        { id: 'T1E1', label: 'Eixo 1 Esquerdo Externo', x: 15, y: 20 },
        { id: 'T1I1', label: 'Eixo 1 Esquerdo Interno', x: 25, y: 25 },
        { id: 'T1E2', label: 'Eixo 1 Direito Externo', x: 75, y: 20 },
        { id: 'T1I2', label: 'Eixo 1 Direito Interno', x: 85, y: 25 },
        { id: 'T2E1', label: 'Eixo 2 Esquerdo Externo', x: 15, y: 45 },
        { id: 'T2I1', label: 'Eixo 2 Esquerdo Interno', x: 25, y: 50 },
        { id: 'T2E2', label: 'Eixo 2 Direito Externo', x: 75, y: 45 },
        { id: 'T2I2', label: 'Eixo 2 Direito Interno', x: 85, y: 50 },
        { id: 'T3E1', label: 'Eixo 3 Esquerdo Externo', x: 15, y: 70 },
        { id: 'T3I1', label: 'Eixo 3 Esquerdo Interno', x: 25, y: 75 },
        { id: 'T3E2', label: 'Eixo 3 Direito Externo', x: 75, y: 70 },
        { id: 'T3I2', label: 'Eixo 3 Direito Interno', x: 85, y: 75 },
      ],
    };

    return tireMap[vehicleType] || [];
  };

  const currentVehicle = selectedVehicleType === 'main' ? vehicle : coupledVehicle;
  const tirePositions = currentVehicle ? getTirePositions(currentVehicle.type) : [];

  const isTireFilled = (tireId: string) => {
    return responses[tireId] && responses[tireId].tire_brand;
  };

  const handleTireSelect = (tireId: string) => {
    setSelectedTire(tireId);
  };

  const handleSaveTire = async (tireId: string, data: any) => {
    setResponses({
      ...responses,
      [tireId]: data,
    });
    setSelectedTire(null);
  };

  const handleSubmit = async () => {
    if (!form) return;

    const allFilled = tirePositions.every((pos) => isTireFilled(pos.id));
    if (!allFilled) {
      alert('Por favor, preencha todos os pneus antes de enviar.');
      return;
    }

    try {
      for (const [tireId, data] of Object.entries(responses)) {
        await addDoc(collection(db, 'tire_inspection_responses'), {
          form_id: form.id,
          tire_position: tireId,
          tire_brand: data.tire_brand,
          tire_size: data.tire_size,
          groove_depth: data.groove_depth,
          is_retreaded: data.is_retreaded,
          notes: data.notes,
          created_at: new Date().toISOString(),
        });
      }

      const q = query(collection(db, 'tire_inspection_forms'), where('token', '==', token));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const formDocRef = doc(db, 'tire_inspection_forms', querySnapshot.docs[0].id);
        await updateDoc(formDocRef, {
          status: 'completed',
          completed_at: new Date().toISOString(),
        });
      }

      setStep('success');
    } catch (err) {
      console.error('Error submitting form:', err);
      alert('Erro ao enviar formulário. Tente novamente.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && step === 'verify') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-8">
          <div className="flex items-center justify-center mb-4">
            <AlertCircle className="h-12 w-12 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-center text-slate-900 mb-2">
            Link Inválido
          </h1>
          <p className="text-center text-slate-600">{error}</p>
          <p className="text-center text-slate-500 text-sm mt-4">
            Por favor, entre em contato com o gerenciador da frota para solicitar um novo link.
          </p>
        </div>
      </div>
    );
  }

  if (step === 'verify') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Ficha de Inspeção de Pneus
          </h1>
          <p className="text-slate-600 mb-6">
            Informe seus dados para começar
          </p>

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Responsável
              </label>
              <input
                type="text"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                disabled={!!form}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                CPF <span className="text-slate-500 text-xs">(opcional)</span>
              </label>
              <input
                type="text"
                value={driverCpf}
                onChange={(e) => setDriverCpf(e.target.value)}
                disabled={!!form}
                placeholder="000.000.000-00"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100"
              />
            </div>

            {verifyError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {verifyError}
              </div>
            )}

            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Continuar
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-8">
          <div className="flex items-center justify-center mb-6">
            <CheckCircle2 className="h-16 w-16 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-center text-slate-900 mb-3">
            Ficha Enviada com Sucesso!
          </h1>
          <p className="text-center text-slate-600 mb-4">
            Suas respostas foram registradas e enviadas ao gerenciador da frota.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <p className="text-center text-green-800 font-medium">
              Obrigado por preencher a ficha de inspeção!
            </p>
          </div>
          <p className="text-center text-slate-500 text-sm">
            Você pode fechar esta janela agora.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Ficha de Inspeção de Pneus
          </h1>
          <p className="text-slate-600">
            Clique nos pneus para preencher as informações
          </p>
        </div>

        {vehicle && (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    {selectedVehicleType === 'main' ? vehicle.plate : coupledVehicle?.plate}
                  </h3>

                  <div className="bg-slate-50 p-4 rounded-lg mb-6">
                    <svg
                      viewBox="0 0 100 100"
                      className="w-full h-auto mb-6"
                      style={{ maxHeight: '300px' }}
                    >
                      <rect
                        x="15"
                        y="10"
                        width="70"
                        height="80"
                        fill="none"
                        stroke="#1e293b"
                        strokeWidth="2"
                        rx="5"
                      />

                      {tirePositions.map((tire) => {
                        const isFilled = isTireFilled(tire.id);
                        const isSelected = selectedTire === tire.id;

                        return (
                          <circle
                            key={tire.id}
                            cx={tire.x}
                            cy={tire.y}
                            r="5"
                            fill={
                              isSelected
                                ? '#2563eb'
                                : isFilled
                                ? '#10b981'
                                : '#cbd5e1'
                            }
                            stroke={isSelected ? '#1e40af' : '#64748b'}
                            strokeWidth="1"
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleTireSelect(tire.id)}
                          />
                        );
                      })}
                    </svg>

                    <div className="flex gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-slate-400 rounded-full"></div>
                        <span className="text-sm text-slate-600">Não preenchido</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-600 rounded-full"></div>
                        <span className="text-sm text-slate-600">Preenchido</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-blue-600 rounded-full"></div>
                        <span className="text-sm text-slate-600">Selecionado</span>
                      </div>
                    </div>
                  </div>

                  {selectedVehicleType === 'main' && coupledVehicle && (
                    <button
                      onClick={() => {
                        setSelectedVehicleType('coupled');
                        setSelectedTire(null);
                      }}
                      className="w-full px-4 py-2 bg-slate-100 text-slate-900 rounded-lg hover:bg-slate-200 transition-colors font-medium flex items-center justify-center gap-2"
                    >
                      Ver Veículo Acoplado
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  )}

                  {selectedVehicleType === 'coupled' && coupledVehicle && (
                    <button
                      onClick={() => {
                        setSelectedVehicleType('main');
                        setSelectedTire(null);
                      }}
                      className="w-full px-4 py-2 bg-slate-100 text-slate-900 rounded-lg hover:bg-slate-200 transition-colors font-medium flex items-center justify-center gap-2"
                    >
                      Voltar para Veículo Principal
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div>
              {selectedTire ? (
                <TireForm
                  tireId={selectedTire}
                  tireLabel={tirePositions.find((t) => t.id === selectedTire)?.label || ''}
                  initialData={responses[selectedTire] || {}}
                  onSave={(data) => handleSaveTire(selectedTire, data)}
                  onCancel={() => setSelectedTire(null)}
                />
              ) : (
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 sticky top-8">
                  <h3 className="font-semibold text-slate-900 mb-4">Progresso</h3>
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-600">Preenchimento</span>
                      <span className="text-sm font-semibold text-slate-900">
                        {Math.round((Object.values(responses).filter((r: any) => r.tire_brand).length / tirePositions.length) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{
                          width: `${(Object.values(responses).filter((r: any) => r.tire_brand).length / tirePositions.length) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="mb-6 max-h-96 overflow-y-auto">
                    <h4 className="text-sm font-medium text-slate-700 mb-3">Pneus</h4>
                    <div className="space-y-2">
                      {tirePositions.map((tire) => (
                        <button
                          key={tire.id}
                          onClick={() => handleTireSelect(tire.id)}
                          className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm ${
                            isTireFilled(tire.id)
                              ? 'bg-green-50 text-green-900 border border-green-200'
                              : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{tire.id}</span>
                            {isTireFilled(tire.id) && (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                          <div className="text-xs opacity-75">{tire.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={!tirePositions.every((pos) => isTireFilled(pos.id))}
                    className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${
                      tirePositions.every((pos) => isTireFilled(pos.id))
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    Enviar Ficha
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TireForm({
  tireId,
  tireLabel,
  initialData,
  onSave,
  onCancel,
}: {
  tireId: string;
  tireLabel: string;
  initialData: any;
  onSave: (data: any) => void;
  onCancel: () => void;
}) {
  const [data, setData] = useState({
    tire_brand: initialData.tire_brand || '',
    tire_size: initialData.tire_size || '',
    groove_depth: initialData.groove_depth || '',
    is_retreaded: initialData.is_retreaded || false,
    notes: initialData.notes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.tire_brand.trim()) {
      alert('Por favor, preencha o nome do pneu');
      return;
    }
    onSave(data);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 sticky top-8">
      <h3 className="font-semibold text-slate-900 mb-2">{tireId}</h3>
      <p className="text-sm text-slate-600 mb-4">{tireLabel}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Marca do Pneu
          </label>
          <input
            type="text"
            value={data.tire_brand}
            onChange={(e) => setData({ ...data, tire_brand: e.target.value })}
            placeholder="Ex: Michelin, Pirelli, etc"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Medida do Pneu
          </label>
          <input
            type="text"
            value={data.tire_size}
            onChange={(e) => setData({ ...data, tire_size: e.target.value })}
            placeholder="Ex: 295/80R22.5"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Profundidade do Sulco (mm)
          </label>
          <input
            type="text"
            value={data.groove_depth}
            onChange={(e) => setData({ ...data, groove_depth: e.target.value })}
            placeholder="Ex: 8, 5.5, etc"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="retreaded"
            checked={data.is_retreaded}
            onChange={(e) => setData({ ...data, is_retreaded: e.target.checked })}
            className="w-4 h-4 rounded border-slate-300"
          />
          <label htmlFor="retreaded" className="text-sm font-medium text-slate-700">
            Pneu Recapado?
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Observações
          </label>
          <textarea
            value={data.notes}
            onChange={(e) => setData({ ...data, notes: e.target.value })}
            placeholder="Observações adicionais..."
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            Salvar Pneu
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-slate-200 text-slate-900 rounded-lg hover:bg-slate-300 transition-colors font-medium text-sm"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
