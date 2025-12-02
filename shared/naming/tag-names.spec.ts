import { describe, expect, test } from 'bun:test';
import { tagNames } from './tag-names';

describe('tag-names', () => {
  describe('tagNames object', () => {
    test('should have all required tag name functions', () => {
      expect(typeof tagNames.stackName).toBe('function');
      expect(typeof tagNames.projectName).toBe('function');
      expect(typeof tagNames.stage).toBe('function');
      expect(typeof tagNames.globallyUniqueStackHash).toBe('function');
      expect(typeof tagNames.hotSwapDeploy).toBe('function');
      expect(typeof tagNames.codeDigest).toBe('function');
      expect(typeof tagNames.autoscalingGroupName).toBe('function');
      expect(typeof tagNames.awsEcsClusterName).toBe('function');
      expect(typeof tagNames.awsCloudformationLogicalName).toBe('function');
      expect(typeof tagNames.cfAttributionLogicalName).toBe('function');
    });
  });

  describe('stackName', () => {
    test('should return correct tag name', () => {
      expect(tagNames.stackName()).toBe('stp:stack-name');
    });

    test('should return consistent value', () => {
      expect(tagNames.stackName()).toBe(tagNames.stackName());
    });
  });

  describe('projectName', () => {
    test('should return correct tag name', () => {
      expect(tagNames.projectName()).toBe('stp:project-name');
    });

    test('should return consistent value', () => {
      expect(tagNames.projectName()).toBe(tagNames.projectName());
    });
  });

  describe('stage', () => {
    test('should return correct tag name', () => {
      expect(tagNames.stage()).toBe('stp:stage');
    });

    test('should return consistent value', () => {
      expect(tagNames.stage()).toBe(tagNames.stage());
    });
  });

  describe('globallyUniqueStackHash', () => {
    test('should return correct tag name', () => {
      expect(tagNames.globallyUniqueStackHash()).toBe('stp:globally-unique-stack-hash');
    });

    test('should return consistent value', () => {
      expect(tagNames.globallyUniqueStackHash()).toBe(tagNames.globallyUniqueStackHash());
    });
  });

  describe('hotSwapDeploy', () => {
    test('should return correct tag name', () => {
      expect(tagNames.hotSwapDeploy()).toBe('stp:hotswap-deploy');
    });

    test('should return consistent value', () => {
      expect(tagNames.hotSwapDeploy()).toBe(tagNames.hotSwapDeploy());
    });
  });

  describe('codeDigest', () => {
    test('should return correct tag name', () => {
      expect(tagNames.codeDigest()).toBe('stp:code-digest');
    });

    test('should return consistent value', () => {
      expect(tagNames.codeDigest()).toBe(tagNames.codeDigest());
    });
  });

  describe('autoscalingGroupName', () => {
    test('should return correct tag name', () => {
      expect(tagNames.autoscalingGroupName()).toBe('stp:asg-name');
    });

    test('should return consistent value', () => {
      expect(tagNames.autoscalingGroupName()).toBe(tagNames.autoscalingGroupName());
    });
  });

  describe('awsEcsClusterName', () => {
    test('should return correct tag name', () => {
      expect(tagNames.awsEcsClusterName()).toBe('aws:ecs:clusterName');
    });

    test('should return consistent value', () => {
      expect(tagNames.awsEcsClusterName()).toBe(tagNames.awsEcsClusterName());
    });
  });

  describe('awsCloudformationLogicalName', () => {
    test('should return correct tag name', () => {
      expect(tagNames.awsCloudformationLogicalName()).toBe('aws:cloudformation:logical-id');
    });

    test('should return consistent value', () => {
      expect(tagNames.awsCloudformationLogicalName()).toBe(tagNames.awsCloudformationLogicalName());
    });
  });

  describe('cfAttributionLogicalName', () => {
    test('should return correct tag name', () => {
      expect(tagNames.cfAttributionLogicalName()).toBe('stp:cf:attributionLogicalName');
    });

    test('should return consistent value', () => {
      expect(tagNames.cfAttributionLogicalName()).toBe(tagNames.cfAttributionLogicalName());
    });
  });

  describe('tag name prefixes', () => {
    test('stacktape-specific tags should start with stp:', () => {
      expect(tagNames.stackName()).toMatch(/^stp:/);
      expect(tagNames.projectName()).toMatch(/^stp:/);
      expect(tagNames.stage()).toMatch(/^stp:/);
      expect(tagNames.globallyUniqueStackHash()).toMatch(/^stp:/);
      expect(tagNames.hotSwapDeploy()).toMatch(/^stp:/);
      expect(tagNames.codeDigest()).toMatch(/^stp:/);
      expect(tagNames.autoscalingGroupName()).toMatch(/^stp:/);
      expect(tagNames.cfAttributionLogicalName()).toMatch(/^stp:/);
    });

    test('AWS-specific tags should start with aws:', () => {
      expect(tagNames.awsEcsClusterName()).toMatch(/^aws:/);
      expect(tagNames.awsCloudformationLogicalName()).toMatch(/^aws:/);
    });
  });

  describe('tag name format', () => {
    test('all tag names should use kebab-case', () => {
      const allTagNames = [
        tagNames.stackName(),
        tagNames.projectName(),
        tagNames.stage(),
        tagNames.globallyUniqueStackHash(),
        tagNames.hotSwapDeploy(),
        tagNames.codeDigest(),
        tagNames.autoscalingGroupName()
      ];

      allTagNames.forEach((tagName) => {
        expect(tagName).toMatch(/^[a-z][a-z0-9\-:]*[a-z0-9]$/);
      });
    });
  });
});
