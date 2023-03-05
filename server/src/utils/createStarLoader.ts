import DataLoader from "dataloader";
import { Star } from "src/entity/Star";
// import { In } from "typeorm";

/*
  postid and userid need to be known
  [{postId: 5, userId: 10}]
  return {postId: 5, userId: 10, value: 1}
*/

export const createStarLoader = () =>
  new DataLoader<{ postId: number, userId: number }, Star | null>(
    async (keys) => {
      // const stars = await Star.findOneBy({ where: {id: In(keys as any)} });
      const starIdToStar: Record<string, Star> = {};
      // stars.forEach((star) => {
      //   starIdToStar[`${star.userId}|${star.postId}`] = star;
      // });

      return keys.map((key) => starIdToStar[`${key.userId}|${key.postId}`]);

    })