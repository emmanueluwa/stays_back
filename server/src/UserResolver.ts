import { Arg, Ctx, Field, Int, Mutation, ObjectType, Query, Resolver, UseMiddleware } from "type-graphql"
import { hash, compare } from 'bcryptjs';
import { User } from "./entity/User";
import { MyContext } from "./types";
import { createAccessToken, createRefreshToken } from "./auth";
import { isAuth } from "./isAuth";
import { sendRefreshToken } from "./sendRefreshToken";
import { AppDataSource } from "./data-source";
import { verify } from "jsonwebtoken";
import { sendEmail } from "./utils/sendEmail";
import {v4} from 'uuid';
import { FORGET_PASSWORD_PREFIX } from "./constants";
require("dotenv").config();

//type response for errors, user friendly error message for ui
@ObjectType()
class FieldError {
  @Field()
  field: string;
  @Field()
  message: string;
}

//graphql type
@ObjectType() 
class LoginResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field()
  accessToken?: string;
  @Field(() => User, { nullable: true })
  user?: User;
}


//creating graphql schema
@Resolver()
export class UserResolver {
  @Mutation(() => LoginResponse)
  async changePassword(
    @Arg('token') token: string,
    @Arg('newPassword') newPassword: string,
    @Ctx() {redis, req}: MyContext
  ): Promise<LoginResponse> {
    if (newPassword.length <= 2) {
      return { errors: [
        {
          field: "newPassword",
          message: "length must be greater than 2",
        },
      ],
      };
    }

    //validate token in redis
    const key = FORGET_PASSWORD_PREFIX + token
    const userId = await redis.get(key);
    if (!userId) {
      return { errors: [
        {
          field: "token",
          message: "expired token",
        },
      ],
    }
    }

    const user = await User.findOneBy({ id: parseInt(userId) });

    if (!user) {
      return { errors: [
        {
          field: "token",
          message: "user no longer exists",
        },
      ],
    }
    }

    user.password = await hash(newPassword, 12);

    redis.del()

    //log user in
    req.session.userId = user.id;

    return { user }
  }

  //forgot password
  @Mutation(() => Boolean)
  async forgotPassword(
    @Arg('email') email: string, 
    @Ctx() { redis }: MyContext
  ) {

    //check user exists
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return {
        errors: [
          {
          field: "email",
          message: "incorrect email/password",
        },
      ],
      };
    }

    const token = v4();

    //prefix infront of key allows seperation and ability to look them up
    await redis.set(FORGET_PASSWORD_PREFIX + token, user.id, "EX", 1000 * 60 * 60 * 24 ) //1day to change
    
    await sendEmail(
      email,
      `<a href="http://localhost:3000/change-password/${token}">reset password</a>`
    );

    return true;
  }

  @Query(() => String)
  obota() { 
    return "Obota!";
  }

  //testing protecting route
  @Query(() => String)
  //check if user has access
  @UseMiddleware(isAuth)
  lare(
    @Ctx() { payload }: MyContext
  ) {
    console.log(payload);
    return `user id: ${payload!.userId} lare!`;
  }

  //getting all users from db
  @Query(() => [User])
  users() {
    return User.find();
  } 


  //getting logged in user
  @Query(() => User, {nullable: true})
  me(
    @Ctx() context: MyContext
  ) {
    //read token from header to get user
    const authorization = context.req.headers['authorization'];

    if (!authorization) {
      return null;
    }

    try {
      const token = authorization.split(" ")[1];
      const payload: any = verify(token, process.env.ACCESS_TOKEN_SECRET!);
      return User.findOne({where: payload.userId});
    } catch(err) {
      console.log(err)
      return null;
    }
  }


  //logging user out
  @Mutation(() => Boolean)
  async logout(@Ctx() {res}: MyContext) {
    //send empty refresh token
    sendRefreshToken(res, "");
     
    return true;
 }


  /*
      REPLACE WITH A FORGOT PASSWORD FUNCTION
      NOT GOOD PRACTICE TO BE EXPOSED
  */
 @Mutation(() => Boolean)
 async revokeRefreshTokensForUser(
  @Arg('userId', () => Int) userId: number
 ) {
    await AppDataSource.getRepository(User)
      .increment({ id: userId }, "tokenVersion", 1);
     
    return true;
 }
    

  //logging in
  @Mutation(() => LoginResponse)
  async login(
    @Arg('email') email: string,
    @Arg('password') password: string,
    //access context for refresh token
    @Ctx() { res }: MyContext
  ): Promise<LoginResponse> {

    //check user exists
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return {
        errors: [
          {
          field: "email",
          message: "incorrect email/password",
        },
      ],
      };
    }

    //comparing password
    const valid = await compare(password, user.password)

    if (!valid) {
      return {
        errors: [
          {
          field: "password",
          message: "incorrect email/password",
        },
      ],
      };
    }

    //successful login
    sendRefreshToken(res, createRefreshToken(user));

    return {
      accessToken: createAccessToken(user),
      user
    };
  }


  //mutations used to make change to db, eg update create
  @Mutation(() => Boolean)
  async register(
    @Arg('email') email: string,
    @Arg('password') password: string
  ) {

    const hashedPassword = await hash(password, 12);

    try {
      //inserting user into db
      await User.insert({
        email,
        password: hashedPassword
      })
    } catch (err) {
      console.log(err);
      return false;
    }


    return true;
  }
}