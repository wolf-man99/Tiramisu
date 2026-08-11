/** Edge-safe auth constants: no Node imports, so middleware can use them. */
export const SESSION_COOKIE = 'gsql_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
export const OAUTH_STATE_COOKIE = 'gsql_oauth_state';
