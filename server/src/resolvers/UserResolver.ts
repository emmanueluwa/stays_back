import { Arg, Ctx, Field, FieldResolver, Mutation, ObjectType, Query, Resolver, Root, UseMiddleware } from "type-graphql"
import { hash, compare } from 'bcryptjs';
import { User } from "../entity/User";
import { MyContext } from "../types";
import { AppDataSource } from "../data-source";
import { isAuth } from "../middleware/isAuth";
import { sendEmail } from "../utils/sendEmail";
import {v4} from 'uuid';
import { COOKIE_NAME, FORGET_PASSWORD_PREFIX } from "../constants";
import { UsernamePasswordInput } from "./UsernamePasswordInput";
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

  @Field(() => User, { nullable: true })
  user?: User;
}


//creating graphql schema
@Resolver(User)
export class UserResolver {
  //stop users from seeing other peoples emails
  @FieldResolver(() => String)
  email(@Root() user: User, @Ctx() { req }: MyContext) {
    //okay for user to see their own email
    if (req.session.userId === user.id) {
      return user.email;
    }
    //stop current user from seeing somone elses email
    return "";
  }
  
  
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
    const key = FORGET_PASSWORD_PREFIX + token;
    const userId = await redis.get(key);

    if (!userId) {
      return { errors: [
        {
          field: "token",
          message: "expired token",
        },
      ],
    };
    }

    const userIdNum = parseInt(userId)
    const user = await User.findOneBy({ id: userIdNum });

    if (!user) {
      return { errors: [
        {
          field: "token",
          message: "user no longer exists",
        },
      ],
    }
    }

    await User.update({ id: userIdNum }, { password: await hash(newPassword, 12) })

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
      // return {
      //   errors: [
      //     {
      //     field: "email",
      //     message: "email does not exist",
      //   },
      // ],
      // };

      //deter against guessing an email
      return true;
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
  async me(
    @Ctx() { req }: MyContext
  ) {
    //not logged in
    if (!req.session.userId) {
      return null;
    }

    return await User.findOneBy(req.session.userId);
  }


  //logging user out
  @Mutation(() => Boolean)
  async logout(@Ctx() { req, res }: MyContext) {
    //remove session in redis
    return new Promise((resolve => req.session.destroy(err => {
      res.clearCookie(COOKIE_NAME);
      if (err) {
        //incase of error
        console.log(err);
        resolve(false)
        return ;
      }

      resolve(true);
    })) 
      
    );
 }


  //logging in
  @Mutation(() => LoginResponse)
  async login(
    @Arg('email') email: string,
    @Arg('password') password: string,
    //access context for refresh token
    @Ctx() { req }: MyContext
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

    req.session.userId = user.id;

    return {
      user
    };
  }


  //mutations used to make change to db, eg update create

  //register user
  @Mutation(() => LoginResponse)
  async register(
    @Arg('options') options: UsernamePasswordInput,
    @Ctx() { req }: MyContext
  ): Promise<LoginResponse> {

    if (!options.email.includes('@')) {
      return {
        errors: [
          {
            field: "email",
            message: "invalid email"
          }
        ]
      }
    }

    /*
      TO DO:  NOT WORKING COME BACK AND REFACTOR
    */
    if (options.password.length <= 3) {
      return {
        errors: [
          {
            field: "password",
            message: "length must be greater than 3"
          }
        ]
      }
    }

    const hashedPassword = await hash(options.password, 12);
    let user;

    try {
      //inserting user into db
      // User.create({}).save()
      // or 
      const result = await AppDataSource
        .createQueryBuilder()
        .insert()
        .into(User)
        .values({
            email: options.email,
            password: hashedPassword
        })
        .returning("*").execute();
      user = result.raw[0];
    } catch (err) {
      if (err.code === "23505") {
        return {
          errors: [
            {
              field: "username",
              message: "username taken",
            },
          ],
        };
      }
    }

    //store user id session, setting cookie on user keeps them logged in
    req.session.userId = user.id;

    return { user };
  }
}