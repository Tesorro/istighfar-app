export type FamilyProgress = {
  targetCount: number;
  totalCount: number;
  todayCount: number;
  remainingCount: number;
  progressPercentage: number;
  goalReached: boolean;
  membersSubmittedToday: number;
  totalMembers: number;
};

export type HistoryDay = {
  date: string;
  totalCount: number;
  allMembersSubmitted: boolean;
};

export function toFamilyProgress(input: {
  targetCount: number;
  totalCount: number;
  todayCount: number;
  membersSubmittedToday: number;
  totalMembers: number;
}): FamilyProgress {
  const remainingCount = Math.max(input.targetCount - input.totalCount, 0);
  const progressPercentage =
    input.targetCount <= 0 ? 0 : Math.round((input.totalCount * 100_000) / input.targetCount) / 1000;

  return {
    targetCount: input.targetCount,
    totalCount: input.totalCount,
    todayCount: input.todayCount,
    remainingCount,
    progressPercentage,
    goalReached: input.totalCount >= input.targetCount && input.targetCount > 0,
    membersSubmittedToday: input.membersSubmittedToday,
    totalMembers: input.totalMembers,
  };
}

export function toHistoryDay(input: {
  date: string;
  totalCount: number;
  submittedCount: number;
  totalMembers: number;
}): HistoryDay {
  return {
    date: input.date,
    totalCount: input.totalCount,
    allMembersSubmitted: input.totalMembers > 0 && input.submittedCount >= input.totalMembers,
  };
}
