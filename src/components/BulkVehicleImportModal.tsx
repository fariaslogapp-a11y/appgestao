import { useState } from 'react';
import { X, AlertCircle, CheckCircle2, Upload } from 'lucide-react';

import type { Vehicle } from '../types';

interface ImportedVehicle {
  plate: string;
  type: string;
  model: string;
  year: string;
  equipment: string;
  rowIndex: number;
}

interface ImportPreview extends ImportedVehicle {
  status: 'valid' | 'warning' | 'error';
  message: string;
  parsedYear?: number;
  parsedType?: string;
}

interface BulkVehicleImportModalProps {
  onClose: () => void;
  onImport: (vehicles: Array<Omit<Vehicle, 'id' | 'created_at'>>) => Promise<void>;
}

export default function BulkVehicleImportModal({
  onClose,
  onImport,
}: BulkVehicleImportModalProps) {
  const [pastedData, setPastedData] = useState('');
  const [hasHeader, setHasHeader] = useState(false);
  const [preview, setPreview] = useState<ImportPreview[]>([]);
  const [importing, setImporting] = useState(false);

  const parseTabularData = (data: string): ImportedVehicle[] => {
    const lines = data.trim().split('\n');
    if (lines.length === 0) return [];

    const startIndex = hasHeader ? 1 : 0;
    const vehicles: ImportedVehicle[] = [];

    for (let i = startIndex; i < lines.length; i++) {
      const parts = lines[i].split('\t').map(p => p.trim());

      if (parts.length >= 5) {
        vehicles.push({
          plate: parts[0],
          type: parts[1],
          model: parts[2],
          year: parts[3],
          equipment: parts[4],
          rowIndex: i + 1,
        });
      }
    }

    return vehicles;
  };

  const normalizeType = (type: string): string | null => {
    const typeMap: Record<string, string> = {
      'carro': 'carro',
      '3/4': '3/4',
      'toco': 'toco',
      'truck': 'truck',
      'bitruck': 'bitruck',
      'cavalo': 'cavalo',
      'carreta': 'carreta',
    };

    const normalized = type.toLowerCase().trim();
    return typeMap[normalized] || null;
  };

  const validateVehicles = (vehicles: ImportedVehicle[]): ImportPreview[] => {
    return vehicles.map(vehicle => {
      const errors: string[] = [];
      const warnings: string[] = [];

      if (!vehicle.plate?.trim()) {
        errors.push('Placa vazia');
      }

      const normalizedType = normalizeType(vehicle.type);
      if (!normalizedType) {
        errors.push('Tipo inválido (deve ser: carro, 3/4, toco, truck, bitruck, cavalo ou carreta)');
      }

      if (!vehicle.model?.trim()) {
        errors.push('Modelo vazio');
      }

      const year = parseInt(vehicle.year);
      if (!year || year < 1900 || year > new Date().getFullYear() + 1) {
        errors.push('Ano inválido');
      }

      if (errors.length > 0) {
        return {
          ...vehicle,
          status: 'error',
          message: errors.join(', '),
        };
      }

      if (warnings.length > 0) {
        return {
          ...vehicle,
          status: 'warning',
          message: warnings.join(', '),
          parsedYear: year,
          parsedType: normalizedType,
        };
      }

      return {
        ...vehicle,
        status: 'valid',
        message: '',
        parsedYear: year,
        parsedType: normalizedType,
      };
    });
  };

  const handlePaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const data = e.target.value;
    setPastedData(data);

    if (data.trim()) {
      const parsed = parseTabularData(data);
      const validated = validateVehicles(parsed);
      setPreview(validated);
    } else {
      setPreview([]);
    }
  };

  const handleImport = async () => {
    const validVehicles = preview.filter(p => p.status !== 'error');

    if (validVehicles.length === 0) {
      alert('Nenhum veículo válido para importar');
      return;
    }

    const vehiclesToCreate: Array<Omit<Vehicle, 'id' | 'created_at'>> = validVehicles.map(vehicle => {
      const [brand, ...modelParts] = vehicle.model.split(' ');
      const model = modelParts.join(' ');

      return {
        plate: vehicle.plate,
        type: vehicle.parsedType as any,
        brand: brand || vehicle.model,
        model: model || '',
        year: vehicle.parsedYear || new Date().getFullYear(),
        current_km: 0,
        is_refrigerated: true,
        status: 'active',
        notes: vehicle.equipment || '',
        coupled_vehicle_id: null,
      };
    });

    try {
      setImporting(true);
      await onImport(vehiclesToCreate);
      alert(`${validVehicles.length} veículo(s) importado(s) com sucesso!`);
      onClose();
    } catch (error) {
      console.error('Error importing vehicles:', error);
      alert('Erro ao importar veículos. Por favor, tente novamente.');
    } finally {
      setImporting(false);
    }
  };

  const validCount = preview.filter(p => p.status === 'valid' || p.status === 'warning').length;
  const errorCount = preview.filter(p => p.status === 'error').length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Veículos em Lote
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Instruções:</h3>
            <ol className="text-sm text-blue-800 space-y-1 ml-4 list-decimal">
              <li>Copie os dados tabulados do Excel (PLACA, PORTE, MODELO, ANO, EQUIPAMENTO)</li>
              <li>Cole no campo abaixo</li>
              <li>Indique se o cabeçalho está incluído</li>
              <li>Revise o resumo de importação</li>
              <li>Clique em "Importar" para adicionar os veículos</li>
            </ol>
            <div className="mt-3 p-2 bg-blue-100 rounded text-xs">
              <p className="font-semibold mb-1">Formato esperado:</p>
              <p>PLACA: Placa do veículo</p>
              <p>PORTE (TIPO): carro, 3/4, toco, truck, bitruck, cavalo ou carreta</p>
              <p>MODELO: Marca e modelo (ex: VW 11.180)</p>
              <p>ANO: Ano do veículo</p>
              <p>EQUIPAMENTO: Será salvo em Observações</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasHeader}
                onChange={(e) => {
                  setHasHeader(e.target.checked);
                  if (pastedData.trim()) {
                    const parsed = parseTabularData(pastedData);
                    const validated = validateVehicles(parsed);
                    setPreview(validated);
                  }
                }}
                className="w-4 h-4 rounded border-slate-300"
              />
              <span className="text-sm font-medium text-slate-700">
                Incluir cabeçalho (primeira linha)
              </span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Cole os dados aqui:
            </label>
            <textarea
              value={pastedData}
              onChange={handlePaste}
              placeholder="PLACA	PORTE	MODELO	ANO	EQUIPAMENTO&#10;QJV2E29	3/4	VW 11.180	2019	TK V-500&#10;..."
              rows={6}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
          </div>

          {preview.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Resumo da Importação</h3>
                <div className="flex gap-3 text-sm">
                  {validCount > 0 && (
                    <div className="flex items-center gap-1 text-green-700">
                      <CheckCircle2 className="h-4 w-4" />
                      {validCount} válido(s)
                    </div>
                  )}
                  {errorCount > 0 && (
                    <div className="flex items-center gap-1 text-red-700">
                      <AlertCircle className="h-4 w-4" />
                      {errorCount} erro(s)
                    </div>
                  )}
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-slate-700">Status</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-700">Placa</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-700">Tipo</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-700">Modelo</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-700">Ano</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-700">Equipamento</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-700">Mensagem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((vehicle, index) => (
                        <tr key={index} className="border-t border-slate-200 hover:bg-slate-50">
                          <td className="px-3 py-2">
                            {vehicle.status === 'valid' && (
                              <div className="flex items-center gap-1 text-green-700">
                                <CheckCircle2 className="h-4 w-4" />
                              </div>
                            )}
                            {vehicle.status === 'warning' && (
                              <div className="flex items-center gap-1 text-yellow-700">
                                <AlertCircle className="h-4 w-4" />
                              </div>
                            )}
                            {vehicle.status === 'error' && (
                              <div className="flex items-center gap-1 text-red-700">
                                <AlertCircle className="h-4 w-4" />
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 font-medium text-slate-900">{vehicle.plate}</td>
                          <td className="px-3 py-2 text-slate-600">
                            {vehicle.parsedType || vehicle.type}
                          </td>
                          <td className="px-3 py-2 text-slate-600">{vehicle.model}</td>
                          <td className="px-3 py-2 text-slate-600">{vehicle.year}</td>
                          <td className="px-3 py-2 text-slate-600">{vehicle.equipment || '-'}</td>
                          <td className="px-3 py-2 text-xs">
                            {vehicle.message && (
                              <span className={`inline-block px-2 py-1 rounded ${
                                vehicle.status === 'error'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {vehicle.message}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {errorCount > 0 && (
                <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                  Veículos com erro serão ignorados na importação. Apenas os veículos válidos serão importados. Todos serão cadastrados como ativos.
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleImport}
              disabled={validCount === 0 || importing}
              className={`px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-2 ${
                validCount === 0 || importing
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {importing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Importar ({validCount})
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
