"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const album_routes_1 = __importDefault(require("./routes/album.routes"));
const track_routes_1 = __importDefault(require("./routes/track.routes"));
const error_1 = require("./middleware/error");
const db_1 = __importDefault(require("./config/db"));
dotenv_1.default.config();
const app = (0, express_1.default)();
db_1.default
    .$connect()
    .then(() => {
    console.log('Successfully connected to database');
})
    .catch((error) => {
    console.error('Database connection error:', error);
    process.exit(1);
});
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/api/auth', auth_routes_1.default);
app.use('/api', album_routes_1.default);
app.use('/api', track_routes_1.default);
app.use(error_1.errorHandler);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
//# sourceMappingURL=index.js.map