import * as fs from 'fs-extra';
import * as path from 'path';
import * as readline from 'readline';

// Định nghĩa interface cho file backup
interface BackupFile {
  fileName: string;
  filePath: string;
  stats: fs.Stats;
}

// Đường dẫn đến thư mục backups
const backupDir = path.join(__dirname, '../backups');

// Tạo interface để đọc input từ người dùng
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Lấy danh sách các file backup
function getBackups(): BackupFile[] {
  return fs
    .readdirSync(backupDir)
    .filter((file) => file.endsWith('.bak'))
    .map((file) => ({
      fileName: file,
      filePath: path.join(backupDir, file),
      stats: fs.statSync(path.join(backupDir, file)),
    }))
    .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());
}

// Hiển thị danh sách các file backup
function listBackups(): void {
  const backups = getBackups();

  if (backups.length === 0) {
    console.log('⚠️ Không có file backup nào');
    return;
  }

  console.log('\n===== DANH SÁCH FILE BACKUP =====');

  let totalSize = 0;

  backups.forEach((backup, index) => {
    const fileSizeMB = (backup.stats.size / (1024 * 1024)).toFixed(2);
    totalSize += backup.stats.size;

    console.log(`[${index + 1}] ${backup.fileName}`);
    console.log(`    ├── Kích thước: ${fileSizeMB} MB`);
    console.log(`    ├── Ngày tạo: ${backup.stats.mtime.toLocaleString()}`);
    console.log(`    └── Đường dẫn: ${backup.filePath}`);
  });

  console.log('\n===== THỐNG KÊ =====');
  console.log(`Tổng số file: ${backups.length}`);
  console.log(
    `Tổng dung lượng: ${(totalSize / (1024 * 1024)).toFixed(2)} MB\n`
  );
}

// Xóa file backup cũ
function deleteOldBackups(): void {
  const backups = getBackups();

  if (backups.length <= 5) {
    console.log('⚠️ Không đủ file backup để xóa (≤ 5 file)');
    showMenu();
    return;
  }

  // Giữ lại 5 file backup gần đây nhất
  const backupsToDelete = backups.slice(5);

  console.log(`\n⚠️ Sẽ xóa ${backupsToDelete.length} file backup cũ:`);
  backupsToDelete.forEach((backup, index) => {
    console.log(
      `[${index + 1}] ${backup.fileName} (${(
        backup.stats.size /
        (1024 * 1024)
      ).toFixed(2)} MB)`
    );
  });

  rl.question('\nBạn có muốn tiếp tục xóa? (y/N): ', (answer) => {
    if (answer.toLowerCase() !== 'y') {
      console.log('❌ Đã hủy thao tác xóa');
      showMenu();
      return;
    }

    try {
      backupsToDelete.forEach((backup) => {
        fs.unlinkSync(backup.filePath);
        console.log(`✅ Đã xóa: ${backup.fileName}`);
      });
      console.log(`\n✅ Đã xóa ${backupsToDelete.length} file backup cũ`);
    } catch (error) {
      console.error(
        '❌ Lỗi khi xóa file:',
        error instanceof Error ? error.message : String(error)
      );
    }

    showMenu();
  });
}

// Xóa một file backup cụ thể
function deleteSpecificBackup(): void {
  const backups = getBackups();

  if (backups.length === 0) {
    console.log('⚠️ Không có file backup nào để xóa');
    showMenu();
    return;
  }

  console.log('\n===== CHỌN FILE ĐỂ XÓA =====');
  backups.forEach((backup, index) => {
    console.log(
      `[${index + 1}] ${backup.fileName} (${(
        backup.stats.size /
        (1024 * 1024)
      ).toFixed(2)} MB)`
    );
  });

  rl.question('\nChọn số thứ tự file để xóa (nhập 0 để hủy): ', (answer) => {
    const index = parseInt(answer) - 1;

    if (isNaN(index) || index < -1 || index >= backups.length) {
      console.log('❌ Lựa chọn không hợp lệ');
      showMenu();
      return;
    }

    if (index === -1) {
      console.log('❌ Đã hủy thao tác xóa');
      showMenu();
      return;
    }

    const backupToDelete = backups[index];

    rl.question(
      `\n⚠️ Bạn có chắc chắn muốn xóa "${backupToDelete.fileName}"? (y/N): `,
      (confirm) => {
        if (confirm.toLowerCase() !== 'y') {
          console.log('❌ Đã hủy thao tác xóa');
          showMenu();
          return;
        }

        try {
          fs.unlinkSync(backupToDelete.filePath);
          console.log(`✅ Đã xóa file: ${backupToDelete.fileName}`);
        } catch (error) {
          console.error(
            '❌ Lỗi khi xóa file:',
            error instanceof Error ? error.message : String(error)
          );
        }

        showMenu();
      }
    );
  });
}

// Hiển thị menu chính
function showMenu(): void {
  console.clear();
  console.log('===== QUẢN LÝ BACKUP =====');
  console.log('[1] Liệt kê các file backup');
  console.log('[2] Xóa các file backup cũ (giữ lại 5 file mới nhất)');
  console.log('[3] Xóa file backup cụ thể');
  console.log('[0] Thoát');

  rl.question('\nChọn tùy chọn: ', (answer) => {
    switch (answer) {
      case '1':
        listBackups();
        rl.question('\nNhấn Enter để quay lại menu chính...', () => {
          showMenu();
        });
        break;
      case '2':
        deleteOldBackups();
        break;
      case '3':
        deleteSpecificBackup();
        break;
      case '0':
        console.log('👋 Tạm biệt!');
        rl.close();
        break;
      default:
        console.log('❌ Lựa chọn không hợp lệ');
        showMenu();
        break;
    }
  });
}

// Bắt đầu chương trình
showMenu();
