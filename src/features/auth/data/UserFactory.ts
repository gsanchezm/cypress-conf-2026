export interface TestUser {
  username: string;
  password: string;
}

const DETERMINISTIC_USERS = {
  standard: { username: 'standard_user', password: 'pizza123' },
  lockedOut: { username: 'locked_out_user', password: 'pizza123' },
  problem: { username: 'problem_user', password: 'pizza123' },
  performanceGlitch: { username: 'performance_glitch_user', password: 'pizza123' },
  error: { username: 'error_user', password: 'pizza123' },
  a11yGlitch: { username: 'a11y_glitch_user', password: 'pizza123' },
  securityGlitch: { username: 'security_glitch_user', password: 'pizza123' },
} as const satisfies Record<string, TestUser>;

export type DeterministicUserKey = keyof typeof DETERMINISTIC_USERS;

export class UserFactory {
  static deterministic(key: DeterministicUserKey): TestUser {
    return DETERMINISTIC_USERS[key];
  }
}
