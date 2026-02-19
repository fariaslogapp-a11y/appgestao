import { useState } from 'react';
import { X, AlertCircle, CheckCircle2, Upload } from 'lucide-react';
import { getDateWithTimezoneOffset } from '../utils/dateUtils';

import type { Trip, Driver, Vehicle } from '../types';

interface ImportedTrip {
  plate: string;
  driverName: string;
  origin: string;
  destination: string;
  rowIndex: number;
}

interface ImportPreview extends ImportedTrip {
  vehicleId?: string;
  driverId?: string;
  status: 'valid' | 'warning' | 'error';
  message: string;
}

interface BulkTripImportModalProps {
  onClose: () => void;
  onImport: (trips: Array<Omit<Trip, 'id' | 'created_at'>>) => Promise<void>;
  drivers: Driver[];
  vehicles: Vehicle[];
}

export default function BulkTripImportModal({
  onClose,
  onImport,
  drivers,
  vehicles,
}: BulkTripImportModalProps) {
  const [pastedData, setPastedData] = useState('');
  const [hasHeader, setHasHeader] = useState(false);
  const [preview, setPreview] = useState<ImportPreview[]>([]);
  const [importing, setImporting] = useState(false);
  const [departureDate, setDepartureDate] = useState(getDateWithTimezoneOffset());

  const parseTabularData = (data: string): ImportedTrip[] => {
    const lines = data.trim().split('\n');
    if (lines.length === 0) return [];

    const startIndex = hasHeader ? 1 : 0;
    const trips: ImportedTrip[] = [];

    for (let i = startIndex; i < lines.length; i++) {
      const parts = lines[i].split('\t').map(p => p.trim());

      if (parts.length >= 4) {
        trips.push({
          plate: parts[0],
          driverName: parts[1],
          origin: parts[2],
          destination: parts[3],
          rowIndex: i + 1,
        });
      }
    }

    return trips;
  };

  const validateTrips = (trips: ImportedTrip[]): ImportPreview[] => {
    return trips.map(trip => {
      const vehicle = vehicles.find(
        v => v.plate.toUpperCase() === trip.plate.toUpperCase()
      );
      const driver = drivers.find(
        d => d.name.toUpperCase() === trip.driverName.toUpperCase()
      );

      const errors: string[] = [];
      const warnings: string[] = [];

      if (!vehicle) {
        warnings.push('Veículo não encontrado');
      }

      if (!driver) {
        warnings.push('Motorista não cadastrado');
      }

      if (!trip.origin?.trim()) {
        errors.push('Origem vazia');
      }

      if (!trip.destination?.trim()) {
        errors.push('Destino vazio');
      }

      if (errors.length > 0) {
        return {
          ...trip,
          vehicleId: vehicle?.id,
          driverId: driver?.id,
          status: 'error',
          message: errors.join(', '),
        };
      }

      if (warnings.length > 0) {
        return {
          ...trip,
          vehicleId: vehicle?.id,
          driverId: driver?.id,
          status: 'warning',
          message: warnings.join(', '),
        };
      }

      return {
        ...trip,
        vehicleId: vehicle?.id,
        driverId: driver?.id,
        status: 'valid',
        message: '',
      };
    });
  };

  const handlePaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const data = e.target.value;
    setPastedData(data);

    if (data.trim()) {
      const parsed = parseTabularData(data);
      const validated = validateTrips(parsed);
      setPreview(validated);
    } else {
      setPreview([]);
    }
  };

  const handleImport = async () => {
    const validTrips = preview.filter(p => p.status !== 'error');

    if (validTrips.length === 0) {
      alert('Nenhuma viagem válida para importar');
      return;
    }

    const tripsToCreate: Array<Omit<Trip, 'id' | 'created_at'>> = validTrips.map(trip => ({
      vehicle_id: trip.vehicleId || '',
      driver_id: trip.driverId || '',
      status: 'planned',
      origin: trip.origin,
      destination: trip.destination,
      departure_date: departureDate,
      arrival_date: null,
      freight_value: 0,
      driver_commission: null,
      cte: '',
      nfe: '',
      pallet_term: '',
      mdfe: '',
      receipt: '',
      notes: '',
    }));

    try {
      setImporting(true);
      await onImport(tripsToCreate);
      alert(`${validTrips.length} viagem(s) importada(s) com sucesso!`);
      onClose();
    } catch (error) {
      console.error('Error importing trips:', error);
      alert('Erro ao importar viagens. Por favor, tente novamente.');
    } finally {
      setImporting(false);
    }
  };

  const validCount = preview.filter(p => p.status === 'valid' || p.status === 'warning').length;
  const errorCount = preview.filter(p => p.status === 'error').length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Viagens em Lote
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
              <li>Copie os dados tabulados do Excel (PLACA, MOTORISTA, ORIGEM, DESTINO)</li>
              <li>Cole no campo abaixo</li>
              <li>Indique se o cabeçalho está incluído</li>
              <li>Revise o resumo de importação</li>
              <li>Clique em "Importar" para adicionar as viagens</li>
            </ol>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasHeader}
                  onChange={(e) => {
                    setHasHeader(e.target.checked);
                    if (pastedData.trim()) {
                      const parsed = parseTabularData(pastedData);
                      const validated = validateTrips(parsed);
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
                Data da Viagem
              </label>
              <input
                type="date"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Cole os dados aqui:
            </label>
            <textarea
              value={pastedData}
              onChange={handlePaste}
              placeholder="PLACA	MOTORISTA	ORIGEM	DESTINO&#10;RLJ7B45	CARLOS ARMANDO	BRF	CD FARIAS&#10;..."
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
                        <th className="px-3 py-2 text-left font-medium text-slate-700">Motorista</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-700">Origem</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-700">Destino</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-700">Mensagem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((trip, index) => (
                        <tr key={index} className="border-t border-slate-200 hover:bg-slate-50">
                          <td className="px-3 py-2">
                            {trip.status === 'valid' && (
                              <div className="flex items-center gap-1 text-green-700">
                                <CheckCircle2 className="h-4 w-4" />
                              </div>
                            )}
                            {trip.status === 'warning' && (
                              <div className="flex items-center gap-1 text-yellow-700">
                                <AlertCircle className="h-4 w-4" />
                              </div>
                            )}
                            {trip.status === 'error' && (
                              <div className="flex items-center gap-1 text-red-700">
                                <AlertCircle className="h-4 w-4" />
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 font-medium text-slate-900">{trip.plate}</td>
                          <td className="px-3 py-2 text-slate-600">
                            {trip.driverName}
                            {trip.driverId ? (
                              <span className="text-xs text-green-700 ml-1">(cadastrado)</span>
                            ) : (
                              <span className="text-xs text-yellow-700 ml-1">(novo)</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-slate-600">{trip.origin}</td>
                          <td className="px-3 py-2 text-slate-600">{trip.destination}</td>
                          <td className="px-3 py-2 text-xs">
                            {trip.message && (
                              <span className={`inline-block px-2 py-1 rounded ${
                                trip.status === 'error'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {trip.message}
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
                  Viagens com erro serão ignoradas na importação. Apenas as viagens válidas e com avisos serão importadas.
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
