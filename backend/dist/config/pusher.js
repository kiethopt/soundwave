"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Pusher = require('pusher');
const pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID || '',
    key: process.env.PUSHER_KEY || '',
    secret: process.env.PUSHER_SECRET || '',
    cluster: process.env.PUSHER_CLUSTER || 'ap1',
    useTLS: true,
});
exports.default = pusher;
//# sourceMappingURL=pusher.js.map