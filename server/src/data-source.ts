import "reflect-metadata"
import { DataSource } from "typeorm"
import { User } from "./entity/User"
import { Post } from "./entity/Post"
import { Star } from "./entity/Star"


export const AppDataSource = new DataSource({
    type: "postgres",
    username: "postgres",
    password: "postgres",
    database: "stays-db",
    synchronize: true,
    logging: true,
    entities: [User, Post, Star],
})
