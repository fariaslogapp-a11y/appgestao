import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import type { TireInspectionForm, TireInspectionResponse, Vehicle } from '../types';

export interface ReportData {
  form: TireInspectionForm;
  vehicle: Vehicle | undefined;
  responses: TireInspectionResponse[];
}

export const exportToExcel = (data: ReportData[], filename: string = 'relatorio-pneus') => {
  const worksheetData: any[] = [];

  data.forEach((item, index) => {
    if (index > 0) worksheetData.push([]);

    worksheetData.push(['FICHA DE INSPEÇÃO DE PNEUS']);
    worksheetData.push(['']);
    worksheetData.push(['Veículo:', item.vehicle?.plate || 'N/A']);
    worksheetData.push(['Motorista:', item.form.driver_name]);
    worksheetData.push(['CPF:', item.form.driver_cpf]);
    worksheetData.push(['Status:', item.form.status === 'completed' ? 'Preenchido' : 'Pendente']);
    worksheetData.push(['Data de Criação:', new Date(item.form.created_at).toLocaleDateString('pt-BR')]);
    worksheetData.push(['Data de Conclusão:', item.form.completed_at ? new Date(item.form.completed_at).toLocaleDateString('pt-BR') : 'N/A']);
    worksheetData.push(['']);
    worksheetData.push(['Posição do Pneu', 'Marca', 'Medida', 'Profundidade (mm)', 'Recapado', 'Observações']);

    item.responses.forEach(response => {
      worksheetData.push([
        response.tire_position,
        response.tire_brand || '-',
        response.tire_size || '-',
        response.groove_depth || '-',
        response.is_retreaded ? 'Sim' : 'Não',
        response.notes || '-'
      ]);
    });
  });

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();

  worksheet['!cols'] = [
    { wch: 20 },
    { wch: 15 },
    { wch: 15 },
    { wch: 18 },
    { wch: 12 },
    { wch: 25 }
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório');
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

export const exportToPDF = (data: ReportData[], filename: string = 'relatorio-pneus') => {
  const doc = new jsPDF();
  let yPosition = 20;

  data.forEach((item, index) => {
    if (index > 0) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(16);
    doc.text('FICHA DE INSPEÇÃO DE PNEUS', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(11);
    doc.text(`Veículo: ${item.vehicle?.plate || 'N/A'}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Motorista: ${item.form.driver_name}`, 20, yPosition);
    yPosition += 7;
    doc.text(`CPF: ${item.form.driver_cpf}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Status: ${item.form.status === 'completed' ? 'Preenchido' : 'Pendente'}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Data de Criação: ${new Date(item.form.created_at).toLocaleDateString('pt-BR')}`, 20, yPosition);
    yPosition += 7;

    if (item.form.completed_at) {
      doc.text(`Data de Conclusão: ${new Date(item.form.completed_at).toLocaleDateString('pt-BR')}`, 20, yPosition);
      yPosition += 7;
    }

    yPosition += 5;

    const tableData = item.responses.map(response => [
      response.tire_position,
      response.tire_brand || '-',
      response.tire_size || '-',
      response.groove_depth || '-',
      response.is_retreaded ? 'Sim' : 'Não',
      response.notes || '-'
    ]);

    (doc as any).autoTable({
      head: [['Posição', 'Marca', 'Medida', 'Prof. (mm)', 'Recapado', 'Observações']],
      body: tableData,
      startY: yPosition,
      margin: 20,
      styles: {
        fontSize: 9,
        cellPadding: 3
      },
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [241, 245, 249]
      }
    });
  });

  doc.save(`${filename}.pdf`);
};
