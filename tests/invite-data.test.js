import { describe, it, expect, beforeAll } from "vitest";
import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/* invite-data.js is data, not logic, but a typo in it ships straight to the
 * live invitation. These tests pin the data to the files on disk without
 * pinning which photos are in the gallery. */

const inviteDir = join(dirname(fileURLToPath(import.meta.url)), "..", "invite");

beforeAll(async () => {
  await import("../invite/invite-data.js");
});

const photos = () => window.INVITE.gallery.photos;

describe("invite data — photo gallery", () => {
  it("has at least one photo, each with a thumb and a full file on disk", () => {
    expect(photos().length).toBeGreaterThan(0);
    for (const p of photos()) {
      expect(existsSync(join(inviteDir, p.thumb)), `${p.thumb} is missing`).toBe(true);
      expect(existsSync(join(inviteDir, p.full)), `${p.full} is missing`).toBe(true);
    }
  });

  it("gives every photo a real shape and alt text", () => {
    for (const p of photos()) {
      expect(["tall", "wide"], `${p.thumb} has shape "${p.shape}"`).toContain(p.shape);
      expect(String(p.alt || "").trim(), `${p.thumb} has no alt`).not.toBe("");
    }
  });

  it("ships no photo files the gallery does not use", () => {
    const referenced = new Set(
      photos().flatMap((p) => [p.thumb, p.full].map((rel) => join(inviteDir, rel)))
    );
    const onDisk = readdirSync(join(inviteDir, "photos"))
      .filter((name) => /\.jpe?g$/i.test(name))
      .map((name) => join(inviteDir, "photos", name));
    const orphans = onDisk.filter((file) => !referenced.has(file));
    expect(orphans, "unreferenced files under invite/photos/").toEqual([]);
  });
});
