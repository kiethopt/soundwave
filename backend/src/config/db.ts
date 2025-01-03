import { Prisma, PrismaClient } from '@prisma/client';
import { clients } from '..';

const prisma = new PrismaClient({
  // Thêm middleware để bắt các events từ Prisma Studio
  log: [{ emit: 'event', level: 'query' }],
});

// Lắng nghe sự kiện query từ Prisma
prisma.$on('query', async (e) => {
  // Kiểm tra nếu là lệnh DELETE từ bảng user
  if (e.query.includes('DELETE FROM "User"')) {
    try {
      // Trích xuất ID từ câu query
      const match = e.query.match(/WHERE\s+"id"\s*=\s*'([^']+)'/i);
      if (match && match[1]) {
        const userId = match[1];
        console.log(
          'User deleted from Prisma Studio, broadcasting event...',
          userId
        );

        const logoutEvent = {
          type: 'FORCE_LOGOUT',
          userId: userId,
          message: 'Tài khoản không tồn tại',
          timestamp: new Date().toISOString(),
        };

        // Broadcast event
        await Promise.all(
          clients.map((client) =>
            Promise.resolve()
              .then(() => client(logoutEvent))
              .catch((error) =>
                console.error('Error sending logout event:', error)
              )
          )
        );
      }
    } catch (error) {
      console.error('Error handling Prisma Studio delete:', error);
    }
  }
});

// Định nghĩa extension
const userEventsExtension = Prisma.defineExtension({
  name: 'user-events',
  query: {
    user: {
      async delete({ args, query }) {
        // Lấy thông tin user trước khi xóa
        const user = await prisma.user.findUnique({
          where: args.where,
          select: { id: true },
        });

        // Thực hiện xóa
        const result = await query(args);

        if (user) {
          console.log('User deleted, broadcasting event...');
          const logoutEvent = {
            type: 'FORCE_LOGOUT',
            userId: user.id,
            message: 'Tài khoản không tồn tại',
            timestamp: new Date().toISOString(),
          };

          // Broadcast event trước khi return
          await Promise.all(
            clients.map((client) =>
              Promise.resolve()
                .then(() => client(logoutEvent))
                .catch((error) =>
                  console.error('Error sending logout event:', error)
                )
            )
          );
        }

        return result;
      },

      async update({ args, query }) {
        const result = await query(args);

        if (args.data.isActive === false) {
          console.log('User deactivated, broadcasting event...');
          const logoutEvent = {
            type: 'FORCE_LOGOUT',
            userId: args.where.id as string,
            message: 'Tài khoản đã bị vô hiệu hóa',
            timestamp: new Date().toISOString(),
          };

          // Broadcast event trước khi return
          await Promise.all(
            clients.map((client) =>
              Promise.resolve()
                .then(() => client(logoutEvent))
                .catch((error) =>
                  console.error('Error sending deactivation event:', error)
                )
            )
          );
        }

        return result;
      },
    },
  },
});

// Áp dụng extension
const xprisma = prisma.$extends(userEventsExtension);

export default xprisma;
