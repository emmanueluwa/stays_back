import { Arg, Ctx, Field, Mutation, ObjectType, Query, Resolver, UseMiddleware } from "type-graphql"
import { hash, compare } from 'bcryptjs';
import { User } from "./entity/User";
import { MyContext } from "./MyContext";
import { createAccessToken, createRefreshToken } from "./auth";
import { isAuth } from "./isAuth";
require("dotenv").config();


//graphql type
@ObjectType()
class LoginResponse {
  @Field()
  accessToken: string;
}


//creating graphql schema
@Resolver()
export class UserResolver {
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
      throw new Error('invalid login')
    }

    //comparing password
    const valid = await compare(password, user.password)

    if (!valid) {
      throw new Error('invalid login')
    }

    //successful login
    res.cookie(
      "jid",
      createRefreshToken(user),
      {
        httpOnly: true
      }
    );


    return {
      accessToken: createAccessToken(user)
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