"use strict";
/*
    Dynamo.js -- AWS V3 SDK API

    This module provides a wrapper and convenience API over the AWS V3 SDK.
    It is used by OneTable internally and is not a public API.

    Use:
        import {Model, Table} from 'dynamodb-onetable'
        import Dynamo from 'dynamodb-onetable/Dynamo'

        const dynamo = new Dynamo(params)
        const table = new Table({ dynamo, ... })
*/
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Dynamo = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const util_dynamodb_1 = require("@aws-sdk/util-dynamodb");
class Dynamo {
    constructor(params = {}) {
        this.client = params.client;
        this.params = params;
        this.marshall = util_dynamodb_1.marshall;
        this.unmarshall = util_dynamodb_1.unmarshall;
        this.V3 = true;
    }
    createTable(params) {
        return __awaiter(this, void 0, void 0, function* () {
            let command = new client_dynamodb_1.CreateTableCommand(params);
            return yield this.send(command);
        });
    }
    deleteTable(params) {
        return __awaiter(this, void 0, void 0, function* () {
            let command = new client_dynamodb_1.DeleteTableCommand(params);
            return yield this.send(command);
        });
    }
    delete(params) {
        return __awaiter(this, void 0, void 0, function* () {
            let command = new client_dynamodb_1.DeleteItemCommand(params);
            return yield this.send(command);
        });
    }
    describeTable(params) {
        return __awaiter(this, void 0, void 0, function* () {
            let command = new client_dynamodb_1.DescribeTableCommand(params);
            return yield this.send(command);
        });
    }
    get(params) {
        return __awaiter(this, void 0, void 0, function* () {
            let command = new client_dynamodb_1.GetItemCommand(params);
            return yield this.send(command);
        });
    }
    find(params) {
        return __awaiter(this, void 0, void 0, function* () {
            let command = new client_dynamodb_1.QueryCommand(params);
            return yield this.send(command);
        });
    }
    listTables(params) {
        return __awaiter(this, void 0, void 0, function* () {
            let command = new client_dynamodb_1.ListTablesCommand(params);
            return yield this.send(command);
        });
    }
    put(params) {
        return __awaiter(this, void 0, void 0, function* () {
            let command = new client_dynamodb_1.PutItemCommand(params);
            return yield this.send(command);
        });
    }
    scan(params) {
        return __awaiter(this, void 0, void 0, function* () {
            let command = new client_dynamodb_1.ScanCommand(params);
            return yield this.send(command);
        });
    }
    update(params) {
        return __awaiter(this, void 0, void 0, function* () {
            let command = new client_dynamodb_1.UpdateItemCommand(params);
            return yield this.send(command);
        });
    }
    batchGet(params) {
        return __awaiter(this, void 0, void 0, function* () {
            let command = new client_dynamodb_1.BatchGetItemCommand(params);
            return yield this.send(command);
        });
    }
    batchWrite(params) {
        return __awaiter(this, void 0, void 0, function* () {
            let command = new client_dynamodb_1.BatchWriteItemCommand(params);
            return yield this.send(command);
        });
    }
    transactGet(params) {
        return __awaiter(this, void 0, void 0, function* () {
            let command = new client_dynamodb_1.TransactGetItemsCommand(params);
            return yield this.send(command);
        });
    }
    transactWrite(params) {
        return __awaiter(this, void 0, void 0, function* () {
            let command = new client_dynamodb_1.TransactWriteItemsCommand(params);
            return yield this.send(command);
        });
    }
    send(cmd) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.client.send(cmd);
        });
    }
}
exports.Dynamo = Dynamo;
exports.default = Dynamo;
