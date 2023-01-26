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


  //mutations used to make change to db, eg update create
  @Mutation()
  async register(
    @Arg('email') email: string,
    @Arg('password') password: string
  ) {

    const hashedPassword = await hash(password, 12);

    await User.insert({
      email,
      password: hashedPassword
    })
    return
  }
}