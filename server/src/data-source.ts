import "reflect-metadata"
import { DataSource } from "typeorm"
import { User } from "./entity/User"
import { Post } from "./entity/Post"
import { Star } from "./entity/Star"
import 'dotenv-safe/config';
import path from "path"


export const AppDataSource = new DataSource({
    type: "postgres",
    url: process.env.DATABASE_URL,
    synchronize: true,
    migrations: [path.join(__dirname, "./migrations/*")],
    logging: true,
    entities: [User, Post, Star],
})
