/**
 * Export utilities for reports (PDF, Excel, CSV)
 */

export const exportToCSV = (data, filename) => {
  if (!data || data.length === 0) return;

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Build CSV content
  let csv = headers.join(',') + '\n';
  
  data.forEach(row => {
    const values = headers.map(header => {
      let value = row[header];
      // Handle values with commas
      if (typeof value === 'string' && value.includes(',')) {
        value = `"${value}"`;
      }
      return value;
    });
    csv += values.join(',') + '\n';
  });

  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToExcel = async (data, filename) => {
  // Simplified - export as CSV with .xlsx extension
  exportToCSV(data, filename);
};

export const exportToPDF = async (reportHTML, filename) => {
  // Trigger browser print
  window.print();
};

export const printReport = () => {
  window.print();
};
