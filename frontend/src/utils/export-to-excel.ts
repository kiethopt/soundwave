import * as XLSX from 'xlsx';

export function exportToExcel<T>(
  data: T[],
  columns: { key: string; header: string }[],
  filename: string
) {
  // Tạo worksheet data từ data và columns
  const worksheetData = [
    // Header row
    columns.map((col) => col.header),
    // Data rows
    ...data.map((item: any) =>
      columns.map((col) => {
        // Xử lý nested objects với dot notation (vd: user.email)
        const value = col.key.split('.').reduce((obj, key) => obj?.[key], item);

        if (value instanceof Date) {
          return value.toLocaleString('vi-VN');
        }

        // Format date string
        if (col.key === 'verificationRequestedAt') {
          return new Date(value).toLocaleString('vi-VN');
        }

        // Format social media links
        if (col.key.startsWith('socialMediaLinks.')) {
          return value || 'Not provided';
        }

        // Format status
        if (col.key === 'isVerified') {
          return value ? 'Approved' : 'Pending';
        }

        // Format bio
        if (col.key === 'bio') {
          return value || 'No biography provided';
        }

        return value;
      })
    ),
  ];

  // Tạo worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Auto-size columns
  const maxWidths = worksheetData[0].map((_, i) =>
    Math.max(...worksheetData.map((row) => String(row[i]).length))
  );

  worksheet['!cols'] = maxWidths.map((width) => ({
    wch: Math.min(width + 2, 50),
  }));

  // Tạo workbook và thêm worksheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

  // Xuất file
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}
