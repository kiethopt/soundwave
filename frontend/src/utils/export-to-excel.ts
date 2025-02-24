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

        // Xử lý đặc biệt cho trường title để tránh Excel hiểu nhầm là ngày tháng
        if (col.key === 'title') {
          return { v: value, t: 's' }; // Chỉ định kiểu dữ liệu là string
        }

        // Xử lý đặc biệt cho trường artistProfile
        if (col.key.startsWith('artistProfile.')) {
          const artistProfile = item.artistProfile;
          if (!artistProfile || !artistProfile.isVerified) {
            return 'N/A';
          }

          if (col.key.includes('socialMediaLinks')) {
            const links = artistProfile.socialMediaLinks || {};
            if (col.key.includes('facebook'))
              return links.facebook || 'Not provided';
            if (col.key.includes('instagram'))
              return links.instagram || 'Not provided';
            return 'Not provided';
          }

          return value || 'N/A';
        }

        if (col.key === 'duration') {
          const duration = value as number;
          return `${Math.floor(duration / 60)}:${(duration % 60)
            .toString()
            .padStart(2, '0')}`;
        }

        if (col.key === 'featuredArtists') {
          const artists = (value as any[])?.map(
            (fa) => fa.artistProfile.artistName
          );
          return artists?.join(', ') || '';
        }

        if (col.key === 'playCount') {
          return (value as number).toLocaleString('vi-VN');
        }

        if (col.key === 'isActive') {
          return value ? 'Active' : 'Hidden';
        }

        if (col.key === 'album.title') {
          return item.album?.title || '';
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

  // Đặt kiểu dữ liệu cho cột title
  const titleCol = columns.findIndex((col) => col.key === 'title');
  if (titleCol !== -1) {
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let row = range.s.r + 1; row <= range.e.r; row++) {
      const cell = XLSX.utils.encode_cell({ r: row, c: titleCol });
      if (!worksheet[cell]) continue;
      worksheet[cell].t = 's'; // Đặt kiểu dữ liệu là string
    }
  }

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
