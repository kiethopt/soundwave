import { Prisma } from '@prisma/client';

export const eventExtension = Prisma.defineExtension((client) => {
  return client.$extends({
    model: {
      event: {
        
        createEvent(data: Prisma.EventCreateInput) {
          return client.event.create({ data });
        },

        /**
         * Cập nhật một Event theo ID
         * @param where 
         * @param data  - dữ liệu cập nhật
         */
        updateEvent(
          where: Prisma.EventWhereUniqueInput,
          data: Prisma.EventUpdateInput
        ) {
          return client.event.update({ where, data });
        },

        /**
         * Xoá một Event theo ID
         * @param where - điều kiện where (thường là { id: string })
         */
        deleteEvent(
          where: Prisma.EventWhereUniqueInput
        ) {
          return client.event.delete({ where });
        },

        /**
         * Thêm user tham gia Event.
         * @param eventId - ID của event
         * @param userId - ID của user
         */
        joinEvent(eventId: string, userId: string) {
          return client.eventParticipant.create({
            data: {
              eventId,
              userId,
            },
          });
        },
      },
    },
  });
});
