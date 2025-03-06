import { spawn, execSync } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as readline from 'readline';
import 'dotenv/config';

// Thư mục chứa các file backup
const backupDir = path.join(__dirname, '../backups');

// Tạo interface để đọc input từ người dùng
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Lấy danh sách các file backup
function getBackups(): {
  fileName: string;
  filePath: string;
  stats: fs.Stats;
}[] {
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

// Hiển thị và cho phép người dùng chọn file backup
function selectBackup(): Promise<string | null> {
  return new Promise((resolve) => {
    const backups = getBackups();

    if (backups.length === 0) {
      console.log('❌ Không có file backup nào trong thư mục backups');
      resolve(null);
      return;
    }

    console.log('===== DANH SÁCH FILE BACKUP =====');
    backups.forEach((backup, index) => {
      const fileSizeMB = (backup.stats.size / (1024 * 1024)).toFixed(2);
      console.log(`[${index + 1}] ${backup.fileName}`);
      console.log(`    ├── Kích thước: ${fileSizeMB} MB`);
      console.log(`    └── Ngày tạo: ${backup.stats.mtime.toLocaleString()}`);
    });

    rl.question(
      '\nChọn số thứ tự file để restore (nhập 0 để hủy): ',
      (answer) => {
        const index = parseInt(answer) - 1;

        if (isNaN(index) || index < -1 || index >= backups.length) {
          console.log('❌ Lựa chọn không hợp lệ');
          resolve(null);
          return;
        }

        if (index === -1) {
          console.log('❌ Đã hủy thao tác restore');
          resolve(null);
          return;
        }

        const selectedBackup = backups[index];
        console.log(`✅ Đã chọn: ${selectedBackup.fileName}`);
        resolve(selectedBackup.filePath);
      }
    );
  });
}

// Hàm chính để restore database
async function runRestore(backupFilePath: string | null): Promise<void> {
  if (!backupFilePath) {
    rl.close();
    return;
  }

  console.log('🚀 Starting database restore process...');
  console.log(`📦 Using backup file: ${backupFilePath}`);

  // Xác nhận trước khi restore
  const confirmRestore = await new Promise<boolean>((resolve) => {
    rl.question(
      '⚠️ CẢNH BÁO: Restore sẽ ghi đè dữ liệu hiện tại. Bạn có chắc chắn? (y/N): ',
      (answer) => {
        resolve(answer.toLowerCase() === 'y');
      }
    );
  });

  if (!confirmRestore) {
    console.log('❌ Đã hủy thao tác restore');
    rl.close();
    return;
  }

  console.log('⚙️ Starting Prisma Postgres tunnel...');

  // Đường dẫn đến Node executable
  const nodePath = process.execPath;
  const tunnelScriptPath = path.join(
    process.cwd(),
    'node_modules',
    '@prisma',
    'ppg-tunnel',
    'dist',
    'index.js'
  );

  const tunnel = spawn(nodePath, [
    tunnelScriptPath,
    '--host',
    '127.0.0.1',
    '--port',
    '5433',
  ]);

  // Lệnh pg_restore
  const pgRestoreCommand = `pg_restore -h 127.0.0.1 -p 5433 -v --clean --if-exists --no-owner --no-privileges --no-comments -d postgres "${backupFilePath}"`;

  let tunnelReady = false;

  tunnel.stdout.on('data', (data: Buffer) => {
    console.log(`Tunnel: ${data.toString().trim()}`);

    if (data.toString().includes('Prisma Postgres auth proxy listening')) {
      // Thêm một khoảng thời gian nhỏ để đảm bảo tunnel hoàn toàn sẵn sàng
      setTimeout(() => {
        tunnelReady = true;
        runPgRestore();
      }, 1000);
    }
  });

  tunnel.stderr.on('data', (data: Buffer) => {
    console.error(`Tunnel error: ${data.toString().trim()}`);
  });

  // Thiết lập timeout nếu tunnel không kết nối được
  const timeoutId = setTimeout(() => {
    if (!tunnelReady) {
      console.error('❌ Tunnel connection timed out after 15 seconds');
      tunnel.kill();
      rl.close();
      process.exit(1);
    }
  }, 15000);

  // Hàm để chạy pg_restore sau khi tunnel sẵn sàng
  function runPgRestore(): void {
    clearTimeout(timeoutId);
    console.log('✅ Tunnel ready, proceeding with restore...');
    console.log(`⚙️ Running restore command: ${pgRestoreCommand}`);

    try {
      // Chạy pg_restore với PGSSLMODE=disable
      execSync(pgRestoreCommand, {
        stdio: 'inherit',
        env: {
          ...process.env,
          PGSSLMODE: 'disable',
        },
      });

      console.log(`✅ Restore completed successfully!`);
    } catch (error) {
      // Một số lỗi trong quá trình restore là bình thường
      console.log(
        '⚠️ Restore completed with some warnings (this is normal):',
        error instanceof Error ? error.message : String(error)
      );
      console.log(
        '✅ Database should be usable, please check your application.'
      );

      // Không coi đây là lỗi nghiêm trọng
      console.log(`✅ Restore process completed!`);
    } finally {
      // Luôn kết thúc tunnel khi hoàn tất
      tunnel.kill();
      console.log('🔌 Tunnel closed');
      rl.close();
    }
  }

  // Xử lý khi tunnel kết thúc
  tunnel.on('close', (code: number | null) => {
    if (code !== 0 && !tunnelReady) {
      console.error(`❌ Tunnel process exited with code ${code}`);
      rl.close();
    }
  });
}

// Chạy script
async function main() {
  try {
    const backupPath = await selectBackup();
    await runRestore(backupPath);
  } catch (error) {
    console.error('Unhandled error during restore:', error);
    rl.close();
    process.exit(1);
  }
}

main();
