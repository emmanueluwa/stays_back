import "dotenv/config";
import "reflect-metadata";
import { __prod__ } from "./constants";
import express from "express";
import session from "express-session";
import { ApolloServer } from 'apollo-server-express';
import { UserResolver } from "./resolvers/UserResolver";
import { PostResolver } from "./resolvers/PostResolver";
import { buildSchema } from "type-graphql";
// import { createConnection } from "typeorm";
import { AppDataSource } from "./data-source";
import cors from 'cors';
import Redis from "ioredis";
// import { Post } from "./entity/Post";
import { createUserLoader } from "./utils/createUserLoader";
// import { sendEmail } from "./utils/sendEmail";


const main = async () => {
    //creating a connection
    await AppDataSource.initialize();
    await AppDataSource.runMigrations();
    // await Post.delete({});

    // sendEmail("bob@bob.com", "hello there");
    // const session = require("express-session");
    const app = express();

    let RedisStore = require("connect-redis")(session)
    const redis = new Redis();

    /* 
        nginx sitting in front of api 
        telling express there is a proxy sitting in front so cookies, sessions work
    */
    app.set('trust proxy', 1);

    app.use(
        cors({
            credentials: true,
            origin: process.env.CORS_ORIGIN
        })
    );

    app.use(
        session({
            name: process.env.COOKIE_NAME,
            store: new RedisStore({ 
                client: redis,
                //reduce no. of requests made to redis
                disableTouch: true,
            }),
            cookie: {
                maxAge: 1000 * 60 * 60 * 24 * 365 * 10, // 10 years
                httpOnly: true,
                sameSite: 'lax',  // protecting csrf
                secure: __prod__,  // cookie only works in https
                // secure: false,  // cookie only works in https
                domain: __prod__ ? ".peteine.com" : undefined,

            },
            saveUninitialized: false,
            secret: process.env.SESSION_SECRET!,
            resave: false,
        })
    );


    const apolloServer = new ApolloServer({
        schema: await buildSchema({
            resolvers: [UserResolver, PostResolver],
            validate: false
        }),
        context: ({ req, res }) => ({ 
            req, 
            res, 
            redis,
            userLoader: createUserLoader(), 
        }),
    });

    await apolloServer.start()

    //adding graphql stuff to express server
    apolloServer.applyMiddleware({ 
        app,
        cors: {
        origin: [process.env.CORS_ORIGIN!],
        credentials: true
        },
    });

    app.listen(parseInt(process.env.PORT), () => {
        console.log("express server started.")
    })
};

main().catch((err) => {
    console.error(err);
});


// AppDataSource.initialize().then(async () => {

//     console.log("Inserting a new user into the database...")
//     const user = new User()
//     user.firstName = "Timber"
//     user.lastName = "Saw"
//     user.age = 25
//     await AppDataSource.manager.save(user)
//     console.log("Saved a new user with id: " + user.id)

//     console.log("Loading users from the database...")
//     const users = await AppDataSource.manager.find(User)
//     console.log("Loaded users: ", users)

//     console.log("Here you can setup and run express / fastify / any other framework.")

// }).catch(error => console.log(error))

