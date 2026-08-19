import DETERMINISTIC_USERS from './deterministicUsers.json';

export interface TestUser {
  username: string;
  password: string;
}

export type DeterministicUserKey = keyof typeof DETERMINISTIC_USERS;

export class UserFactory {
  static deterministic(key: DeterministicUserKey): TestUser {
    return DETERMINISTIC_USERS[key];
  }
}
