import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, addDoc, query, orderBy, where } from 'firebase/firestore';
import { FileText, Download, AlertCircle, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import jsPDF from 'jspdf';
import { formatDateLocal } from '../utils/dateUtils';
import type { Trip, Vehicle, Driver, ChecklistTemplate } from '../types';

const ITEMS_PER_PAGE = 100;

export default function TripChecklistGenerator() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrips, setSelectedTrips] = useState<Set<string>>(new Set());
  const [tripTemplates, setTripTemplates] = useState<Map<string, string>>(new Map());
  const [tripNotes, setTripNotes] = useState<Map<string, string>>(new Map());
  const [tripExtraDestinations, setTripExtraDestinations] = useState<Map<string, string>>(new Map());
  const [generating, setGenerating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tripsSnap, vehiclesSnap, driversSnap, templatesSnap] = await Promise.all([
        getDocs(query(collection(db, 'trips'), orderBy('departure_date', 'desc'))),
        getDocs(query(collection(db, 'vehicles'), orderBy('plate'))),
        getDocs(query(collection(db, 'drivers'), orderBy('name'))),
        getDocs(query(collection(db, 'checklist_templates'), orderBy('name'))),
      ]);

      setTrips(tripsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trip)));
      setVehicles(vehiclesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle)));
      setDrivers(driversSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Driver)));
      setTemplates(templatesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChecklistTemplate)));
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Erro ao carregar dados. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  const toggleTripSelection = (tripId: string) => {
    const newSelected = new Set(selectedTrips);
    if (newSelected.has(tripId)) {
      newSelected.delete(tripId);
      const newTemplates = new Map(tripTemplates);
      newTemplates.delete(tripId);
      setTripTemplates(newTemplates);
      const newNotes = new Map(tripNotes);
      newNotes.delete(tripId);
      setTripNotes(newNotes);
      const newExtraDestinations = new Map(tripExtraDestinations);
      newExtraDestinations.delete(tripId);
      setTripExtraDestinations(newExtraDestinations);
    } else {
      newSelected.add(tripId);
    }
    setSelectedTrips(newSelected);
  };

  const setTemplateForTrip = (tripId: string, templateId: string) => {
    const newTemplates = new Map(tripTemplates);
    newTemplates.set(tripId, templateId);
    setTripTemplates(newTemplates);
  };

  const setNotesForTrip = (tripId: string, notes: string) => {
    const newNotes = new Map(tripNotes);
    newNotes.set(tripId, notes);
    setTripNotes(newNotes);
  };

  const setExtraDestinationsForTrip = (tripId: string, destinations: string) => {
    const newExtraDestinations = new Map(tripExtraDestinations);
    newExtraDestinations.set(tripId, destinations);
    setTripExtraDestinations(newExtraDestinations);
  };

  const getVehiclePlate = (vehicleId: string) => {
    return vehicles.find(v => v.id === vehicleId)?.plate || 'N/A';
  };

  const getDriverName = (driverId: string | null) => {
    if (!driverId) return '-';
    const driver = drivers.find(d => d.id === driverId);
    return driver ? driver.name : driverId;
  };

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    setCurrentPage(1);
  };

  const getSortedTrips = () => {
    return [...trips].sort((a, b) => {
      const dateA = new Date(a.departure_date).getTime();
      const dateB = new Date(b.departure_date).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
  };

  const sortedTrips = getSortedTrips();
  const totalPages = Math.ceil(sortedTrips.length / ITEMS_PER_PAGE);
  const paginatedTrips = sortedTrips.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const generateChecklistPDF = async () => {
    if (selectedTrips.size === 0) {
      alert('Selecione pelo menos uma viagem');
      return;
    }

    const tripsWithoutTemplate = Array.from(selectedTrips).filter(
      tripId => !tripTemplates.has(tripId)
    );

    if (tripsWithoutTemplate.length > 0) {
      alert('Selecione um modelo de checklist para todas as viagens selecionadas');
      return;
    }

    setGenerating(true);

    try {
      const doc = new jsPDF();
      let isFirstPage = true;

      for (const tripId of Array.from(selectedTrips)) {
        const trip = trips.find(t => t.id === tripId);
        const templateId = tripTemplates.get(tripId);
        const template = templates.find(t => t.id === templateId);
        const notes = tripNotes.get(tripId) || '';
        const extraDestinations = tripExtraDestinations.get(tripId) || '';

        if (!trip || !template) continue;

        await addDoc(collection(db, 'trip_checklists'), {
          trip_id: trip.id,
          template_id: template.id,
          template_name: template.name,
          documents: template.documents,
          notes: notes,
          created_at: new Date().toISOString()
        });

        if (!isFirstPage) {
          doc.addPage();
        }
        isFirstPage = false;

        generateChecklistPage(doc, trip, template, vehicles, drivers, notes, extraDestinations);
      }

      const timestamp = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
      doc.save(`checklists-viagens-${timestamp}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  };

  const generateChecklistPage = (
    doc: jsPDF,
    trip: Trip,
    template: ChecklistTemplate,
    vehicles: Vehicle[],
    drivers: Driver[],
    notes: string,
    extraDestinations: string
  ) => {
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const halfPage = pageHeight / 2;

    for (let viaNumber = 1; viaNumber <= 2; viaNumber++) {
      const startY = viaNumber === 1 ? 10 : halfPage + 10;
      const availableHeight = halfPage - 30;

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('CHECKLIST DE VIAGEM', pageWidth / 2, startY, { align: 'center' });

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`${viaNumber}ª VIA`, pageWidth / 2, startY + 6, { align: 'center' });

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.line(20, startY + 10, pageWidth - 20, startY + 10);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('INFORMAÇÕES DA VIAGEM', 20, startY + 16);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');

      let infoY = startY + 22;
      doc.text('Modelo:', 20, infoY);
      doc.setFont('helvetica', 'bold');
      doc.text(template.name, 40, infoY);

      doc.setFont('helvetica', 'normal');
      doc.text('Data:', 110, infoY);
      doc.setFont('helvetica', 'bold');
      doc.text(formatDateLocal(trip.departure_date), 125, infoY);

      infoY += 6;
      doc.setFont('helvetica', 'normal');
      doc.text('Veículo:', 20, infoY);
      doc.setFont('helvetica', 'bold');
      doc.text(getVehiclePlate(trip.vehicle_id), 40, infoY);

      doc.setFont('helvetica', 'normal');
      doc.text('Motorista:', 110, infoY);
      doc.setFont('helvetica', 'bold');
      const driverText = doc.splitTextToSize(getDriverName(trip.driver_id), 60);
      doc.text(driverText[0] || getDriverName(trip.driver_id), 125, infoY);

      infoY += 6;
      doc.setFont('helvetica', 'normal');
      doc.text('Origem:', 20, infoY);
      doc.setFont('helvetica', 'bold');
      const originText = doc.splitTextToSize(trip.origin, 60);
      doc.text(originText[0] || trip.origin, 40, infoY);

      doc.setFont('helvetica', 'normal');
      doc.text('Destino:', 110, infoY);
      doc.setFont('helvetica', 'bold');
      const destText = doc.splitTextToSize(trip.destination, 60);
      doc.text(destText[0] || trip.destination, 125, infoY);

      if (extraDestinations && extraDestinations.trim()) {
        infoY += 6;
        doc.setFont('helvetica', 'normal');
        doc.text('Outros Destinos:', 20, infoY);
        doc.setFont('helvetica', 'bold');
        const extraDestLines = doc.splitTextToSize(extraDestinations, pageWidth - 65);
        doc.text(extraDestLines, 55, infoY);
        infoY += (extraDestLines.length * 5);
      }

      if (notes && notes.trim()) {
        infoY += 6;
        doc.setFont('helvetica', 'normal');
        doc.text('Obs:', 20, infoY);
        doc.setFont('helvetica', 'italic');
        const notesLines = doc.splitTextToSize(notes, pageWidth - 50);
        doc.text(notesLines, 40, infoY);
        infoY += (notesLines.length * 5);
      }

      infoY += 4;
      doc.setLineWidth(0.3);
      doc.line(20, infoY, pageWidth - 20, infoY);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('DOCUMENTOS A RETORNAR ASSINADOS', 20, infoY + 6);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');

      let currentY = infoY + 12;
      const checkboxSize = 3.5;
      template.documents.forEach((docName) => {
        doc.rect(25, currentY - 3, checkboxSize, checkboxSize);
        const docLines = doc.splitTextToSize(docName, pageWidth - 60);
        doc.text(docLines, 31, currentY);
        currentY += Math.max(6, docLines.length * 5);
      });

      const footerY = viaNumber === 1 ? halfPage - 18 : pageHeight - 18;

      doc.setLineWidth(0.2);
      doc.line(20, footerY, 85, footerY);
      doc.setFontSize(8);
      doc.text('Assinatura do Motorista', 52.5, footerY + 4, { align: 'center' });

      doc.line(110, footerY, 175, footerY);
      doc.text('Assinatura do Responsável', 142.5, footerY + 4, { align: 'center' });

      if (viaNumber === 1) {
        doc.setLineDash([3, 3]);
        doc.setLineWidth(0.2);
        doc.line(10, halfPage, pageWidth - 10, halfPage);
        doc.setLineDash([]);
      }
    }
  };

  const selectAll = () => {
    const allTripIds = new Set(paginatedTrips.map(t => t.id));
    setSelectedTrips(allTripIds);
  };

  const clearAll = () => {
    setSelectedTrips(new Set());
    setTripTemplates(new Map());
    setTripNotes(new Map());
    setTripExtraDestinations(new Map());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Gerar Checklists de Viagem</h1>
          <p className="text-slate-600 mt-2">Selecione as viagens e gere os checklists em PDF</p>
        </div>
        <div className="flex items-center space-x-3">
          {selectedTrips.size > 0 && (
            <>
              <button
                onClick={clearAll}
                className="px-4 py-2 bg-slate-200 text-slate-900 rounded-lg hover:bg-slate-300 transition-colors"
              >
                Limpar Seleção
              </button>
              <button
                onClick={generateChecklistPDF}
                disabled={generating}
                className={`inline-flex items-center px-4 py-2 rounded-lg transition-colors ${
                  generating
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <Download className="h-5 w-5 mr-2" />
                {generating ? 'Gerando...' : `Gerar PDF (${selectedTrips.size})`}
              </button>
            </>
          )}
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-900 mb-1">
                Nenhum modelo de checklist cadastrado
              </h3>
              <p className="text-sm text-amber-800">
                Você precisa criar modelos de checklist antes de gerar checklists para viagens.
                Acesse a aba "Modelos de Checklist" para criar seus modelos.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">Como usar:</h3>
            <ol className="text-sm text-blue-800 space-y-1 ml-4 list-decimal">
              <li>Selecione as viagens que deseja gerar checklist</li>
              <li>Escolha o modelo de checklist para cada viagem</li>
              <li>Adicione observações opcionais se necessário</li>
              <li>Clique em "Gerar PDF" para criar o documento</li>
              <li>O PDF terá 2 vias na mesma página com linha pontilhada para corte</li>
            </ol>
          </div>

          <div className="mb-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <p className="text-sm text-slate-600">
                {selectedTrips.size > 0 ? (
                  <span className="font-semibold text-blue-600">
                    {selectedTrips.size} viagem(ns) selecionada(s)
                  </span>
                ) : (
                  'Nenhuma viagem selecionada'
                )}
              </p>
              <button
                onClick={toggleSortOrder}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm"
              >
                <ArrowUpDown className="h-4 w-4" />
                Data: {sortOrder === 'asc' ? 'Antiga → Nova' : 'Nova → Antiga'}
              </button>
            </div>
            {paginatedTrips.length > 0 && (
              <button
                onClick={selectAll}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Selecionar Todas (página)
              </button>
            )}
          </div>
        </>
      )}

      {trips.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
          <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600">Nenhuma viagem cadastrada</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {paginatedTrips.map((trip) => {
              const isSelected = selectedTrips.has(trip.id);
              const selectedTemplate = tripTemplates.get(trip.id);
              const tripNotesValue = tripNotes.get(trip.id) || '';
              const tripExtraDestinationsValue = tripExtraDestinations.get(trip.id) || '';

              return (
                <div
                  key={trip.id}
                  className={`bg-white rounded-lg shadow-sm border-2 p-6 transition-all ${
                    isSelected ? 'border-blue-500 bg-blue-50' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 pt-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleTripSelection(trip.id)}
                        disabled={templates.length === 0}
                        className="w-5 h-5 rounded border-slate-300"
                      />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-slate-900">
                          {getVehiclePlate(trip.vehicle_id)}
                        </h3>
                        <span className="text-sm text-slate-500">
                          {formatDateLocal(trip.departure_date)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm mb-3">
                        <div>
                          <span className="text-slate-600">Motorista: </span>
                          <span className="font-medium text-slate-900">
                            {getDriverName(trip.driver_id)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-600">Origem: </span>
                          <span className="font-medium text-slate-900">{trip.origin}</span>
                        </div>
                        <div>
                          <span className="text-slate-600">Destino: </span>
                          <span className="font-medium text-slate-900">{trip.destination}</span>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="mt-4 pt-4 border-t border-slate-200 space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              Modelo de Checklist:
                            </label>
                            <select
                              value={selectedTemplate || ''}
                              onChange={(e) => setTemplateForTrip(trip.id, e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="">Selecione um modelo</option>
                              {templates.map((template) => (
                                <option key={template.id} value={template.id}>
                                  {template.name} ({template.documents.length} documento{template.documents.length !== 1 ? 's' : ''})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              Destinos Adicionais (opcional):
                            </label>
                            <textarea
                              value={tripExtraDestinationsValue}
                              onChange={(e) => setExtraDestinationsForTrip(trip.id, e.target.value)}
                              placeholder="Ex: Cidade 1, Cidade 2, Cidade 3"
                              rows={2}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              Observações (opcional):
                            </label>
                            <textarea
                              value={tripNotesValue}
                              onChange={(e) => setNotesForTrip(trip.id, e.target.value)}
                              placeholder="Ex: Cliente específico, instruções especiais, etc."
                              rows={2}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center space-x-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentPage === 1
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                }`}
              >
                Primeira
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`p-2 rounded-lg transition-colors ${
                  currentPage === 1
                    ? 'text-slate-400 cursor-not-allowed'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                }`}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="px-4 py-2 text-sm text-slate-700 bg-white border border-slate-300 rounded-lg">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={`p-2 rounded-lg transition-colors ${
                  currentPage === totalPages
                    ? 'text-slate-400 cursor-not-allowed'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                }`}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentPage === totalPages
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                }`}
              >
                Última
              </button>
            </div>
          )}

          <div className="mt-4 text-center text-sm text-slate-600">
            Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, sortedTrips.length)} de {sortedTrips.length} viagens
          </div>
        </>
      )}
    </div>
  );
}
