import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { getJavaLambdaHandler } from './java-lambda-buildpack';

let root: string;

const files = {
  'functions/tax/src/main/java/shelf/TaxHandler.java': 'package shelf;\n\npublic class TaxHandler {}\n',
  'src/main/java/com/example/Handler.java':
    '/*\n * Copyright. This package is licensed under MIT.\n */\npackage com.example;\n\npublic class Handler {}\n',
  // Gradle's `java` plugin and Maven only expect `src/main/java`; the declaration is what the JVM loads.
  'handlers/Orders.java': 'package com.shop.orders;\npublic class Orders {}\n',
  'src/main/java/Plain.java': 'public class Plain {}\n'
};

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'stacktape-java-handler-'));
  await Promise.all(
    Object.entries(files).map(async ([path, contents]) => {
      await mkdir(dirname(join(root, path)), { recursive: true });
      await writeFile(join(root, path), contents);
    })
  );
});

afterAll(() => rm(root, { recursive: true, force: true }));

describe('Java Lambda handler', () => {
  test.each([
    // The r2gg dogfood: the folder name `shelf` became the handler, and Lambda could not load class `shelf`.
    ['functions/tax/src/main/java/shelf/TaxHandler.java', undefined, 'shelf.TaxHandler::handleRequest'],
    // The method alone, and `Class::method` as `init` writes it: both resolve the package from the entry file.
    ['functions/tax/src/main/java/shelf/TaxHandler.java', 'handleRequest', 'shelf.TaxHandler::handleRequest'],
    [
      'functions/tax/src/main/java/shelf/TaxHandler.java',
      'TaxHandler::handleRequest',
      'shelf.TaxHandler::handleRequest'
    ],
    // A class name alone is a class, not a method named `TaxHandler`.
    ['functions/tax/src/main/java/shelf/TaxHandler.java', 'TaxHandler', 'shelf.TaxHandler::handleRequest'],
    ['src/main/java/Plain.java', 'Plain', 'Plain::handleRequest'],
    ['src/main/java/com/example/Handler.java', undefined, 'com.example.Handler::handleRequest'],
    ['src/main/java/com/example/Handler.java', 'process', 'com.example.Handler::process'],
    ['src/main/java/com/example/Handler.java', 'Other::handle', 'com.example.Other::handle'],
    ['src/main/java/com/example/Handler.java', 'org.acme.Other::handle', 'org.acme.Other::handle'],
    ['handlers/Orders.java', undefined, 'com.shop.orders.Orders::handleRequest'],
    ['src/main/java/Plain.java', undefined, 'Plain::handleRequest'],
    // A file that is not there yet, as in a config check before checkout: the source layout gives the package.
    ['src/main/java/org/acme/Missing.java', undefined, 'org.acme.Missing::handleRequest']
  ])('%s with handlerFunction %p is %s', (entryfilePath, handlerFunction, expected) => {
    expect(getJavaLambdaHandler({ cwd: root, entryfilePath, handlerFunction })).toBe(expected);
  });
});
