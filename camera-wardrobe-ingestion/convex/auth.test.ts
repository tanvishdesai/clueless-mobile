/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";
import { beforeAll, describe, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

// Throwaway signing keys, the same shape `npx @convex-dev/auth` puts on a deployment.
beforeAll(async () => {
  const { privateKey, publicKey } = await generateKeyPair("RS256", { extractable: true });
  vi.stubEnv("JWT_PRIVATE_KEY", (await exportPKCS8(privateKey)).trimEnd().replace(/\n/g, " "));
  vi.stubEnv("JWKS", JSON.stringify({ keys: [{ use: "sig", ...(await exportJWK(publicKey)) }] }));
  vi.stubEnv("SITE_URL", "http://localhost:5173");
  vi.stubEnv("CONVEX_SITE_URL", "https://test.convex.site");
});

const signUp = (email: string, name: string, password = "plaid4ever") => ({
  provider: "password",
  params: { email, password, name, flow: "signUp" },
});

describe("signing up and in with Convex Auth", () => {
  test("the first account is the owner; sign-ups close behind it", async () => {
    const t = convexTest(schema, modules);
    const first = await t.action(api.auth.signIn, signUp("Owner@Example.com", "  Tanvish  "));
    expect(first.tokens?.token).toBeTruthy();

    const users = await t.run((ctx) => ctx.db.query("users").collect());
    expect(users).toMatchObject([{ email: "owner@example.com", name: "Tanvish" }]);

    await expect(t.action(api.auth.signIn, signUp("stranger@example.com", "Elton"))).rejects.toThrow(/Registration is closed/);
    expect(await t.run((ctx) => ctx.db.query("users").collect())).toHaveLength(1);

    const back = await t.action(api.auth.signIn, {
      provider: "password",
      params: { email: "owner@example.com", password: "plaid4ever", flow: "signIn" },
    });
    expect(back.tokens?.token).toBeTruthy();
    await expect(t.action(api.auth.signIn, {
      provider: "password",
      params: { email: "owner@example.com", password: "wrong-password", flow: "signIn" },
    })).rejects.toThrow(/InvalidSecret/);
  });

  test("usernames, emails and passwords are checked before anything is created", async () => {
    const t = convexTest(schema, modules);
    await expect(t.action(api.auth.signIn, signUp("a@example.com", "T"))).rejects.toThrow(/username between 2 and 24/);
    await expect(t.action(api.auth.signIn, signUp("not-an-email", "Tanvish"))).rejects.toThrow(/email/);
    await expect(t.action(api.auth.signIn, signUp("a@example.com", "Tanvish", "short"))).rejects.toThrow(/password/i);
    expect(await t.run((ctx) => ctx.db.query("users").collect())).toHaveLength(0);
  });
});
