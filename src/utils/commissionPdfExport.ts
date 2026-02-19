import jsPDF from 'jspdf';

interface TripData {
  date: string;
  origin: string;
  destination: string;
  plate: string;
  commission: number;
}

interface ManualCommissionData {
  date: string;
  description: string;
  origin: string;
  commission: number;
}

interface DriverSummaryData {
  rank: number;
  name: string;
  totalCommission: number;
  tripCount: number;
  totalFreight?: number;
  manualCommissions?: number;
}

export const exportCommissionSummaryToPDF = (
  summaries: DriverSummaryData[],
  monthName: string,
  filename: string = 'comissoes-resumo'
) => {
  const doc = new jsPDF();
  let yPosition = 20;

  doc.setFontSize(18);
  doc.text('RELATÓRIO DE COMISSÕES', 105, yPosition, { align: 'center' });
  yPosition += 10;

  doc.setFontSize(14);
  doc.text(monthName.toUpperCase(), 105, yPosition, { align: 'center' });
  yPosition += 15;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Ranking de Motoristas', 20, yPosition);
  yPosition += 10;

  const totalCommission = summaries.reduce((sum, s) => sum + s.totalCommission, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Geral: R$ ${totalCommission.toFixed(2)}`, 20, yPosition);
  yPosition += 10;

  summaries.forEach((summary, index) => {
    if (yPosition > 270) {
      doc.addPage();
      yPosition = 20;
    }

    const bgColor = index === 0 ? [255, 243, 205] : index === 1 ? [241, 245, 249] : index === 2 ? [255, 237, 213] : [239, 246, 255];
    doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
    doc.rect(20, yPosition - 6, 170, 20, 'F');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`${summary.rank}. ${summary.name}`, 25, yPosition);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`${summary.tripCount} viagens`, 25, yPosition + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    const commissionText = `R$ ${summary.totalCommission.toFixed(2)}`;
    doc.text(commissionText, 185, yPosition + 2, { align: 'right' });

    yPosition += 25;
  });

  yPosition += 10;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text(`Relatório gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 105, yPosition, { align: 'center' });

  doc.save(`${filename}.pdf`);
};

export const exportDriverCommissionDetailsToPDF = (
  driverName: string,
  trips: TripData[],
  manualCommissions: ManualCommissionData[],
  monthName: string,
  filename: string = 'comissoes-detalhes'
) => {
  const doc = new jsPDF();
  let yPosition = 20;

  doc.setFontSize(18);
  doc.text('RELATÓRIO DE COMISSÕES', 105, yPosition, { align: 'center' });
  yPosition += 10;

  doc.setFontSize(14);
  doc.text(monthName.toUpperCase(), 105, yPosition, { align: 'center' });
  yPosition += 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Motorista: ${driverName}`, 105, yPosition, { align: 'center' });
  yPosition += 15;

  const totalTripsCommission = trips.reduce((sum, trip) => sum + trip.commission, 0);
  const totalManualCommission = manualCommissions.reduce((sum, manual) => sum + manual.commission, 0);
  const totalCommission = totalTripsCommission + totalManualCommission;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total de Comissões: R$ ${totalCommission.toFixed(2)}`, 20, yPosition);
  yPosition += 5;
  doc.text(`Viagens: R$ ${totalTripsCommission.toFixed(2)} | Comissões Manuais: R$ ${totalManualCommission.toFixed(2)}`, 20, yPosition);
  yPosition += 10;

  if (manualCommissions.length > 0) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('COMISSÕES MANUAIS', 20, yPosition);
    yPosition += 7;

    doc.setFillColor(239, 246, 255);
    doc.rect(20, yPosition, 170, 8, 'F');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Data', 25, yPosition + 5);
    doc.text('Descrição', 55, yPosition + 5);
    doc.text('Origem', 115, yPosition + 5);
    doc.text('Comissão', 165, yPosition + 5, { align: 'right' });
    yPosition += 10;

    doc.setFont('helvetica', 'normal');
    manualCommissions.forEach((manual) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }

      doc.text(manual.date, 25, yPosition);
      const descriptionLines = doc.splitTextToSize(manual.description, 55);
      doc.text(descriptionLines[0] || '', 55, yPosition);
      doc.text(manual.origin || '-', 115, yPosition);
      doc.text(`R$ ${manual.commission.toFixed(2)}`, 185, yPosition, { align: 'right' });
      yPosition += 7;
    });

    yPosition += 5;
  }

  if (trips.length > 0) {
    if (yPosition > 240) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('COMISSÕES DE VIAGENS', 20, yPosition);
    yPosition += 7;

    doc.setFillColor(240, 253, 244);
    doc.rect(20, yPosition, 170, 8, 'F');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Data', 25, yPosition + 5);
    doc.text('Origem', 50, yPosition + 5);
    doc.text('Destino', 90, yPosition + 5);
    doc.text('Placa', 135, yPosition + 5);
    doc.text('Comissão', 165, yPosition + 5, { align: 'right' });
    yPosition += 10;

    doc.setFont('helvetica', 'normal');
    trips.forEach((trip) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }

      doc.text(trip.date, 25, yPosition);
      doc.text(trip.origin.substring(0, 15), 50, yPosition);
      doc.text(trip.destination.substring(0, 15), 90, yPosition);
      doc.text(trip.plate, 135, yPosition);
      doc.text(`R$ ${trip.commission.toFixed(2)}`, 185, yPosition, { align: 'right' });
      yPosition += 7;
    });
  }

  yPosition += 10;
  if (yPosition > 280) {
    doc.addPage();
    yPosition = 20;
  }
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text(`Relatório gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 105, yPosition, { align: 'center' });

  doc.save(`${filename}.pdf`);
};

export const exportAllDriversDetailsToPDF = (
  driversData: Array<{
    driverName: string;
    trips: TripData[];
    manualCommissions: ManualCommissionData[];
    totalCommission: number;
  }>,
  monthName: string,
  filename: string = 'comissoes-todos-motoristas'
) => {
  const doc = new jsPDF();
  let yPosition = 20;

  doc.setFontSize(18);
  doc.text('RELATÓRIO COMPLETO DE COMISSÕES', 105, yPosition, { align: 'center' });
  yPosition += 10;

  doc.setFontSize(14);
  doc.text(monthName.toUpperCase(), 105, yPosition, { align: 'center' });
  yPosition += 15;

  const totalGeneral = driversData.reduce((sum, d) => sum + d.totalCommission, 0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Geral: R$ ${totalGeneral.toFixed(2)}`, 105, yPosition, { align: 'center' });
  yPosition += 15;

  driversData.forEach((driver, driverIndex) => {
    if (driverIndex > 0) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`${driver.driverName}`, 20, yPosition);
    yPosition += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total: R$ ${driver.totalCommission.toFixed(2)}`, 20, yPosition);
    yPosition += 10;

    if (driver.manualCommissions.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Comissões Manuais', 20, yPosition);
      yPosition += 7;

      doc.setFillColor(239, 246, 255);
      doc.rect(20, yPosition, 170, 8, 'F');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Data', 25, yPosition + 5);
      doc.text('Descrição', 55, yPosition + 5);
      doc.text('Comissão', 165, yPosition + 5, { align: 'right' });
      yPosition += 10;

      doc.setFont('helvetica', 'normal');
      driver.manualCommissions.forEach((manual) => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }

        doc.text(manual.date, 25, yPosition);
        const descriptionLines = doc.splitTextToSize(manual.description, 105);
        doc.text(descriptionLines[0] || '', 55, yPosition);
        doc.text(`R$ ${manual.commission.toFixed(2)}`, 185, yPosition, { align: 'right' });
        yPosition += 7;
      });

      yPosition += 5;
    }

    if (driver.trips.length > 0) {
      if (yPosition > 240) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Viagens', 20, yPosition);
      yPosition += 7;

      doc.setFillColor(240, 253, 244);
      doc.rect(20, yPosition, 170, 8, 'F');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Data', 25, yPosition + 5);
      doc.text('Origem', 50, yPosition + 5);
      doc.text('Destino', 90, yPosition + 5);
      doc.text('Placa', 135, yPosition + 5);
      doc.text('Comissão', 165, yPosition + 5, { align: 'right' });
      yPosition += 10;

      doc.setFont('helvetica', 'normal');
      driver.trips.forEach((trip) => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }

        doc.text(trip.date, 25, yPosition);
        doc.text(trip.origin.substring(0, 15), 50, yPosition);
        doc.text(trip.destination.substring(0, 15), 90, yPosition);
        doc.text(trip.plate, 135, yPosition);
        doc.text(`R$ ${trip.commission.toFixed(2)}`, 185, yPosition, { align: 'right' });
        yPosition += 7;
      });
    }
  });

  yPosition += 10;
  if (yPosition > 280) {
    doc.addPage();
    yPosition = 20;
  }
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text(`Relatório gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 105, yPosition, { align: 'center' });

  doc.save(`${filename}.pdf`);
};
