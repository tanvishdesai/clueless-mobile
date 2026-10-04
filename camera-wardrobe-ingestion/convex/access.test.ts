/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, describe, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { mayRegister } from "./access";

const modules = import.meta.glob("./**/*.ts");

afterEach(() => vi.unstubAllEnvs());

/** A closet with an owner (registered first) and a stranger who also has an account. */
async function closet() {
  const t = convexTest(schema, modules);
  const { owner, stranger, item } = await t.run(async (ctx) => {
    const owner = await ctx.db.insert("users", { name: "Tanvish", email: "owner@example.com" });
    const stranger = await ctx.db.insert("users", { name: "Elton", email: "elton@example.com" });
    const front = await ctx.storage.store(new Blob(["x"]));
    const item = await ctx.db.insert("items", { frontId: front, backId: front, status: "pending" });
    return { owner, stranger, item };
  });
  // Convex Auth's subject is "<userId>|<sessionId>".
  return {
    t, item,
    asOwner: t.withIdentity({ subject: `${owner}|s1` }),
    asStranger: t.withIdentity({ subject: `${stranger}|s2` }),
  };
}

const brief = { occasion: "a party in the Valley", constraints: "" };

describe("the website's functions need a signed-in member", () => {
  test("anonymous callers get nothing and can't queue Opus work", async () => {
    const { t } = await closet();
    expect(await t.query(api.users.me, {})).toBeNull();
    await expect(t.query(api.looks.list, {})).rejects.toThrow(/Sign in/);
    await expect(t.mutation(api.looks.request, brief)).rejects.toThrow(/Sign in/);
    await expect(t.query(api.notes.list, {})).rejects.toThrow(/Sign in/);
  });

  test("the owner gets in, and requests carry their name", async () => {
    const { t, asOwner } = await closet();
    expect(await asOwner.query(api.users.me, {})).toMatchObject({ name: "Tanvish", member: true });
    const id = await asOwner.mutation(api.looks.request, brief);
    const row = await t.run((ctx) => ctx.db.get(id));
    expect(row).toMatchObject({ by: "Tanvish", status: "pending" });
    expect(await asOwner.query(api.looks.list, {})).toHaveLength(1);
  });

  test("an account that isn't the owner is signed in but locked out", async () => {
    const { asStranger } = await closet();
    expect(await asStranger.query(api.users.me, {})).toMatchObject({ member: false });
    await expect(asStranger.mutation(api.looks.request, brief)).rejects.toThrow(/Sign in/);
    await expect(asStranger.query(api.looks.list, {})).rejects.toThrow(/Sign in/);
  });

  test("ALLOWED_EMAILS replaces first-come ownership", async () => {
    vi.stubEnv("ALLOWED_EMAILS", "Elton@example.com, someone@else.com");
    const { asOwner, asStranger } = await closet();
    expect(await asStranger.query(api.users.me, {})).toMatchObject({ member: true });
    expect(await asOwner.query(api.users.me, {})).toMatchObject({ member: false });
  });
});

describe("registration", () => {
  test("is open until the closet has an owner, then closed", async () => {
    const t = convexTest(schema, modules);
    expect(await t.run((ctx) => mayRegister(ctx, "first@example.com"))).toBe(true);
    await t.run((ctx) => ctx.db.insert("users", { email: "first@example.com" }));
    expect(await t.run((ctx) => mayRegister(ctx, "second@example.com"))).toBe(false);
  });

  test("with ALLOWED_EMAILS, only listed emails, even for the first account", async () => {
    vi.stubEnv("ALLOWED_EMAILS", "me@example.com");
    const t = convexTest(schema, modules);
    expect(await t.run((ctx) => mayRegister(ctx, "stranger@example.com"))).toBe(false);
    expect(await t.run((ctx) => mayRegister(ctx, "ME@example.com"))).toBe(true);
  });
});

describe("the stylist worker needs the closet key", () => {
  test("refused outright until CLOSET_KEY is set on the deployment", async () => {
    const { t } = await closet();
    await expect(t.query(api.looks.pending, {})).rejects.toThrow(/Set CLOSET_KEY/);
  });

  test("wrong or missing key refused; right key works", async () => {
    vi.stubEnv("CLOSET_KEY", "s3cret");
    const { t, asOwner } = await closet();
    await expect(t.query(api.looks.pending, {})).rejects.toThrow(/Wrong closet key/);
    await expect(t.query(api.notes.pending, { key: "nope" })).rejects.toThrow(/Wrong closet key/);
    // Signing in doesn't make you the worker.
    await expect(asOwner.query(api.looks.pending, {})).rejects.toThrow(/Wrong closet key/);
    await asOwner.mutation(api.looks.request, brief);
    expect(await t.query(api.looks.pending, { key: "s3cret" })).toHaveLength(1);
  });
});

describe("the closet itself: a member or the key", () => {
  test("stays open to the camera app until CLOSET_KEY is set", async () => {
    const { t } = await closet();
    expect(await t.query(api.items.list, {})).toHaveLength(1);
  });

  test("once CLOSET_KEY is set: anonymous refused, key or member allowed", async () => {
    vi.stubEnv("CLOSET_KEY", "s3cret");
    const { t, item, asOwner, asStranger } = await closet();
    await expect(t.query(api.items.list, {})).rejects.toThrow(/private/);
    await expect(t.mutation(api.items.generateUploadUrl, {})).rejects.toThrow(/private/);
    await expect(t.mutation(api.items.remove, { id: item })).rejects.toThrow(/private/);
    await expect(asStranger.query(api.items.list, {})).rejects.toThrow(/private/);
    expect(await t.query(api.items.list, { key: "s3cret" })).toHaveLength(1);
    expect(await asOwner.query(api.items.list, {})).toHaveLength(1);
  });
});

describe("the fitting room", () => {
  test("only the owner passes notes; the worker reads them with the key", async () => {
    vi.stubEnv("CLOSET_KEY", "s3cret");
    const { t, asOwner, asStranger } = await closet();
    const lookId = await asOwner.mutation(api.looks.request, brief);
    await t.run((ctx) => ctx.db.patch(lookId, {
      status: "done",
      result: { read: "", gaps: "", looks: [{ title: "T", tagline: "", direction: "", why: "", tips: [], swaps: [], pieces: [] }] },
    }));
    const note = { lookId, lookIndex: 0, text: "What about the jacket?" };
    await expect(asStranger.mutation(api.notes.send, note)).rejects.toThrow(/Sign in/);
    const reply = await asOwner.mutation(api.notes.send, note);
    const pending = await t.query(api.notes.pending, { key: "s3cret" });
    expect(pending.map((n) => n._id)).toEqual([reply]);
    const ctx = await t.query(api.notes.context, { id: reply, key: "s3cret" });
    expect(ctx?.thread.map((n) => n.text)).toEqual(["What about the jacket?"]);
    expect(ctx?.request?.by).toBe("Tanvish");
  });
});
