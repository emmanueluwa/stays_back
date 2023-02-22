import "dotenv/config";
import "reflect-metadata";
import express from "express";
import { ApolloServer } from 'apollo-server-express';
import { UserResolver } from "./UserResolver";
import { buildSchema } from "type-graphql";
// import { createConnection } from "typeorm";
import { AppDataSource } from "./data-source";
import cookieParser from "cookie-parser";
import { verify } from "jsonwebtoken";
import cors from 'cors';
import { User } from "./entity/User";
import { createAccessToken, createRefreshToken } from "./auth";
import { sendRefreshToken } from "./sendRefreshToken";



(async () => {
    const app = express();
    app.use(cors({
        credentials: true,
        origin: ["https://stays.vercel.app/", "https://stays-emmanueluwa.vercel.app/"],
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        allowedHeaders: ['Content-Type', 'Authorization'],
    }))
    app.use(cookieParser());
    app.get("/", (_req, res) => res.send("obota"));
    app.post("/refresh_token", async (req, res) => {
        const token = req.cookies.jid;

        if (!token) {
            return res.send({ ok: false, accessToken: "no token" });
        }

        let payload: any = null;

        try {
            payload = verify(token, process.env.REFRESH_TOKEN_SECRET!);
        } catch (err) {
            console.log(err);
            return res.send({ ok: false, accessToken: ""});
        }

        // valid token, access token can be sent back
        const user = await User.findOneBy({ id: payload.userId });

        if (!user) {
            return res.send({ ok: false, accessToken: "" });
        }

        if (user.tokenVersion !== payload.tokenVersion) {
            return res.send({ ok: false, accessToken: "" });
        }

        //create new refresh token
        sendRefreshToken(res, createRefreshToken(user))

        return res.send({ ok: true, accessToken: createAccessToken(user) });
    });

    //creating a connection
    await AppDataSource.initialize();

    const apolloServer = new ApolloServer({
        schema: await buildSchema({
            resolvers: [UserResolver]
        }),
        context: ({ req, res }) => ({ req, res })
    });

    await apolloServer.start()

    //adding graphql stuff to express server
    apolloServer.applyMiddleware({ app, cors: false });

    app.listen(4000, () => {
        console.log("express server started.")
    })
})()


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

