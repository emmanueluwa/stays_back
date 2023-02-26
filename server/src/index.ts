import "dotenv/config";
import "reflect-metadata";
import { __prod__, COOKIE_NAME } from "./constants";
import express from "express";
import { ApolloServer } from 'apollo-server-express';
import { UserResolver } from "./UserResolver";
import { PostResolver } from "./PostResolver";
import { buildSchema } from "type-graphql";
// import { createConnection } from "typeorm";
import { AppDataSource } from "./data-source";
import cors from 'cors';
import Redis from "ioredis";
// import { sendEmail } from "./utils/sendEmail";


const main = async () => {
    //creating a connection
    await AppDataSource.initialize();

    // sendEmail("bob@bob.com", "hello there");
    const session = require("express-session");
    const app = express();

    let RedisStore = require("connect-redis")(session)
    const redis = new Redis(); 

    app.use(
        cors({
            origin: "http://localhost:3000",
            credentials: true,
        })
    );

    app.use(
        session({
            name: COOKIE_NAME,
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
            },
            saveUninitialize: false,
            secret: 'onkcwaonjcaqon',
            resave: false,
        })
    );

    const apolloServer = new ApolloServer({
        schema: await buildSchema({
            resolvers: [UserResolver, PostResolver],
            validate: false
        }),
        context: ({ req, res }) => ({ req, res, redis })
    });

    await apolloServer.start()

    //adding graphql stuff to express server
    apolloServer.applyMiddleware({ 
        app, 
        cors: false 
    });

    app.listen(4000, () => {
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

