"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventExtension = void 0;
const client_1 = require("@prisma/client");
exports.eventExtension = client_1.Prisma.defineExtension((client) => {
    return client.$extends({
        model: {
            event: {
                createEvent(data) {
                    return client.event.create({ data });
                },
                updateEvent(where, data) {
                    return client.event.update({ where, data });
                },
                deleteEvent(where) {
                    return client.event.delete({ where });
                },
                joinEvent(eventId, userId) {
                    return client.eventJoin.create({
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
//# sourceMappingURL=event.extension.js.map