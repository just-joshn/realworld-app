import { bankAccountsResponseSchema } from "../models/schemas";
import type { BankAccount } from "../models";
import { omit } from "lodash/fp";
import gql from "graphql-tag";
import { dataMachine, dataServices } from "./dataMachine";
import { httpClient } from "../utils/asyncUtils";
import { apiUrl } from "../utils/apiConfig";

const listBankAccountQuery = gql`
  query ListBankAccount {
    listBankAccount {
      id
      uuid
      userId
      bankName
      accountNumber
      routingNumber
      isDeleted
      createdAt
      modifiedAt
    }
  }
`;

const deleteBankAccountMutation = gql`
  mutation DeleteBankAccount($id: ID!) {
    deleteBankAccount(id: $id)
  }
`;

const createBankAccountMutation = gql`
  mutation CreateBankAccount($bankName: String!, $accountNumber: String!, $routingNumber: String!) {
    createBankAccount(
      bankName: $bankName
      accountNumber: $accountNumber
      routingNumber: $routingNumber
    ) {
      id
      uuid
      userId
      bankName
      accountNumber
      routingNumber
      isDeleted
      createdAt
    }
  }
`;

const { load, change } = dataServices<BankAccount>();

export const bankAccountsMachine = dataMachine<BankAccount>("bankAccounts").provide({
  actors: {
    fetchData: load(async () => {
      const resp = await httpClient.post<unknown>(apiUrl("/graphql"), {
        operationName: "ListBankAccount",
        query: listBankAccountQuery.loc?.source.body,
      });
      return {
        results: bankAccountsResponseSchema.validateSync(resp.data).data.listBankAccount,
        pageData: {},
      };
    }),
    deleteData: change(async (_ctx, event) => {
      const payload = omit("type", event);
      const resp = await httpClient.post<unknown>(apiUrl("/graphql"), {
        operationName: "DeleteBankAccount",
        query: deleteBankAccountMutation.loc?.source.body,
        variables: payload,
      });
      return resp.data;
    }),
    createData: change(async (_ctx, event) => {
      const payload = omit("type", event);
      const resp = await httpClient.post<unknown>(apiUrl("/graphql"), {
        operationName: "CreateBankAccount",
        query: createBankAccountMutation.loc?.source.body,
        variables: payload,
      });
      return resp.data;
    }),
  },
});
