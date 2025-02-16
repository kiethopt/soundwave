import * as XLSX from 'xlsx';

export function exportToExcel<T>(
  data: T[],
  columns: { key: string; header: string }[],
  filename: string
) {
  const worksheetData = [
    columns.map((col) => col.header),
    ...data.map((item: any) =>
      columns.map((col) => {
        // Cải thiện cách truy cập nested objects
        const value = col.key.split('.').reduce((obj, key) => {
          if (obj === null || obj === undefined) return '';
          return obj[key];
        }, item);

        // Xử lý đặc biệt cho trường artistProfile
        if (col.key.startsWith('artistProfile.')) {
          // Kiểm tra xem user có artistProfile và đã được verify chưa
          const artistProfile = item.artistProfile;
          if (!artistProfile || !artistProfile.isVerified) {
            return 'N/A';
          }

          // Nếu là các trường liên quan đến social media
          if (col.key.includes('socialMediaLinks')) {
            const links = artistProfile.socialMediaLinks || {};
            if (col.key.includes('facebook'))
              return links.facebook || 'Not provided';
            if (col.key.includes('instagram'))
              return links.instagram || 'Not provided';
            return 'Not provided';
          }

          // Trả về giá trị thực của trường artistProfile nếu có
          return value || 'N/A';
        }

        // Format dates
        if (
          typeof value === 'string' &&
          (value.includes('T') || value.match(/^\d{4}-\d{2}-\d{2}/))
        ) {
          try {
            return new Date(value).toLocaleString('vi-VN');
          } catch {
            return value;
          }
        }

        // Format boolean values
        if (typeof value === 'boolean') {
          if (col.key === 'isActive') {
            return value ? 'Active' : 'Inactive';
          }
          if (col.key === 'artistProfile.isVerified') {
            return value ? 'Verified' : 'Not Verified';
          }
          return value ? 'Yes' : 'No';
        }

        // Format numbers
        if (typeof value === 'number') {
          if (col.key === 'artistProfile.monthlyListeners') {
            return value.toLocaleString('vi-VN');
          }
          return value;
        }

        // Handle null/undefined/empty values
        if (value === null || value === undefined || value === '') {
          return '';
        }

        return value;
      })
    ),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Auto-size columns
  const maxWidths = worksheetData[0].map((_, i) =>
    Math.max(...worksheetData.map((row) => String(row[i]).length))
  );

  worksheet['!cols'] = maxWidths.map((width) => ({
    wch: Math.min(width + 2, 50), // Giới hạn độ rộng tối đa là 50
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}
