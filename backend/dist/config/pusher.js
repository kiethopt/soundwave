"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Pusher = require('pusher');
const pusher = new Pusher({
    appId: '1929752',
    key: 'd4a0aa9284e57e1bf07e',
    secret: 'c6bd416f0574005f2dc6',
    cluster: 'ap1',
    useTLS: true,
});
exports.default = pusher;
//# sourceMappingURL=pusher.js.map