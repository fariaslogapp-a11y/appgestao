import { useState } from 'react';
import { ClipboardCheck, FileText } from 'lucide-react';
import ChecklistTemplates from './ChecklistTemplates';
import TripChecklistGenerator from './TripChecklistGenerator';

export default function TripChecklistManager() {
  const [activeTab, setActiveTab] = useState<'templates' | 'generate'>('generate');

  return (
    <div>
      <div className="border-b border-slate-200 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('generate')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
              activeTab === 'generate'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <ClipboardCheck className="h-5 w-5" />
            Gerar Checklists
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
              activeTab === 'templates'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <FileText className="h-5 w-5" />
            Modelos de Checklist
          </button>
        </nav>
      </div>

      {activeTab === 'generate' ? <TripChecklistGenerator /> : <ChecklistTemplates />}
    </div>
  );
}
