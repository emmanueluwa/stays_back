import { Arg, Ctx, Field, Int, Mutation, ObjectType, Query, Resolver, UseMiddleware } from "type-graphql"
import { hash, compare } from 'bcryptjs';
import { User } from "./entity/User";
import { MyContext } from "./MyContext";
import { createAccessToken, createRefreshToken } from "./auth";
import { isAuth } from "./isAuth";
import { sendRefreshToken } from "./sendRefreshToken";
import { AppDataSource } from "./data-source";
import { verify } from "jsonwebtoken";
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
  //forgot password
  @Mutation(() => Boolean)
  async forgotPassword(@Arg('email') email: string, @Ctx() { res }: MyContext) {

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