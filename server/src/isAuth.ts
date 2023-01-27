import { MiddlewareFn } from "type-graphql";
import { MyContext } from "./MyContext";
import { verify }  from 'jsonwebtoken';

// expecting user to send:
//   header called authorization with format, bearer oinwvoidna727 

export const isAuth: MiddlewareFn<MyContext> = ({context}, next) => {
    const authorization = context.req.headers['authorization'];

    if (!authorization) {
      throw new Error('not authenticated');
    }

    try {
      const token = authorization.split(' ')[1];
      const payload = verify(token, process.env.ACCESS_TOKEN_SECRET!);
      //gives access to current id of user in resolver
      context.payload = payload as any;
    } catch(err) {
      console.log(err)
      throw new Error('not authenticated');
    }
    

    //done with current middleware logic, go to resolver
    return next()
  }