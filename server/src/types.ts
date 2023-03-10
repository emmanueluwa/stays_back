import { Request, Response } from "express";
import Redis from "ioredis";
import { createUserLoader } from "./utils/createUserLoader";

export type MyContext = {
  req: Request & { session: Express.Session  };
  redis: Redis;
  res: Response;
  payload: any;
  userLoader: ReturnType<typeof createUserLoader>;
}