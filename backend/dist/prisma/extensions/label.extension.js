"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.labelExtension = void 0;
const client_1 = require("@prisma/client");
exports.labelExtension = client_1.Prisma.defineExtension((client) => {
    return client.$extends({
        query: {
            label: {
                async findMany({ args, query }) {
                    if (!args.orderBy) {
                        args.orderBy = { name: 'asc' };
                    }
                    return query(args);
                },
            },
        },
    });
});
//# sourceMappingURL=label.extension.js.map