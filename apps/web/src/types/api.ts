export type User = {
  id: string;
  name: string;
  email: string;
  familyId: string | null;
  createdAt: string;
};

export type AuthSession = {
  accessToken: string;
  user: User;
};

export type FamilySummary = {
  id: string;
  name: string;
  targetCount: number;
  timezone: string;
  memberCount: number;
  createdAt: string;
};

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

export type TodayProgress = {
  date: string;
  timezone: string;
  isSubmitted: boolean;
  count: number | null;
  progressId: string | null;
};

export type HistoryDay = {
  date: string;
  totalCount: number;
  allMembersSubmitted: boolean;
};

export type InvitationResponse = {
  token: string;
  expiresAt: string;
};
