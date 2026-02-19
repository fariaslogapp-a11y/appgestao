import { X } from 'lucide-react';
import VehicleIllustration from './VehicleIllustration';

import type { Vehicle } from '../types';

interface Props {
  vehicle: Vehicle;
  coupledVehicle: Vehicle | null;
  onClose: () => void;
  onPrint: () => void;
}

export default function PrintableTireSheet({ vehicle, coupledVehicle, onClose, onPrint }: Props) {

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-sheet, .printable-sheet * {
            visibility: visible;
          }
          .printable-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
          .page-break {
            page-break-after: always;
          }
        }
      `}</style>

      <div className="no-print fixed top-0 left-0 right-0 bg-slate-800 text-white p-4 z-50 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Ficha de Inspeção de Pneus</h2>
          <p className="text-sm text-slate-300">Pronto para imprimir</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={onPrint}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Imprimir / Salvar PDF
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="printable-sheet bg-white p-8 max-w-4xl mx-auto mt-20">
        <div className="border-4 border-slate-900 p-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              FICHA DE INSPEÇÃO DE PNEUS
            </h1>
            <p className="text-slate-600">Sistema de Gestão de Frota</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 border-2 border-slate-300 p-4">
            <div className="border-b-2 border-slate-400 pb-2">
              <label className="text-sm font-semibold text-slate-700">Data:</label>
              <div className="h-8 border-b border-slate-400 mt-1"></div>
            </div>
            <div className="border-b-2 border-slate-400 pb-2">
              <label className="text-sm font-semibold text-slate-700">Nome do Motorista:</label>
              <div className="h-8 border-b border-slate-400 mt-1"></div>
            </div>
            <div className="border-b-2 border-slate-400 pb-2">
              <label className="text-sm font-semibold text-slate-700">Placa do Veículo:</label>
              <div className="h-8 border-b border-slate-400 mt-1 font-bold text-lg">
                {vehicle.plate}
              </div>
            </div>
            {coupledVehicle && (
              <div className="border-b-2 border-slate-400 pb-2">
                <label className="text-sm font-semibold text-slate-700">
                  Placa do Veículo Acoplado:
                </label>
                <div className="h-8 border-b border-slate-400 mt-1 font-bold text-lg">
                  {coupledVehicle.plate}
                </div>
              </div>
            )}
          </div>

          <div className="mb-6 bg-slate-100 p-4 rounded">
            <h3 className="font-semibold text-slate-900 mb-2">Informações do Veículo:</h3>
            <p className="text-sm text-slate-700">
              <strong>Tipo:</strong> {vehicle.type} | <strong>Marca/Modelo:</strong>{' '}
              {vehicle.brand} {vehicle.model} | <strong>Ano:</strong> {vehicle.year}
            </p>
          </div>

          <VehicleIllustration type={vehicle.type} />

          <div className="mt-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4 border-b-2 border-slate-900 pb-2">
              DADOS DOS PNEUS
            </h3>
            <TireInspectionTable type={vehicle.type} />
          </div>

          {coupledVehicle && (
            <div className="page-break"></div>
          )}

          {coupledVehicle && (
            <div className="mt-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  VEÍCULO ACOPLADO - {coupledVehicle.type.toUpperCase()}
                </h2>
                <p className="text-slate-600">Placa: {coupledVehicle.plate}</p>
              </div>

              <VehicleIllustration type={coupledVehicle.type} />

              <div className="mt-6">
                <h3 className="text-xl font-bold text-slate-900 mb-4 border-b-2 border-slate-900 pb-2">
                  DADOS DOS PNEUS - VEÍCULO ACOPLADO
                </h3>
                <TireInspectionTable type={coupledVehicle.type} />
              </div>
            </div>
          )}

          <div className="mt-8 border-t-2 border-slate-300 pt-4">
            <h4 className="font-semibold text-slate-900 mb-2">Legenda do Sulco:</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <strong>Novo:</strong> Sulco &gt; 10mm
              </div>
              <div>
                <strong>Meia Vida:</strong> Sulco 5-10mm
              </div>
              <div>
                <strong>Trocar:</strong> Sulco &lt; 5mm
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function TireInspectionTable({ type }: { type: string }) {
  const getTirePositions = (vehicleType: string) => {
    switch (vehicleType) {
      case '3/4':
        return [
          { id: 'PDE1', label: 'Pneu Dianteiro Esquerdo' },
          { id: 'PDD1', label: 'Pneu Dianteiro Direito' },
          { id: 'TTE1', label: 'Pneu Traseiro Esquerdo Externo' },
          { id: 'TTI1', label: 'Pneu Traseiro Esquerdo Interno' },
          { id: 'TTE2', label: 'Pneu Traseiro Direito Externo' },
          { id: 'TTI2', label: 'Pneu Traseiro Direito Interno' },
          { id: 'ESTEPE', label: 'Estepe' },
        ];
      case 'toco':
        return [
          { id: 'PDE1', label: 'Pneu Dianteiro Esquerdo' },
          { id: 'PDD1', label: 'Pneu Dianteiro Direito' },
          { id: 'TTE1', label: 'Pneu Traseiro Esquerdo Externo' },
          { id: 'TTI1', label: 'Pneu Traseiro Esquerdo Interno' },
          { id: 'TTE2', label: 'Pneu Traseiro Direito Externo' },
          { id: 'TTI2', label: 'Pneu Traseiro Direito Interno' },
          { id: 'ESTEPE', label: 'Estepe' },
        ];
      case 'truck':
        return [
          { id: 'PDE1', label: 'Pneu Dianteiro Esquerdo' },
          { id: 'PDD1', label: 'Pneu Dianteiro Direito' },
          { id: 'T1E1', label: 'Pneu Traseiro 1 Esquerdo Externo' },
          { id: 'T1I1', label: 'Pneu Traseiro 1 Esquerdo Interno' },
          { id: 'T1E2', label: 'Pneu Traseiro 1 Direito Externo' },
          { id: 'T1I2', label: 'Pneu Traseiro 1 Direito Interno' },
          { id: 'T2E1', label: 'Pneu Traseiro 2 Esquerdo Externo' },
          { id: 'T2I1', label: 'Pneu Traseiro 2 Esquerdo Interno' },
          { id: 'T2E2', label: 'Pneu Traseiro 2 Direito Externo' },
          { id: 'T2I2', label: 'Pneu Traseiro 2 Direito Interno' },
          { id: 'ESTEPE', label: 'Estepe' },
        ];
      case 'bitruck':
        return [
          { id: 'PDE1', label: 'Pneu Dianteiro 1 Esquerdo' },
          { id: 'PDD1', label: 'Pneu Dianteiro 1 Direito' },
          { id: 'PDE2', label: 'Pneu Dianteiro 2 Esquerdo' },
          { id: 'PDD2', label: 'Pneu Dianteiro 2 Direito' },
          { id: 'T1E1', label: 'Pneu Traseiro 1 Esquerdo Externo' },
          { id: 'T1I1', label: 'Pneu Traseiro 1 Esquerdo Interno' },
          { id: 'T1E2', label: 'Pneu Traseiro 1 Direito Externo' },
          { id: 'T1I2', label: 'Pneu Traseiro 1 Direito Interno' },
          { id: 'T2E1', label: 'Pneu Traseiro 2 Esquerdo Externo' },
          { id: 'T2I1', label: 'Pneu Traseiro 2 Esquerdo Interno' },
          { id: 'T2E2', label: 'Pneu Traseiro 2 Direito Externo' },
          { id: 'T2I2', label: 'Pneu Traseiro 2 Direito Interno' },
          { id: 'ESTEPE', label: 'Estepe' },
        ];
      case 'cavalo':
        return [
          { id: 'PDE1', label: 'Pneu Dianteiro Esquerdo' },
          { id: 'PDD1', label: 'Pneu Dianteiro Direito' },
          { id: 'T1E1', label: 'Pneu Traseiro 1 Esquerdo Externo' },
          { id: 'T1I1', label: 'Pneu Traseiro 1 Esquerdo Interno' },
          { id: 'T1E2', label: 'Pneu Traseiro 1 Direito Externo' },
          { id: 'T1I2', label: 'Pneu Traseiro 1 Direito Interno' },
          { id: 'T2E1', label: 'Pneu Traseiro 2 Esquerdo Externo' },
          { id: 'T2I1', label: 'Pneu Traseiro 2 Esquerdo Interno' },
          { id: 'T2E2', label: 'Pneu Traseiro 2 Direito Externo' },
          { id: 'T2I2', label: 'Pneu Traseiro 2 Direito Interno' },
          { id: 'ESTEPE', label: 'Estepe' },
        ];
      case 'carreta':
        return [
          { id: 'T1E1', label: 'Eixo 1 Esquerdo Externo' },
          { id: 'T1I1', label: 'Eixo 1 Esquerdo Interno' },
          { id: 'T1E2', label: 'Eixo 1 Direito Externo' },
          { id: 'T1I2', label: 'Eixo 1 Direito Interno' },
          { id: 'T2E1', label: 'Eixo 2 Esquerdo Externo' },
          { id: 'T2I1', label: 'Eixo 2 Esquerdo Interno' },
          { id: 'T2E2', label: 'Eixo 2 Direito Externo' },
          { id: 'T2I2', label: 'Eixo 2 Direito Interno' },
          { id: 'T3E1', label: 'Eixo 3 Esquerdo Externo' },
          { id: 'T3I1', label: 'Eixo 3 Esquerdo Interno' },
          { id: 'T3E2', label: 'Eixo 3 Direito Externo' },
          { id: 'T3I2', label: 'Eixo 3 Direito Interno' },
          { id: 'ESTEPE', label: 'Estepe' },
        ];
      case 'carro':
        return [
          { id: 'PDE', label: 'Pneu Dianteiro Esquerdo' },
          { id: 'PDD', label: 'Pneu Dianteiro Direito' },
          { id: 'PTE', label: 'Pneu Traseiro Esquerdo' },
          { id: 'PTD', label: 'Pneu Traseiro Direito' },
          { id: 'ESTEPE', label: 'Estepe' },
        ];
      default:
        return [];
    }
  };

  const positions = getTirePositions(type);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-2 border-slate-900">
        <thead>
          <tr className="bg-slate-200">
            <th className="border-2 border-slate-900 p-2 text-left font-bold text-sm">
              Posição
            </th>
            <th className="border-2 border-slate-900 p-2 text-left font-bold text-sm">
              Marca
            </th>
            <th className="border-2 border-slate-900 p-2 text-left font-bold text-sm">
              Medida
            </th>
            <th className="border-2 border-slate-900 p-2 text-left font-bold text-sm">
              Sulco
            </th>
            <th className="border-2 border-slate-900 p-2 text-left font-bold text-sm">
              Recapado
            </th>
          </tr>
        </thead>
        <tbody>
          {positions.map((position) => (
            <tr key={position.id}>
              <td className="border-2 border-slate-900 p-2 font-semibold text-sm">
                <span className="inline-block bg-slate-900 text-white px-2 py-1 rounded mr-2">
                  {position.id}
                </span>
                {position.label}
              </td>
              <td className="border-2 border-slate-900 p-2">
                <div className="h-8"></div>
              </td>
              <td className="border-2 border-slate-900 p-2">
                <div className="h-8"></div>
              </td>
              <td className="border-2 border-slate-900 p-2">
                <div className="h-8"></div>
              </td>
              <td className="border-2 border-slate-900 p-2 text-center">
                <div className="flex justify-center space-x-4">
                  <label className="inline-flex items-center">
                    <span className="mr-1">Sim</span>
                    <div className="w-4 h-4 border-2 border-slate-900"></div>
                  </label>
                  <label className="inline-flex items-center">
                    <span className="mr-1">Não</span>
                    <div className="w-4 h-4 border-2 border-slate-900"></div>
                  </label>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
