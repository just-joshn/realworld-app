import { v4 } from "uuid";
import shortid from "shortid";
import type { Comment } from "../../src/models";
import { required } from "../required";
import { COMMENT_TABLE, getBy, insertRow, rows, select } from "./store";
import { createCommentNotification } from "./notifications";
import { getTransactionById } from "./transactions";

export const getCommentBy = (key: string, value: unknown): Comment =>
  required(getBy(COMMENT_TABLE, key, value), "comment");
export const getCommentsByObj = (query: object) => select(rows(COMMENT_TABLE), query);

export const getCommentById = (id: string): Comment => getCommentBy("id", id);
export const getCommentsByTransactionId = (transactionId: string) =>
  getCommentsByObj({ transactionId });

export const createComment = (userId: string, transactionId: string, content: string): Comment => {
  const comment = {
    id: shortid(),
    uuid: v4(),
    content,
    userId,
    transactionId,
    createdAt: new Date(),
    modifiedAt: new Date(),
  };

  insertRow(COMMENT_TABLE, comment);
  return comment;
};

export const createComments = (userId: string, transactionId: string, content: string) => {
  const { senderId, receiverId } = required(getTransactionById(transactionId), "transaction");

  const comment = createComment(userId, transactionId, content);

  if (userId !== senderId || userId !== receiverId) {
    createCommentNotification(senderId, transactionId, comment.id);
    createCommentNotification(receiverId, transactionId, comment.id);
  } else if (userId === senderId) {
    createCommentNotification(senderId, transactionId, comment.id);
  } else {
    createCommentNotification(receiverId, transactionId, comment.id);
  }
};
