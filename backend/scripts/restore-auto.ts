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

    // Xử lý output từ tunnel
    let tunnelReady = false;

    tunnel.stdout.on('data', (data: Buffer) => {
      console.log(`Tunnel: ${data.toString().trim()}`);

      if (data.toString().includes('Prisma Postgres auth proxy listening')) {
        setTimeout(() => {
          tunnelReady = true;
          resetAndRestoreDatabase();
        }, 1000);
      }
    });

    tunnel.stderr.on('data', (data: Buffer) => {
      console.error(`Tunnel error: ${data.toString().trim()}`);
    });

    const timeoutId = setTimeout(() => {
      if (!tunnelReady) {
        console.error('❌ Tunnel connection timed out after 15 seconds');
        tunnel.kill();
        process.exit(1);
      }
    }, 15000);

    // Hàm mới: reset và restore database với xác nhận bổ sung
    async function resetAndRestoreDatabase(): Promise<void> {
      clearTimeout(timeoutId);
      console.log(
        '✅ Tunnel ready, proceeding with database reset and restore...'
      );

      // Thêm bước xác nhận bổ sung trước khi reset database
      return new Promise<void>((resolve) => {
        console.log('\n⚠️ ===== NGUY HIỂM! XÓA TOÀN BỘ DỮ LIỆU ===== ⚠️');
        console.log(
          '🚨 Quá trình này sẽ XÓA HOÀN TOÀN tất cả dữ liệu hiện có trong database'
        );
        console.log('🚨 Các bảng, ràng buộc và dữ liệu sẽ bị xóa vĩnh viễn');
        console.log(
          '🚨 Chỉ tiếp tục nếu bạn đã sao lưu tất cả thông tin quan trọng\n'
        );

        rl.question(
          '👉 Để tiếp tục, vui lòng gõ "RESET" (viết HOA): ',
          (confirmation) => {
            if (confirmation !== 'RESET') {
              console.log(
                '❌ Đã hủy thao tác restore do không xác nhận reset database'
              );
              tunnel.kill();
              rl.close();
              process.exit(0);
            }

            console.log('✅ Xác nhận thành công, tiến hành reset database...');

            // Tiếp tục với quy trình reset và restore
            try {
              // BƯỚC 1: Xóa bảng hiện có bằng cách sử dụng lệnh DELETE
              console.log('🗑️ Xóa tất cả dữ liệu từ các bảng...');

              // Sử dụng DELETE FROM thay vì TRUNCATE để tránh xung đột với triggers
              const deleteCommand = `
              psql -h 127.0.0.1 -p 5433 -d postgres -c "
                SET client_min_messages TO WARNING;
                DELETE FROM user_like_track;
                DELETE FROM playlist_track;
                DELETE FROM histories;
                DELETE FROM track_genre;
                DELETE FROM track_artist;
                DELETE FROM user_follow;
                DELETE FROM album_genre;
                DELETE FROM artist_genre;
                DELETE FROM tracks;
                DELETE FROM albums;
                DELETE FROM notifications;
                DELETE FROM events;
                DELETE FROM playlists;
                DELETE FROM artist_profiles;
                DELETE FROM users;
                DELETE FROM genres;
                DELETE FROM _prisma_migrations;
              "`;

              execSync(deleteCommand, {
                stdio: 'inherit',
                env: {
                  ...process.env,
                  PGSSLMODE: 'disable',
                },
              });

              console.log('✅ Dữ liệu hiện có đã được xóa thành công');

              // BƯỚC 2: Thay thế bước vô hiệu hóa ràng buộc bằng cách sử dụng nhiều flags hơn
              console.log('📥 Đang nạp dữ liệu từ backup...');

              // Thêm flags để xử lý tốt hơn việc khôi phục và khắc phục các lỗi phổ biến
              const restoreCommand = `pg_restore -h 127.0.0.1 -p 5433 -v --data-only --no-owner --no-privileges --disable-triggers --single-transaction --no-acl --clean --if-exists --exit-on-error=false -d postgres "${backupFile}"`;

              try {
                execSync(restoreCommand, {
                  stdio: 'inherit',
                  env: {
                    ...process.env,
                    PGSSLMODE: 'disable',
                  },
                });
              } catch (restoreError) {
                console.log(
                  '⚠️ Restore gặp một số lỗi nhưng vẫn hoàn thành. Một số dữ liệu có thể đã được khôi phục.'
                );
              }

              console.log(
                `✅ Đã hoàn thành quá trình khôi phục từ file: ${backupFile}`
              );
              console.log(
                '✳️ Ghi chú: Nếu xuất hiện thông báo lỗi trong quá trình khôi phục, một số dữ liệu vẫn có thể đã được nạp thành công.'
              );
              console.log(
                '✳️ Lưu ý rằng dữ liệu có thể không hoàn toàn nhất quán do lỗi ràng buộc khóa ngoại.'
              );
            } catch (error) {
              console.error(
                '❌ Database operation failed:',
                error instanceof Error ? error.message : String(error)
              );
            } finally {
              // Luôn kết thúc tunnel khi hoàn tất
              tunnel.kill();
              rl.close();
              console.log('🔌 Tunnel closed');
            }
          }
        );
      });
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
