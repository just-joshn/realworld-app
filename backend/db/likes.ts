import { v4 } from "uuid";
import shortid from "shortid";
import type { Like } from "../../src/models";
import { required } from "../required";
import { LIKE_TABLE, getBy, insertRow, rows, select } from "./store";
import { createLikeNotification } from "./notifications";
import { getTransactionById } from "./transactions";

export const getLikeBy = (key: string, value: unknown): Like =>
  required(getBy(LIKE_TABLE, key, value), "like");
export const getLikesByObj = (query: object) => select(rows(LIKE_TABLE), query);

export const getLikeById = (id: string): Like => getLikeBy("id", id);
export const getLikesByTransactionId = (transactionId: string) => getLikesByObj({ transactionId });

export const createLike = (userId: string, transactionId: string): Like => {
  const like = {
    id: shortid(),
    uuid: v4(),
    userId,
    transactionId,
    createdAt: new Date(),
    modifiedAt: new Date(),
  };

  insertRow(LIKE_TABLE, like);
  return like;
};

export const createLikes = (userId: string, transactionId: string) => {
  const { senderId, receiverId } = required(getTransactionById(transactionId), "transaction");

  const like = createLike(userId, transactionId);

  if (userId !== senderId || userId !== receiverId) {
    createLikeNotification(senderId, transactionId, like.id);
    createLikeNotification(receiverId, transactionId, like.id);
  } else if (userId === senderId) {
    createLikeNotification(senderId, transactionId, like.id);
  } else {
    createLikeNotification(receiverId, transactionId, like.id);
  }
};
