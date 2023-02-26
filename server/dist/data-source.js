"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
require("reflect-metadata");
const typeorm_1 = require("typeorm");
const User_1 = require("./entity/User");
const Post_1 = require("./entity/Post");
exports.AppDataSource = new typeorm_1.DataSource({
    type: "postgres",
    host: "localhost",
    port: 5432,
    username: "postgres",
    password: "postgres",
    database: "stays-auth",
    synchronize: true,
    logging: true,
    entities: [User_1.User, Post_1.Post],
    migrations: [],
    subscribers: [],
});
//# sourceMappingURL=data-source.js.map