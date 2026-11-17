import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import { tuiManager } from '@application-services/tui-manager';
import { rememberFreePlanNotice, showFreePlanNoticeAfterDeploy } from './free-plan-notice';

describe('the Free plan notice after a deploy', () => {
  afterEach(() => rememberFreePlanNotice(undefined));

  test('prints the sentence the Console sent', () => {
    const warn = spyOn(tuiManager, 'warn').mockImplementation(() => {});
    rememberFreePlanNotice('Day 3 of 7 over the Free limit. Flexible would cost about $62 this month.');
    showFreePlanNoticeAfterDeploy();
    expect(warn).toHaveBeenCalledWith('Day 3 of 7 over the Free limit. Flexible would cost about $62 this month.');
    warn.mockRestore();
  });

  test('prints nothing when the Console sent none or an empty one', () => {
    const warn = spyOn(tuiManager, 'warn').mockImplementation(() => {});
    showFreePlanNoticeAfterDeploy();
    rememberFreePlanNotice('  ');
    showFreePlanNoticeAfterDeploy();
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
