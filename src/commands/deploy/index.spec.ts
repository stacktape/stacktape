import { describe, expect, test } from "bun:test";
import { performFullDeploy } from "./full-deploy";

describe("performFullDeploy", () => {
  test("retains uploaded artifacts whenever the CloudFormation deployment throws", async () => {
    const events: string[] = [];
    const deploymentError = new Error("Service failed to start");
    const deploymentArtifacts = {
      cloudformationTemplateUrl: "https://example.com/template.yml",
      deleteArtifactsRollbackedDeploy: async () => {
        events.push("delete-failed-deploy");
      },
      deleteArtifactsFixedDeploy: async () => {
        events.push("delete-fixed-deploy");
      },
      deleteAllObsoleteArtifacts: async () => {
        events.push("delete-obsolete");
      },
    };

    const operation = performFullDeploy({
      deploymentArtifacts,
      stack: {
        deployStack: async () => {
          events.push("deploy");
          throw deploymentError;
        },
        existingStackDetails: undefined,
      },
      tui: { warn: (message) => events.push(`warn:${message}`) },
    });

    await expect(operation).rejects.toBe(deploymentError);
    expect(events).toEqual(["deploy"]);
  });

  test("prunes obsolete artifacts only after CloudFormation succeeds", async () => {
    const events: string[] = [];

    await performFullDeploy({
      deploymentArtifacts: {
        cloudformationTemplateUrl: "https://example.com/template.yml",
        deleteArtifactsFixedDeploy: async () => {
          events.push("delete-fixed-deploy");
        },
        deleteAllObsoleteArtifacts: async () => {
          events.push("delete-obsolete");
        },
      },
      stack: {
        deployStack: async () => {
          events.push("deploy");
          return { warningMessages: ["warning"] };
        },
        existingStackDetails: { StackStatus: "UPDATE_FAILED" },
      },
      tui: { warn: (message) => events.push(`warn:${message}`) },
    });

    expect(events).toEqual(["deploy", "warn:warning", "delete-fixed-deploy", "delete-obsolete"]);
  });
});
