import { Prisma } from '@prisma/client';

export const labelExtension = Prisma.defineExtension((client) => {
  return client.$extends({
    query: {
      label: {
        async findMany({ args, query }) {
          // Mặc định sắp xếp theo tên label nếu không có orderBy
          if (!args.orderBy) {
            args.orderBy = { name: 'asc' };
          }

          return query(args);
        },
      },
    },
  });
});
