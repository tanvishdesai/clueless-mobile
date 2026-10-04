import { makeFunctionReference } from "convex/server";
import type { Change, Heartbeat, Item, Look, LookRequest, Note } from "./types";

// Typed references to the functions in camera-wardrobe-ingestion/convex, by name,
// so the site needs neither that folder's codegen nor its dependencies.

const q = <Args extends Record<string, unknown>, R>(name: string) =>
  makeFunctionReference<"query", Args, R>(name);
const m = <Args extends Record<string, unknown>, R = unknown>(name: string) =>
  makeFunctionReference<"mutation", Args, R>(name);

type Empty = Record<string, never>;

export const api = {
  items: {
    list: q<Empty, Item[]>("items:list"),
  },
  looks: {
    list: q<Empty, LookRequest[]>("looks:list"),
    stylist: q<Empty, Heartbeat>("looks:stylist"),
    request: m<{ occasion: string; constraints: string; anchorIds?: string[] }, string>("looks:request"),
    retry: m<{ id: string }>("looks:retry"),
    setFavorite: m<{ id: string; favorite: boolean }>("looks:setFavorite"),
    remove: m<{ id: string }>("looks:remove"),
    addLook: m<{ id: string; look: Look }, number>("looks:addLook"),
  },
  notes: {
    list: q<Empty, Note[]>("notes:list"),
    send: m<{ lookId: string; lookIndex: number; text: string; change?: Change; outfit?: { id: string; role: string }[] }, string>("notes:send"),
    retry: m<{ id: string }>("notes:retry"),
  },
};
