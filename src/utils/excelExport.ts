export function exportToExcel(data: any[], filename: string) {
  const worksheet = createWorksheet(data);
  const csv = worksheetToCSV(worksheet);
  downloadCSV(csv, filename);
}

function createWorksheet(data: any[]): string[][] {
  if (data.length === 0) return [];

  const headers = Object.keys(data[0]);
  const rows = data.map(item => headers.map(header => {
    const value = item[header];
    if (value === null || value === undefined) return '';
    return String(value);
  }));

  return [headers, ...rows];
}

function worksheetToCSV(worksheet: string[][]): string {
  return worksheet
    .map(row => row.map(cell => {
      const cellStr = String(cell);
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    }).join(','))
    .join('\n');
}

function downloadCSV(csv: string, filename: string) {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
