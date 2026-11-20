import { addDays, dateOnlyUtc, todayIso, toIsoDate } from '../src/progress/dates';
import { toFamilyProgress, toHistoryDay } from '../src/progress/stats';

describe('family calendar dates', () => {
  it('uses the family timezone around midnight', () => {
    const instant = new Date('2026-11-20T22:30:00.000Z');
    expect(todayIso('Europe/Moscow', instant)).toBe('2026-11-21');
    expect(todayIso('UTC', instant)).toBe('2026-11-20');
  });

  it('stores a calendar date without shifting the day', () => {
    const date = dateOnlyUtc('2026-11-20');
    expect(toIsoDate(date)).toBe('2026-11-20');
    expect(addDays('2026-11-20', -1)).toBe('2026-11-19');
  });
});

describe('aggregate stats', () => {
  it('calculates the shared total without a personal breakdown', () => {
    const progress = toFamilyProgress({
      targetCount: 1_000_000,
      totalCount: 347_250,
      todayCount: 3_500,
      membersSubmittedToday: 2,
      totalMembers: 2,
    });

    expect(progress).toEqual({
      targetCount: 1_000_000,
      totalCount: 347_250,
      todayCount: 3_500,
      remainingCount: 652_750,
      progressPercentage: 34.725,
      goalReached: false,
      membersSubmittedToday: 2,
      totalMembers: 2,
    });
    expect(Object.keys(progress).sort()).toEqual(
      [
        'goalReached',
        'membersSubmittedToday',
        'progressPercentage',
        'remainingCount',
        'targetCount',
        'todayCount',
        'totalCount',
        'totalMembers',
      ].sort(),
    );
  });

  it('marks a day complete only when every member has a record', () => {
    expect(
      toHistoryDay({ date: '2026-11-20', totalCount: 3500, submittedCount: 2, totalMembers: 2 }),
    ).toEqual({ date: '2026-11-20', totalCount: 3500, allMembersSubmitted: true });
    expect(
      toHistoryDay({ date: '2026-11-19', totalCount: 1500, submittedCount: 1, totalMembers: 2 }).allMembersSubmitted,
    ).toBe(false);
  });
});
