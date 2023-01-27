import { Arg, Field, Mutation, ObjectType, Query, Resolver } from "type-graphql"
import {hash, compare} from 'bcryptjs';
import {sign} from 'jsonwebtoken';
import { User } from "./entity/User";
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

  //getting all users from db
  @Query(() => [User])
  users() {
    return User.find();
  }


  //logging in
  @Mutation(() => LoginResponse)
  async login(
    @Arg('email') email: string,
    @Arg('password') password: string
  ): Promise<LoginResponse> {

    //check user exists
    const user = await User.findOne({ where: { email } });

    if (!user) {
      throw new Error ('invalid login')
    }

    //comparing password
    const valid = await compare(password, user.password)

    if (!valid) {
      throw new Error ('invalid login')
    }

    //successful login



    return {
      //creating jwt token
      accessToken: sign({ userId: user.id}, process.env.SECRET_KEY as string, {
        expiresIn: "15m"
      })
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