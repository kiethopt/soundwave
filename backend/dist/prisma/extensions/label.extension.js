"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.labelExtension = void 0;
const client_1 = require("@prisma/client");
exports.labelExtension = client_1.Prisma.defineExtension((client) => {
    return client.$extends({
        query: {
            label: {
                findMany(_a) {
                    return __awaiter(this, arguments, void 0, function* ({ args, query }) {
                        if (!args.orderBy) {
                            args.orderBy = { name: 'asc' };
                        }
                        return query(args);
                    });
                },
            },
        },
    });
});
//# sourceMappingURL=label.extension.js.map