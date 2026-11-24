export const ISOLATED_PROVIDER_VARIABLES = [
  "GUMLET_API_KEY", "GUMLET_WORKSPACE_ID", "GUMLET_SIGNING_SECRET",
  "BUNNY_STREAM_API_KEY", "BUNNY_LIBRARY_ID", "BUNNY_TOKEN_AUTH_KEY", "BUNNY_CORE_API_KEY",
  "VIDEO_IMPORT_ALLOWED_HOSTS", "LIVE_GUMLET_ASSET_ID", "LIVE_BUNNY_VIDEO_ID",
] as const;

export function isolatedTestEnvironment(base: NodeJS.ProcessEnv, databaseUrl: string, secret: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...base,
    NODE_ENV: "production",
    DATABASE_URL: databaseUrl,
    BETTER_AUTH_SECRET: secret,
    BETTER_AUTH_URL: "http://localhost:3001",
    BETTER_AUTH_SECRETS: "",
    STREAMLAB_LOCAL_DB: "true",
    GUMLET_SIGNING_SECRET_ENCODING: "base64",
    GUMLET_REMOTE_SECRET_ENCODING: "base64",
    BUNNY_PLAYER_HOST: "player.mediadelivery.net",
    LIVE_EMBED_PROBES: "false",
  };
  // An unset/deleted variable lets Next load it from .env files. Empty strings
  // deliberately take precedence, so tests never issue real provider requests.
  for (const key of ISOLATED_PROVIDER_VARIABLES) env[key] = "";
  return env;
}