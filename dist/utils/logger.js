"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.morganStream = exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const env_1 = require("../config/env");
// Define log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};
// Define level colors
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
};
winston_1.default.addColors(colors);
// Define log format
const format = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }), winston_1.default.format.colorize({ all: true }), winston_1.default.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`));
// Define log transports
const transports = [
    new winston_1.default.transports.Console(),
];
// Add file transports in production
if (env_1.env.NODE_ENV === 'production') {
    transports.push(new winston_1.default.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    }), new winston_1.default.transports.File({
        filename: 'logs/combined.log',
        format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    }));
}
// Create the logger
exports.logger = winston_1.default.createLogger({
    level: env_1.env.NODE_ENV === 'development' ? 'debug' : 'info',
    levels,
    format,
    transports,
});
// Stream object for Morgan HTTP logging
exports.morganStream = {
    write: (message) => {
        exports.logger.http(message.substring(0, message.lastIndexOf('\n')));
    },
};
exports.default = exports.logger;
//# sourceMappingURL=logger.js.map