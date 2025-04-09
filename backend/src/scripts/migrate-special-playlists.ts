import prisma from "../config/db";

async function migrateSpecialPlaylistsToSystemType() {
  try {
    console.log("Bắt đầu cập nhật các playlist đặc biệt sang type SYSTEM");

    // Cập nhật tất cả Vibe Rewind playlists
    const vibeRewindResult = await prisma.playlist.updateMany({
      where: {
        name: "Vibe Rewind",
        type: "NORMAL",
      },
      data: {
        type: "SYSTEM",
      },
    });

    console.log(
      `Đã cập nhật ${vibeRewindResult.count} playlist Vibe Rewind sang type SYSTEM`
    );

    // Cập nhật tất cả Welcome Mix playlists
    const welcomeMixResult = await prisma.playlist.updateMany({
      where: {
        name: "Welcome Mix",
        type: "NORMAL",
      },
      data: {
        type: "SYSTEM",
      },
    });

    console.log(
      `Đã cập nhật ${welcomeMixResult.count} playlist Welcome Mix sang type SYSTEM`
    );

    console.log("Hoàn thành cập nhật!");
  } catch (error) {
    console.error("Lỗi khi cập nhật playlist:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Chạy script
migrateSpecialPlaylistsToSystemType();
