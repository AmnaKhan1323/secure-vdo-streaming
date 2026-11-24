import assert from "node:assert/strict";
import { test } from "node:test";
import { isolatedTestEnvironment, ISOLATED_PROVIDER_VARIABLES } from "../scripts/e2e-environment";

test("E2E environment explicitly overrides every provider variable, never leaving it unset", () => {
  const inherited: NodeJS.ProcessEnv = { ...Object.fromEntries(ISOLATED_PROVIDER_VARIABLES.map((key) => [key, "harmless-test-sentinel"])), NODE_ENV: "test" };
  const env = isolatedTestEnvironment(inherited, "postgresql://isolated.invalid/test", "test-only-ephemeral-secret");
  for (const key of ISOLATED_PROVIDER_VARIABLES) {
    assert.ok(Object.hasOwn(env, key));
    assert.equal(env[key], "");
    assert.equal(inherited[key], "harmless-test-sentinel", "Inherited environment is never modified.");
  }
  assert.equal(env.LIVE_EMBED_PROBES, "false");
  assert.equal(env.BETTER_AUTH_URL, "http://localhost:3001");
  assert.equal(env.BETTER_AUTH_SECRETS, "");
});