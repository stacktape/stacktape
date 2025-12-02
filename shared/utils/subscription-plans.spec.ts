import { describe, expect, test } from 'bun:test';
import { getMaxOrganizationMembers } from './subscription-plans';

describe('subscription-plans utilities', () => {
  describe('getMaxOrganizationMembers', () => {
    test('should return 1 for personal organizations', () => {
      const result = getMaxOrganizationMembers({
        isPersonalOrg: true,
        subscriptionPlanType: 'FREE'
      });
      expect(result).toBe(1);
    });

    test('should return 1 for personal orgs regardless of plan type', () => {
      const freePlan = getMaxOrganizationMembers({
        isPersonalOrg: true,
        subscriptionPlanType: 'FREE'
      });
      const flexiblePlan = getMaxOrganizationMembers({
        isPersonalOrg: true,
        subscriptionPlanType: 'FLEXIBLE'
      });
      const enterprisePlan = getMaxOrganizationMembers({
        isPersonalOrg: true,
        subscriptionPlanType: 'ENTERPRISE'
      });

      expect(freePlan).toBe(1);
      expect(flexiblePlan).toBe(1);
      expect(enterprisePlan).toBe(1);
    });

    test('should return 25 for non-personal org with FLEXIBLE plan', () => {
      const result = getMaxOrganizationMembers({
        isPersonalOrg: false,
        subscriptionPlanType: 'FLEXIBLE'
      });
      expect(result).toBe(25);
    });

    test('should return Infinity for non-personal org with non-FLEXIBLE plan', () => {
      const freePlan = getMaxOrganizationMembers({
        isPersonalOrg: false,
        subscriptionPlanType: 'FREE'
      });
      const enterprisePlan = getMaxOrganizationMembers({
        isPersonalOrg: false,
        subscriptionPlanType: 'ENTERPRISE'
      });

      expect(freePlan).toBe(Infinity);
      expect(enterprisePlan).toBe(Infinity);
    });

    test('should return Infinity for non-personal org with undefined plan', () => {
      const result = getMaxOrganizationMembers({
        isPersonalOrg: false,
        subscriptionPlanType: undefined
      });
      expect(result).toBe(Infinity);
    });

    test('should return Infinity for non-personal org with null plan', () => {
      const result = getMaxOrganizationMembers({
        isPersonalOrg: false,
        subscriptionPlanType: null
      });
      expect(result).toBe(Infinity);
    });

    test('should handle different plan type formats', () => {
      const flexible1 = getMaxOrganizationMembers({
        isPersonalOrg: false,
        subscriptionPlanType: 'FLEXIBLE'
      });
      const flexible2 = getMaxOrganizationMembers({
        isPersonalOrg: false,
        subscriptionPlanType: 'flexible'
      });

      expect(flexible1).toBe(25);
      // lowercase 'flexible' should not match, returns Infinity
      expect(flexible2).toBe(Infinity);
    });

    test('should be case-sensitive for FLEXIBLE plan type', () => {
      const upper = getMaxOrganizationMembers({
        isPersonalOrg: false,
        subscriptionPlanType: 'FLEXIBLE'
      });
      const lower = getMaxOrganizationMembers({
        isPersonalOrg: false,
        subscriptionPlanType: 'flexible'
      });
      const mixed = getMaxOrganizationMembers({
        isPersonalOrg: false,
        subscriptionPlanType: 'Flexible'
      });

      expect(upper).toBe(25);
      expect(lower).toBe(Infinity);
      expect(mixed).toBe(Infinity);
    });

    test('should prioritize personal org check over plan type', () => {
      // Even with FLEXIBLE plan, personal org should return 1
      const result = getMaxOrganizationMembers({
        isPersonalOrg: true,
        subscriptionPlanType: 'FLEXIBLE'
      });
      expect(result).toBe(1);
    });

    test('should handle falsy values for isPersonalOrg', () => {
      const result1 = getMaxOrganizationMembers({
        isPersonalOrg: false,
        subscriptionPlanType: 'FLEXIBLE'
      });
      const result2 = getMaxOrganizationMembers({
        isPersonalOrg: 0 as any,
        subscriptionPlanType: 'FLEXIBLE'
      });
      const result3 = getMaxOrganizationMembers({
        isPersonalOrg: null as any,
        subscriptionPlanType: 'FLEXIBLE'
      });

      expect(result1).toBe(25);
      expect(result2).toBe(25);
      expect(result3).toBe(25);
    });

    test('should handle truthy values for isPersonalOrg', () => {
      const result1 = getMaxOrganizationMembers({
        isPersonalOrg: true,
        subscriptionPlanType: 'ENTERPRISE'
      });
      const result2 = getMaxOrganizationMembers({
        isPersonalOrg: 1 as any,
        subscriptionPlanType: 'ENTERPRISE'
      });
      const result3 = getMaxOrganizationMembers({
        isPersonalOrg: 'yes' as any,
        subscriptionPlanType: 'ENTERPRISE'
      });

      expect(result1).toBe(1);
      expect(result2).toBe(1);
      expect(result3).toBe(1);
    });
  });
});
