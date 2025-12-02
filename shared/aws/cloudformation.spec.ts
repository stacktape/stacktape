import { StackStatus } from '@aws-sdk/client-cloudformation';
import { describe, expect, test } from 'bun:test';
import {
  STACK_IS_READY_FOR_MODIFYING_OPERATION_STATUS,
  STACK_IS_READY_FOR_ROLLBACK_OPERATION_STATUS,
  STACK_OPERATION_IN_PROGRESS_STATUS
} from './cloudformation';

describe('cloudformation', () => {
  describe('STACK_IS_READY_FOR_MODIFYING_OPERATION_STATUS', () => {
    test('should include CREATE_COMPLETE', () => {
      expect(STACK_IS_READY_FOR_MODIFYING_OPERATION_STATUS).toContain(StackStatus.CREATE_COMPLETE);
    });

    test('should include DELETE_COMPLETE', () => {
      expect(STACK_IS_READY_FOR_MODIFYING_OPERATION_STATUS).toContain(StackStatus.DELETE_COMPLETE);
    });

    test('should include UPDATE_COMPLETE', () => {
      expect(STACK_IS_READY_FOR_MODIFYING_OPERATION_STATUS).toContain(StackStatus.UPDATE_COMPLETE);
    });

    test('should include UPDATE_FAILED', () => {
      expect(STACK_IS_READY_FOR_MODIFYING_OPERATION_STATUS).toContain(StackStatus.UPDATE_FAILED);
    });

    test('should include ROLLBACK_COMPLETE', () => {
      expect(STACK_IS_READY_FOR_MODIFYING_OPERATION_STATUS).toContain(StackStatus.ROLLBACK_COMPLETE);
    });

    test('should include UPDATE_ROLLBACK_COMPLETE', () => {
      expect(STACK_IS_READY_FOR_MODIFYING_OPERATION_STATUS).toContain(StackStatus.UPDATE_ROLLBACK_COMPLETE);
    });

    test('should include IMPORT_COMPLETE', () => {
      expect(STACK_IS_READY_FOR_MODIFYING_OPERATION_STATUS).toContain(StackStatus.IMPORT_COMPLETE);
    });

    test('should include IMPORT_ROLLBACK_COMPLETE', () => {
      expect(STACK_IS_READY_FOR_MODIFYING_OPERATION_STATUS).toContain(StackStatus.IMPORT_ROLLBACK_COMPLETE);
    });

    test('should have 8 statuses', () => {
      expect(STACK_IS_READY_FOR_MODIFYING_OPERATION_STATUS).toHaveLength(8);
    });

    test('should not include in-progress statuses', () => {
      expect(STACK_IS_READY_FOR_MODIFYING_OPERATION_STATUS).not.toContain(StackStatus.CREATE_IN_PROGRESS);
      expect(STACK_IS_READY_FOR_MODIFYING_OPERATION_STATUS).not.toContain(StackStatus.UPDATE_IN_PROGRESS);
      expect(STACK_IS_READY_FOR_MODIFYING_OPERATION_STATUS).not.toContain(StackStatus.DELETE_IN_PROGRESS);
    });
  });

  describe('STACK_IS_READY_FOR_ROLLBACK_OPERATION_STATUS', () => {
    test('should include UPDATE_FAILED', () => {
      expect(STACK_IS_READY_FOR_ROLLBACK_OPERATION_STATUS).toContain(StackStatus.UPDATE_FAILED);
    });

    test('should include CREATE_FAILED', () => {
      expect(STACK_IS_READY_FOR_ROLLBACK_OPERATION_STATUS).toContain(StackStatus.CREATE_FAILED);
    });

    test('should include UPDATE_ROLLBACK_FAILED', () => {
      expect(STACK_IS_READY_FOR_ROLLBACK_OPERATION_STATUS).toContain(StackStatus.UPDATE_ROLLBACK_FAILED);
    });

    test('should have 3 statuses', () => {
      expect(STACK_IS_READY_FOR_ROLLBACK_OPERATION_STATUS).toHaveLength(3);
    });

    test('should only contain failed statuses', () => {
      STACK_IS_READY_FOR_ROLLBACK_OPERATION_STATUS.forEach((status) => {
        expect(status).toContain('FAILED');
      });
    });
  });

  describe('STACK_OPERATION_IN_PROGRESS_STATUS', () => {
    test('should include CREATE_IN_PROGRESS', () => {
      expect(STACK_OPERATION_IN_PROGRESS_STATUS).toContain(StackStatus.CREATE_IN_PROGRESS);
    });

    test('should include UPDATE_IN_PROGRESS', () => {
      expect(STACK_OPERATION_IN_PROGRESS_STATUS).toContain(StackStatus.UPDATE_IN_PROGRESS);
    });

    test('should include DELETE_IN_PROGRESS', () => {
      expect(STACK_OPERATION_IN_PROGRESS_STATUS).toContain(StackStatus.DELETE_IN_PROGRESS);
    });

    test('should include ROLLBACK_IN_PROGRESS', () => {
      expect(STACK_OPERATION_IN_PROGRESS_STATUS).toContain(StackStatus.ROLLBACK_IN_PROGRESS);
    });

    test('should include UPDATE_ROLLBACK_IN_PROGRESS', () => {
      expect(STACK_OPERATION_IN_PROGRESS_STATUS).toContain(StackStatus.UPDATE_ROLLBACK_IN_PROGRESS);
    });

    test('should include UPDATE_COMPLETE_CLEANUP_IN_PROGRESS', () => {
      expect(STACK_OPERATION_IN_PROGRESS_STATUS).toContain(StackStatus.UPDATE_COMPLETE_CLEANUP_IN_PROGRESS);
    });

    test('should include UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS', () => {
      expect(STACK_OPERATION_IN_PROGRESS_STATUS).toContain(StackStatus.UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS);
    });

    test('should include IMPORT_IN_PROGRESS', () => {
      expect(STACK_OPERATION_IN_PROGRESS_STATUS).toContain(StackStatus.IMPORT_IN_PROGRESS);
    });

    test('should include IMPORT_ROLLBACK_IN_PROGRESS', () => {
      expect(STACK_OPERATION_IN_PROGRESS_STATUS).toContain(StackStatus.IMPORT_ROLLBACK_IN_PROGRESS);
    });

    test('should include REVIEW_IN_PROGRESS', () => {
      expect(STACK_OPERATION_IN_PROGRESS_STATUS).toContain(StackStatus.REVIEW_IN_PROGRESS);
    });

    test('should have 10 statuses', () => {
      expect(STACK_OPERATION_IN_PROGRESS_STATUS).toHaveLength(10);
    });

    test('should contain only IN_PROGRESS statuses', () => {
      STACK_OPERATION_IN_PROGRESS_STATUS.forEach((status) => {
        expect(status).toContain('IN_PROGRESS');
      });
    });
  });

  describe('status arrays relationship', () => {
    test('modifying and rollback statuses should not overlap', () => {
      const modifyingSet = new Set(STACK_IS_READY_FOR_MODIFYING_OPERATION_STATUS);
      const rollbackSet = new Set(STACK_IS_READY_FOR_ROLLBACK_OPERATION_STATUS);

      const overlap = [...modifyingSet].filter((status) => rollbackSet.has(status));
      // UPDATE_FAILED appears in both lists
      expect(overlap).toHaveLength(1);
      expect(overlap[0]).toBe(StackStatus.UPDATE_FAILED);
    });

    test('ready and in-progress statuses should not overlap', () => {
      const readySet = new Set(STACK_IS_READY_FOR_MODIFYING_OPERATION_STATUS);
      const inProgressSet = new Set(STACK_OPERATION_IN_PROGRESS_STATUS);

      const overlap = [...readySet].filter((status) => inProgressSet.has(status));
      expect(overlap).toHaveLength(0);
    });

    test('rollback ready and in-progress should not overlap', () => {
      const rollbackReadySet = new Set(STACK_IS_READY_FOR_ROLLBACK_OPERATION_STATUS);
      const inProgressSet = new Set(STACK_OPERATION_IN_PROGRESS_STATUS);

      const overlap = [...rollbackReadySet].filter((status) => inProgressSet.has(status));
      expect(overlap).toHaveLength(0);
    });

    test('all arrays should contain unique values', () => {
      const checkUnique = (arr: any[]) => {
        const set = new Set(arr);
        expect(set.size).toBe(arr.length);
      };

      checkUnique(STACK_IS_READY_FOR_MODIFYING_OPERATION_STATUS);
      checkUnique(STACK_IS_READY_FOR_ROLLBACK_OPERATION_STATUS);
      checkUnique(STACK_OPERATION_IN_PROGRESS_STATUS);
    });
  });
});
