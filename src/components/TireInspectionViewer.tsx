import { useState, useEffect } from 'react';
import { X, Eye } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import type { TireInspectionForm, TireInspectionResponse } from '../types';

interface Props {
  form: TireInspectionForm;
  onClose: () => void;
}

export default function TireInspectionViewer({ form, onClose }: Props) {
  const [responses, setResponses] = useState<TireInspectionResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResponses();
  }, [form.id]);

  const loadResponses = async () => {
    try {
      const q = query(collection(db, 'tire_inspection_responses'), where('form_id', '==', form.id));
      const querySnapshot = await getDocs(q);
      const responsesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as TireInspectionResponse));
      setResponses(responsesData);
    } catch (error) {
      console.error('Error loading responses:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTireCondition = (grooveDepth: string | null) => {
    if (!grooveDepth) return '';

    const depth = parseFloat(grooveDepth);
    if (depth > 10) return 'Novo';
    if (depth >= 5) return 'Meia Vida';
    return 'Trocar';
  };

  const getTireConditionColor = (grooveDepth: string | null) => {
    if (!grooveDepth) return 'text-slate-600';

    const depth = parseFloat(grooveDepth);
    if (depth > 10) return 'text-green-600';
    if (depth >= 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Ficha de Inspeção - {form.driver_name}
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Preenchida em {new Date(form.completed_at || '').toLocaleDateString('pt-BR')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="h-6 w-6 text-slate-600" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : responses.length === 0 ? (
            <div className="text-center py-12">
              <Eye className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">Nenhuma resposta encontrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                      Posição
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                      Marca
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                      Medida
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                      Sulco (mm)
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                      Condição
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                      Recapado
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                      Observações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {responses.map((response) => (
                    <tr key={response.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">
                        {response.tire_position}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {response.tire_brand || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {response.tire_size || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {response.groove_depth || '-'}
                      </td>
                      <td className={`px-4 py-3 text-sm font-medium ${getTireConditionColor(response.groove_depth)}`}>
                        {getTireCondition(response.groove_depth)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {response.is_retreaded ? 'Sim' : 'Não'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {response.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
