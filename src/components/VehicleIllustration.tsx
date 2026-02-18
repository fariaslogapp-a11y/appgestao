interface Props {
  type: string;
}

export default function VehicleIllustration({ type }: Props) {
  const renderIllustration = () => {
    switch (type) {
      case '3/4':
      case 'toco':
        return (
          <svg viewBox="0 0 400 600" className="w-full max-w-md mx-auto">
            <rect x="50" y="50" width="300" height="500" fill="#e2e8f0" stroke="#1e293b" strokeWidth="3" rx="10" />
            <text x="200" y="30" textAnchor="middle" className="text-sm font-bold" fill="#1e293b">
              Visão de Baixo
            </text>

            <rect x="20" y="80" width="60" height="80" fill="#334155" stroke="#0f172a" strokeWidth="2" rx="5" />
            <text x="50" y="125" textAnchor="middle" className="text-xs font-bold" fill="white">PDE1</text>

            <rect x="320" y="80" width="60" height="80" fill="#334155" stroke="#0f172a" strokeWidth="2" rx="5" />
            <text x="350" y="125" textAnchor="middle" className="text-xs font-bold" fill="white">PDD1</text>

            <rect x="20" y="440" width="60" height="80" fill="#334155" stroke="#0f172a" strokeWidth="2" rx="5" />
            <text x="50" y="475" textAnchor="middle" className="text-xs font-bold" fill="white">TTE1</text>
            <rect x="90" y="440" width="60" height="80" fill="#334155" stroke="#0f172a" strokeWidth="2" rx="5" />
            <text x="120" y="475" textAnchor="middle" className="text-xs font-bold" fill="white">TTI1</text>

            <rect x="250" y="440" width="60" height="80" fill="#334155" stroke="#0f172a" strokeWidth="2" rx="5" />
            <text x="280" y="475" textAnchor="middle" className="text-xs font-bold" fill="white">TTE2</text>
            <rect x="320" y="440" width="60" height="80" fill="#334155" stroke="#0f172a" strokeWidth="2" rx="5" />
            <text x="350" y="475" textAnchor="middle" className="text-xs font-bold" fill="white">TTI2</text>

            <text x="200" y="300" textAnchor="middle" className="text-lg font-bold" fill="#475569">
              {type.toUpperCase()}
            </text>
          </svg>
        );

      case 'truck':
        return (
          <svg viewBox="0 0 400 650" className="w-full max-w-md mx-auto">
            <rect x="50" y="50" width="300" height="550" fill="#e2e8f0" stroke="#1e293b" strokeWidth="3" rx="10" />
            <text x="200" y="30" textAnchor="middle" className="text-sm font-bold" fill="#1e293b">
              Visão de Baixo
            </text>

            <rect x="20" y="80" width="60" height="80" fill="#334155" stroke="#0f172a" strokeWidth="2" rx="5" />
            <text x="50" y="125" textAnchor="middle" className="text-xs font-bold" fill="white">PDE1</text>

            <rect x="320" y="80" width="60" height="80" fill="#334155" stroke="#0f172a" strokeWidth="2" rx="5" />
            <text x="350" y="125" textAnchor="middle" className="text-xs font-bold" fill="white">PDD1</text>

            <rect x="20" y="320" width="60" height="80" fill="#334155" stroke="#0f172a" strokeWidth="2" rx="5" />
            <text x="50" y="355" textAnchor="middle" className="text-xs font-bold" fill="white">T1E1</text>
            <rect x="90" y="320" width="60" height="80" fill="#334155" stroke="#0f172a" strokeWidth="2" rx="5" />
            <text x="120" y="355" textAnchor="middle" className="text-xs font-bold" fill="white">T1I1</text>

            <rect x="250" y="320" width="60" height="80" fill="#334155" stroke="#0f172a" strokeWidth="2" rx="5" />
            <text x="280" y="355" textAnchor="middle" className="text-xs font-bold" fill="white">T1E2</text>
            <rect x="320" y="320" width="60" height="80" fill="#334155" stroke="#0f172a" strokeWidth="2" rx="5" />
            <text x="350" y="355" textAnchor="middle" className="text-xs font-bold" fill="white">T1I2</text>

            <rect x="20" y="490" width="60" height="80" fill="#334155" stroke="#0f172a" strokeWidth="2" rx="5" />
            <text x="50" y="525" textAnchor="middle" className="text-xs font-bold" fill="white">T2E1</text>
            <rect x="90" y="490" width="60" height="80" fill="#334155" stroke="#0f172a" strokeWidth="2" rx="5" />
            <text x="120" y="525" textAnchor="middle" className="text-xs font-bold" fill="white">T2I1</text>

            <rect x="250" y="490" width="60" height="80" fill="#334155" stroke="#0f172a" strokeWidth="2" rx="5" />
            <text x="280" y="525" textAnchor="middle" className="text-xs font-bold" fill="white">T2E2</text>
            <rect x="320" y="490" width="60" height="80" fill="#334155" stroke="#0f172a" strokeWidth="2" rx="5" />
            <text x="350" y="525" textAnchor="middle" className="text-xs font-bold" fill="white">T2I2</text>

            <text x="200" y="290" textAnchor="middle" className="text-lg font-bold" fill="#475569">
              TRUCK
            </text>
          </svg>
        );

      case 'bitruck':
        return (
          <svg viewBox="0 0 400 750" className="w-full max-w-md mx-auto">
            <rect x="50" y="50" width="300" height="650" fill="#e2e8f0" stroke="#1e293b" strokeWidth="3" rx="10" />
            <text x="200" y="30" textAnchor="middle" className="text-sm font-bold" fill="#1e293b">
              Visão de Baixo
            </text>

            <rect x="20" y="80" width="60" height="80" fill="#334155" stroke="#0f172a" strokeWidth="2" rx="5" />
            <text x="50" y="125" textAnchor="middle" className="text-xs font-bold" fill="white">PDE1</text>

            <rect x="320" y="80" width="60" height="80" fill="#334155" stroke="#0f172a" strokeWidth="2" rx="5" />
            <text x="350" y="125" textAnchor="middle" className="text-xs font-bold" fill="white">PDD1</text>

            <rect x="20" y="200" width="60" height="80" fill="#334155" stroke="#0f172a" strokeWidth="2" rx="5" />
            <text x="50" y="245" textAnchor="middle" className="text-xs font-bold" fill="white">PDE2</text>

            <rect x="320" y="200" width="60" height="80" fill="#334155" stroke="#0f172a" strokeWidth="2" rx="5" />
            <text x="350" y="245" textAnchor="middle" className="text-xs font-bold" fill="white">PDD2</text>

            <rect x="20" y="460" width="60" height="80" fill="#334155" stroke="#0f172a" strokeWidth="2" rx="5" />
            <text x="50" y="495" textAnchor="middle" className="text-xs font-bold" fill="white">T1E1</text>
            <rect x="90" y="460" width="60" height="80" fill="#334155" stroke="#0f172a" strokeWidth="2" rx="5" />
            <text x="120" y="495" textAnchor="middle" className="text-xs font-bold" fill="white">T1I1</text>

            <rect x="250" y="460" width="60" height="80" fill="#334155" stroke="#0f172a" strokeWidth="2" rx="5" />
            <text x="280" y="495" textAnchor="middle" className="text-xs font-bold" fill="white">T1E2</text>
            <rect x="320" y="460" width="60" height="80" fill="#334155" stroke="#0f172a" strokeWidth="2" rx="5" />
            <text x="350" y="495" textAnchor="middle" className="text-xs font-bold" fill="white">T1I2</text>

            <rect x="20" y="600" width="60" height="80" fill="#334155" stroke="#0f172a" strokeWidth="2" rx="5" />
            <text x="50" y="635" textAnchor="middle" className="text-xs font-bold" fill="white">T2E1</text>
            <rect x="90" y="600" width="60" height="80" fill="#334155" stroke="#0f172a" strokeWidth="2" rx="5" />
            <text x="120" y="635" textAnchor="middle" className="text-xs font-bold" fill="white">T2I1</text>

            <rect x="250" y="600" width="60" height="80" fill="#334155" stroke="#0f172a" strokeWidth="2" rx="5" />
            <text x="280" y="635" textAnchor="middle" className="text-xs font-bold" fill="white">T2E2</text>
            <rect x="320" y="600" width="60" height="80" fill="#334155" stroke="#0f172a" strokeWidth="2" rx="5" />
            <text x="350" y="635" textAnchor="middle" className="text-xs font-bold" fill="white">T2I2</text>

            <text x="200" y="370" textAnchor="middle" className="text-lg font-bold" fill="#475569">
              BITRUCK
            </text>
          </svg>
        );

      case 'cavalo':
        return (
          <svg viewBox="0 0 400 700" className="w-full max-w-md mx-auto">
            <rect x="50" y="50" width="300" height="600" fill="#e2e8f0" stroke="#1e293b" strokeWidth="3" rx="10" />
            <text x="200" y="30" textAnchor="middle" className="text-sm font-bold" fill="#1e293b">
              Visão de Baixo
            </text>

            <rect x="20" y="80" width="60" height="80" fill="#334155" stroke="#0f172a" strokeWidth="2" rx="5" />
            <text x="50" y="125" textAnchor="middle" className="text-xs font-bold" fill="white">PDE1</text>

            <rect x="320" y="80" width="60" height="80" fill="#334155" stroke="#0f172a" strokeWidth="2" rx="5" />
            <text x="350" y="125" textAnchor="middle" className="text-xs font-bold" fill="white">PDD1</text>

            <rect x="20" y="340" width="60" height="80" fill="#334155" stroke="#0f172a" strokeWidth="2" rx="5" />
            <text x="50" y="375" textAnchor="middle" className="text-xs font-bold" fill="white">T1E1</text>
            <rect x="90" y="340" width="60" height="80" fill="#334155" stroke="#0f172a" strokeWidth="2" rx="5" />
            <text x="120" y="375" textAnchor="middle" className="text-xs font-bold" fill="white">T1I1</text>

            <rect x="250" y="340" width="60" height="80" fill="#334155" stroke="#0f172a" strokeWidth="2" rx="5" />
            <text x="280" y="375" textAnchor="middle" className="text-xs font-bold" fill="white">T1E2</text>
            <rect x="320" y="340" width="60" height="80" fill="#334155" stroke="#0f172a" strokeWidth="2" rx="5" />
            <text x="350" y="375" textAnchor="middle" className="text-xs font-bold" fill="white">T1I2</text>

            <rect x="20" y="500" width="60" height="80" fill="#334155" stroke="#0f172a" strokeWidth="2" rx="5" />
            <text x="50" y="535" textAnchor="middle" className="text-xs font-bold" fill="white">T2E1</text>
            <rect x="90" y="500" width="60" height="80" fill="#334155" stroke="#0f172a" strokeWidth="2" rx="5" />
            <text x="120" y="535" textAnchor="middle" className="text-xs font-bold" fill="white">T2I1</text>

            <rect x="250" y="500" width="60" height="80" fill="#334155" stroke="#0f172a" strokeWidth="2" rx="5" />
            <text x="280" y="535" textAnchor="middle" className="text-xs font-bold" fill="white">T2E2</text>
            <rect x="320" y="500" width="60" height="80" fill="#334155" stroke="#0f172a" strokeWidth="2" rx="5" />
            <text x="350" y="535" textAnchor="middle" className="text-xs font-bold" fill="white">T2I2</text>

            <text x="200" y="300" textAnchor="middle" className="text-lg font-bold" fill="#475569">
              CAVALO
            </text>
          </svg>
        );

      case 'carreta':
        return (
          <svg viewBox="0 0 400 800" className="w-full max-w-md mx-auto">
            <rect x="50" y="50" width="300" height="700" fill="#e2e8f0" stroke="#1e293b" strokeWidth="3" rx="10" />
            <text x="200" y="30" textAnchor="middle" className="text-sm font-bold" fill="#1e293b">
              Visão de Baixo
            </text>

            <rect x="20" y="100" width="60" height="80" fill="#334155" stroke="#0f172a" strokeWidth="2" rx="5" />
            <text x="50" y="135" textAnchor="middle" className="text-xs font-bold" fill="white">T1E1</text>
            <rect x="90" y="100" width="60" height="80" fill="#334155" stroke="#0f172a" strokeWidth="2" rx="5" />
            <text x="120" y="135" textAnchor="middle" className="text-xs font-bold" fill="white">T1I1</text>

            <rect x="250" y="100" width="60" height="80" fill="#334155" stroke="#0f172a" strokeWidth="2" rx="5" />
            <text x="280" y="135" textAnchor="middle" className="text-xs font-bold" fill="white">T1E2</text>
            <rect x="320" y="100" width="60" height="80" fill="#334155" stroke="#0f172a" strokeWidth="2" rx="5" />
            <text x="350" y="135" textAnchor="middle" className="text-xs font-bold" fill="white">T1I2</text>

            <rect x="20" y="360" width="60" height="80" fill="#334155" stroke="#0f172a" strokeWidth="2" rx="5" />
            <text x="50" y="395" textAnchor="middle" className="text-xs font-bold" fill="white">T2E1</text>
            <rect x="90" y="360" width="60" height="80" fill="#334155" stroke="#0f172a" strokeWidth="2" rx="5" />
            <text x="120" y="395" textAnchor="middle" className="text-xs font-bold" fill="white">T2I1</text>

            <rect x="250" y="360" width="60" height="80" fill="#334155" stroke="#0f172a" strokeWidth="2" rx="5" />
            <text x="280" y="395" textAnchor="middle" className="text-xs font-bold" fill="white">T2E2</text>
            <rect x="320" y="360" width="60" height="80" fill="#334155" stroke="#0f172a" strokeWidth="2" rx="5" />
            <text x="350" y="395" textAnchor="middle" className="text-xs font-bold" fill="white">T2I2</text>

            <rect x="20" y="620" width="60" height="80" fill="#334155" stroke="#0f172a" strokeWidth="2" rx="5" />
            <text x="50" y="655" textAnchor="middle" className="text-xs font-bold" fill="white">T3E1</text>
            <rect x="90" y="620" width="60" height="80" fill="#334155" stroke="#0f172a" strokeWidth="2" rx="5" />
            <text x="120" y="655" textAnchor="middle" className="text-xs font-bold" fill="white">T3I1</text>

            <rect x="250" y="620" width="60" height="80" fill="#334155" stroke="#0f172a" strokeWidth="2" rx="5" />
            <text x="280" y="655" textAnchor="middle" className="text-xs font-bold" fill="white">T3E2</text>
            <rect x="320" y="620" width="60" height="80" fill="#334155" stroke="#0f172a" strokeWidth="2" rx="5" />
            <text x="350" y="655" textAnchor="middle" className="text-xs font-bold" fill="white">T3I2</text>

            <text x="200" y="400" textAnchor="middle" className="text-lg font-bold" fill="#475569">
              CARRETA
            </text>
          </svg>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg border-2 border-slate-300 mb-6">
      <h3 className="text-center font-bold text-slate-900 mb-4 text-lg">
        DIAGRAMA DE POSIÇÃO DOS PNEUS
      </h3>
      {renderIllustration()}
      <div className="mt-4 text-center text-sm text-slate-600">
        <p className="font-semibold">Legenda:</p>
        <p>PDE = Pneu Dianteiro Esquerdo | PDD = Pneu Dianteiro Direito</p>
        <p>TTE = Traseiro Externo | TTI = Traseiro Interno</p>
        <p>T1, T2, T3 = Eixo 1, 2, 3 | E = Esquerdo | I = Interno</p>
      </div>
    </div>
  );
}
