import { spawn, execSync } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';
import 'dotenv/config';

// Tạo tên file backup với timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFilePath = path.join(
  __dirname,
  '../backups',
  `db-backup-${timestamp}.bak`
);

async function runBackup(): Promise<void> {
  console.log('🚀 Starting database backup process...');

  console.log('⚙️ Starting Prisma Postgres tunnel...');

  // Đường dẫn đến Node executable
  const nodePath = process.execPath;
  // Đường dẫn đến script của ppg-tunnel trong node_modules
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

  // Đặt lệnh pg_dump
  const pgDumpCommand = `pg_dump -h 127.0.0.1 -p 5433 -d postgres -Fc -v -n public -f "${backupFilePath}"`;

  let tunnelReady = false;

  tunnel.stdout.on('data', (data: Buffer) => {
    console.log(`Tunnel: ${data.toString().trim()}`);

    // SỬA: Thay đổi điều kiện để kiểm tra khi tunnel đã bắt đầu lắng nghe
    if (data.toString().includes('Prisma Postgres auth proxy listening')) {
      // Thêm một khoảng thời gian nhỏ để đảm bảo tunnel hoàn toàn sẵn sàng
      setTimeout(() => {
        tunnelReady = true;
        runPgDump();
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
      process.exit(1);
    }
  }, 15000); // Tăng thời gian timeout lên 15 giây

  // Hàm để chạy pg_dump sau khi tunnel sẵn sàng
  function runPgDump(): void {
    clearTimeout(timeoutId);
    console.log('✅ Tunnel ready, proceeding with backup...');
    console.log(`⚙️ Running backup command: ${pgDumpCommand}`);

    try {
      // Chạy pg_dump với PGSSLMODE=disable
      execSync(pgDumpCommand, {
        stdio: 'inherit',
        env: {
          ...process.env,
          PGSSLMODE: 'disable',
        },
      });

      console.log(`✅ Backup completed successfully: ${backupFilePath}`);
    } catch (error) {
      console.error(
        '❌ Backup failed:',
        error instanceof Error ? error.message : String(error)
      );
    } finally {
      // Luôn kết thúc tunnel khi hoàn tất
      tunnel.kill();
      console.log('🔌 Tunnel closed');
    }
  }

  // Xử lý khi tunnel kết thúc
  tunnel.on('close', (code: number | null) => {
    if (code !== 0 && !tunnelReady) {
      console.error(`❌ Tunnel process exited with code ${code}`);
    }
  });
}

// Chạy backup
runBackup().catch((error) => {
  console.error('Unhandled error during backup:', error);
  process.exit(1);
});
