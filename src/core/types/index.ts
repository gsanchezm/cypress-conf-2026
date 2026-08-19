export interface AuthSession {
  accessToken: string;
  tokenType: 'bearer';
  username: string;
  behavior: string;
}
