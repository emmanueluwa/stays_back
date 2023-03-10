"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
require("reflect-metadata");
const typeorm_1 = require("typeorm");
const User_1 = require("./entity/User");
const Post_1 = require("./entity/Post");
const Star_1 = require("./entity/Star");
require("dotenv-safe/config");
const path_1 = __importDefault(require("path"));
exports.AppDataSource = new typeorm_1.DataSource({
    type: "postgres",
    url: process.env.DATABASE_URL,
    synchronize: true,
    migrations: [path_1.default.join(__dirname, "./migrations/*")],
    logging: true,
    entities: [User_1.User, Post_1.Post, Star_1.Star],
});
//# sourceMappingURL=data-source.js.map