import { spawn, execSync } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as readline from 'readline';
import 'dotenv/config';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Lấy danh sách file backup
function listBackups(): string[] {
  const backupDir = path.join(__dirname, '../backups');
  const files = fs
    .readdirSync(backupDir)
    .filter((file) => file.endsWith('.bak'))
    .sort((a, b) => {
      const statsA = fs.statSync(path.join(backupDir, a));
      const statsB = fs.statSync(path.join(backupDir, b));
      return statsB.mtime.getTime() - statsA.mtime.getTime(); // Sắp xếp theo thời gian giảm dần
    });

  if (files.length === 0) {
    console.log('❌ Không tìm thấy file backup nào');
    process.exit(1);
  }

  return files;
}

// Chọn file backup để restore
function promptForBackup(): Promise<string> {
  const backupDir = path.join(__dirname, '../backups');
  return new Promise((resolve) => {
    const backups = listBackups();

    console.log('📁 Danh sách các file backup:');
    backups.forEach((file, index) => {
      const stats = fs.statSync(path.join(backupDir, file));
      const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(
        `[${index + 1}] ${file} (${fileSizeInMB} MB - ${new Date(
          stats.mtime
        ).toLocaleString()})`
      );
    });

    rl.question('📝 Chọn số thứ tự file backup để restore: ', (answer) => {
      const index = parseInt(answer) - 1;
      if (isNaN(index) || index < 0 || index >= backups.length) {
        console.log('❌ Lựa chọn không hợp lệ');
        process.exit(1);
      }
      resolve(path.join(backupDir, backups[index]));
    });
  });
}

// Xác nhận restore
function confirmRestore(): Promise<void> {
  return new Promise((resolve) => {
    rl.question(
      '⚠️ CẢNH BÁO: Restore sẽ ghi đè lên dữ liệu hiện tại. Tiếp tục? (y/N): ',
      (answer) => {
        if (answer.toLowerCase() !== 'y') {
          console.log('❌ Đã hủy thao tác restore');
          process.exit(0);
        }
        resolve();
      }
    );
  });
}

async function runRestore(): Promise<void> {
  try {
    const backupFile = await promptForBackup();
    await confirmRestore();

    console.log('🚀 Starting database restore process...');

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

    // Lệnh restore
    const pgRestoreCommand = `pg_restore -h 127.0.0.1 -p 5433 -v -d postgres "${backupFile}"`;

    // Xử lý output từ tunnel
    let tunnelReady = false;

    tunnel.stdout.on('data', (data: Buffer) => {
      console.log(`Tunnel: ${data.toString().trim()}`);

      // SỬA: Thay đổi điều kiện để kiểm tra khi tunnel đã bắt đầu lắng nghe
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
        process.exit(1);
      }
    }, 15000);

    // Hàm để chạy pg_restore sau khi tunnel sẵn sàng
    function runPgRestore(): void {
      clearTimeout(timeoutId);
      console.log('✅ Tunnel connected successfully');
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

        console.log(`✅ Restore completed successfully from: ${backupFile}`);
      } catch (error) {
        console.error(
          '❌ Restore failed:',
          error instanceof Error ? error.message : String(error)
        );
      } finally {
        // Luôn kết thúc tunnel khi hoàn tất
        tunnel.kill();
        rl.close();
        console.log('🔌 Tunnel closed');
      }
    }

    // Xử lý khi tunnel kết thúc
    tunnel.on('close', (code: number | null) => {
      if (code !== 0 && !tunnelReady) {
        console.error(`❌ Tunnel process exited with code ${code}`);
      }
    });
  } catch (error) {
    console.error(
      '❌ Lỗi:',
      error instanceof Error ? error.message : String(error)
    );
    rl.close();
  }
}

// Chạy restore
runRestore().catch((error) => {
  console.error('Unhandled error during restore:', error);
  process.exit(1);
});
