import { Arg, Mutation, Query, Resolver } from "type-graphql"
import {hash} from 'bcryptjs';
import { User } from "./entity/User";

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


  //mutations used to make change to db, eg update create
  @Mutation(() => Boolean)
  async login(
    @Arg('email') email: string,
    @Arg('password') password: string
  ) {

    //check user exists
    const user = await User.findOne({ where: { email } });

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