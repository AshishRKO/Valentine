import { describe, it, expect, beforeAll } from "vitest";

beforeAll(async () => {
  document.body.innerHTML = "";
  await import("../invite/invite.js");
});

const api = () => window.__invite;

describe("invite — pad2", () => {
  it("left-pads single digits", () => {
    const { pad2 } = api();
    expect(pad2(0)).toBe("00");
    expect(pad2(7)).toBe("07");
  });

  it("leaves two or more digits alone", () => {
    const { pad2 } = api();
    expect(pad2(10)).toBe("10");
    expect(pad2(123)).toBe("123");
  });
});

describe("invite — parseWallClock", () => {
  it("reads the calendar parts out of an ISO string without shifting them", () => {
    const { parseWallClock } = api();
    expect(parseWallClock("2026-10-18T10:30:00+05:30")).toEqual({
      year: 2026,
      month: 10,
      day: 18,
      hour: 10,
      minute: 30,
    });
  });

  it("defaults a missing time to midnight", () => {
    const { parseWallClock } = api();
    expect(parseWallClock("2026-10-18")).toEqual({
      year: 2026,
      month: 10,
      day: 18,
      hour: 0,
      minute: 0,
    });
  });

  it("returns null for junk", () => {
    const { parseWallClock } = api();
    expect(parseWallClock("not a date")).toBeNull();
    expect(parseWallClock("")).toBeNull();
    expect(parseWallClock(null)).toBeNull();
  });
});

describe("invite — date and time formatting", () => {
  it("formats a timeline entry the way the template does", () => {
    const { formatEventDate } = api();
    expect(formatEventDate("2026-10-18T10:30:00+05:30")).toBe("Oct 18, 2026, 10:30 AM");
    expect(formatEventDate("2026-10-16T21:30:00+05:30")).toBe("Oct 16, 2026, 9:30 PM");
  });

  it("formats the long date for the scratch card", () => {
    const { formatLongDate } = api();
    expect(formatLongDate("2026-10-18T10:30:00+05:30")).toBe("October 18, 2026");
  });

  it("formats a 12-hour clock, with noon and midnight the right way round", () => {
    const { formatTime } = api();
    expect(formatTime("2026-10-18T10:30:00+05:30")).toBe("10:30 AM");
    expect(formatTime("2026-10-18T12:00:00+05:30")).toBe("12:00 PM");
    expect(formatTime("2026-10-18T00:05:00+05:30")).toBe("12:05 AM");
    expect(formatTime("2026-10-18T13:00:00+05:30")).toBe("1:00 PM");
  });

  it("names the weekday the same in every timezone", () => {
    const { weekdayName } = api();
    // 18 Oct 2026 is a Sunday.
    expect(weekdayName("2026-10-18T10:30:00+05:30")).toBe("Sunday");
    expect(weekdayName("2026-10-19T10:30:00+05:30")).toBe("Monday");
  });

  it("returns an empty string rather than throwing on bad input", () => {
    const { formatEventDate, formatLongDate, formatTime, weekdayName } = api();
    expect(formatEventDate("nope")).toBe("");
    expect(formatLongDate("nope")).toBe("");
    expect(formatTime("nope")).toBe("");
    expect(weekdayName("nope")).toBe("");
  });
});

describe("invite — countdown", () => {
  const target = new Date("2026-10-18T10:30:00+05:30");

  it("counts down the remaining days, hours, minutes and seconds", () => {
    const { countdown } = api();
    const now = new Date(target.getTime() - (((2 * 24 + 3) * 60 + 4) * 60 + 5) * 1000);
    expect(countdown(now, target)).toEqual({
      state: "future",
      days: 2,
      hours: 3,
      minutes: 4,
      seconds: 5,
    });
  });

  it("still counts down on the wedding day itself while the hour is ahead", () => {
    const { countdown } = api();
    const now = new Date(target.getTime() - 90 * 60 * 1000);
    expect(countdown(now, target).state).toBe("future");
    expect(countdown(now, target).hours).toBe(1);
    expect(countdown(now, target).minutes).toBe(30);
  });

  it("reads 'today' once the ceremony has begun but the day has not ended", () => {
    const { countdown } = api();
    const now = new Date(target.getTime() + 60 * 60 * 1000);
    expect(countdown(now, target)).toEqual({
      state: "today",
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    });
  });

  it("reads 'past' the day after", () => {
    const { countdown } = api();
    const now = new Date(target.getTime() + 30 * 60 * 60 * 1000);
    expect(countdown(now, target).state).toBe("past");
  });

  it("zeroes out exactly on the target instant", () => {
    const { countdown } = api();
    expect(countdown(new Date(target.getTime()), target).state).toBe("today");
  });

  it("rejects anything that is not a pair of dates", () => {
    const { countdown } = api();
    expect(() => countdown("2026-10-18", target)).toThrow(TypeError);
    expect(() => countdown(new Date(), null)).toThrow(TypeError);
  });
});


describe("invite — scratch reveal", () => {
  it("reveals once the cleared fraction reaches the threshold", () => {
    const { isScratchedEnough } = api();
    expect(isScratchedEnough(50, 100, 0.5)).toBe(true);
    expect(isScratchedEnough(49, 100, 0.5)).toBe(false);
  });

  it("never reveals when there is no surface to clear", () => {
    const { isScratchedEnough } = api();
    expect(isScratchedEnough(1, 0, 0.5)).toBe(false);
  });
});

describe("invite — placeholder handling", () => {
  it("treats a TODO value as not yet filled in", () => {
    const { isPlaceholder } = api();
    expect(isPlaceholder("TODO — venue name")).toBe(true);
    expect(isPlaceholder("TODO")).toBe(true);
    expect(isPlaceholder("todo")).toBe(true);
    expect(isPlaceholder("")).toBe(true);
    expect(isPlaceholder("   ")).toBe(true);
    expect(isPlaceholder(null)).toBe(true);
    expect(isPlaceholder(undefined)).toBe(true);
  });

  it("treats real content as filled in", () => {
    const { isPlaceholder } = api();
    expect(isPlaceholder("The Grand Bhagwati")).toBe(false);
    // A real word that merely starts with those four letters is not a placeholder.
    expect(isPlaceholder("Todorov Hall")).toBe(false);
  });
});

describe("invite — photo carousel", () => {
  it("advances and wraps around", () => {
    const { nextSlide } = api();
    expect(nextSlide(0, 4)).toBe(1);
    expect(nextSlide(3, 4)).toBe(0);
  });

  it("stays put when there is nothing to advance to", () => {
    const { nextSlide } = api();
    expect(nextSlide(0, 1)).toBe(0);
    expect(nextSlide(0, 0)).toBe(0);
  });

  it("ignores a drag shorter than the threshold", () => {
    const { slideFromDrag } = api();
    expect(slideFromDrag(-20, 50, 1, 4)).toBe(1);
    expect(slideFromDrag(20, 50, 1, 4)).toBe(1);
  });

  it("goes forward on a left drag and back on a right drag", () => {
    const { slideFromDrag } = api();
    expect(slideFromDrag(-80, 50, 1, 4)).toBe(2);
    expect(slideFromDrag(80, 50, 1, 4)).toBe(0);
  });

  it("wraps at both ends", () => {
    const { slideFromDrag } = api();
    expect(slideFromDrag(-80, 50, 3, 4)).toBe(0);
    expect(slideFromDrag(80, 50, 0, 4)).toBe(3);
  });
});

describe("invite — dates without a clock time", () => {
  it("formats a short date on its own", () => {
    const { formatShortDate } = api();
    expect(formatShortDate("2026-10-18T19:00:00+05:30")).toBe("Oct 18, 2026");
    expect(formatShortDate("2026-10-18")).toBe("Oct 18, 2026");
    expect(formatShortDate("nope")).toBe("");
  });

  it("uses the clock time when no label is given", () => {
    const { formatEventWhen } = api();
    expect(formatEventWhen("2026-10-18T09:00:00+05:30")).toBe("Oct 18, 2026, 9:00 AM");
    expect(formatEventWhen("2026-10-17T16:00:00+05:30", null)).toBe("Oct 17, 2026, 4:00 PM");
  });

  it("prints a label in place of the time — the muhurat is not a clock time", () => {
    const { formatEventWhen } = api();
    expect(formatEventWhen("2026-10-18", "As per the auspicious muhurat")).toBe(
      "Oct 18, 2026, As per the auspicious muhurat"
    );
  });

  it("prefers the label over a time that is also present", () => {
    const { formatEventWhen } = api();
    expect(formatEventWhen("2026-10-18T23:30:00+05:30", "Shubh lagnanusar")).toBe(
      "Oct 18, 2026, Shubh lagnanusar"
    );
  });

  it("ignores a placeholder label and falls back to the clock", () => {
    const { formatEventWhen } = api();
    expect(formatEventWhen("2026-10-18T09:00:00+05:30", "TODO — confirm")).toBe(
      "Oct 18, 2026, 9:00 AM"
    );
    expect(formatEventWhen("2026-10-18T09:00:00+05:30", "  ")).toBe("Oct 18, 2026, 9:00 AM");
  });

  it("returns an empty string when the date itself is unusable", () => {
    const { formatEventWhen } = api();
    expect(formatEventWhen("nope", "Shubh lagnanusar")).toBe("");
    expect(formatEventWhen(null)).toBe("");
  });
});

describe("invite — background music", () => {
  it("plays by default, and stays off only once the guest has muted it", () => {
    const { musicPreference } = api();
    expect(musicPreference(null)).toBe(true);
    expect(musicPreference(undefined)).toBe(true);
    expect(musicPreference("1")).toBe(true);
    expect(musicPreference("0")).toBe(false);
  });

  it("eases the volume up from silence to the target", () => {
    const { fadeVolume } = api();
    expect(fadeVolume(0, 2000, 0.5)).toBe(0);
    expect(fadeVolume(1000, 2000, 0.5)).toBe(0.125);
    expect(fadeVolume(2000, 2000, 0.5)).toBe(0.5);
  });

  it("clamps outside the fade window instead of overshooting", () => {
    const { fadeVolume } = api();
    expect(fadeVolume(9999, 2000, 0.5)).toBe(0.5);
    expect(fadeVolume(-100, 2000, 0.5)).toBe(0);
  });

  it("jumps straight to the target when there is no fade to run", () => {
    const { fadeVolume } = api();
    expect(fadeVolume(500, 0, 0.5)).toBe(0.5);
    expect(fadeVolume(500, -1, 0.5)).toBe(0.5);
  });
});

describe("invite — venue map", () => {
  const venue = {
    name: "Ambience Garden Resort & Wedding Point",
    address: "Badrinath Marg, Kotdwar 246149, Uttarakhand",
  };

  it("builds a map query from the venue name and address", () => {
    const { mapQuery } = api();
    expect(mapQuery(venue)).toBe(
      "Ambience Garden Resort & Wedding Point, Badrinath Marg, Kotdwar 246149, Uttarakhand"
    );
  });

  it("prefers an explicit query, which pins better than a long address", () => {
    const { mapQuery } = api();
    expect(mapQuery({ ...venue, mapQuery: "Ambience Garden Resort, Kotdwar" })).toBe(
      "Ambience Garden Resort, Kotdwar"
    );
  });

  it("skips whichever parts are missing", () => {
    const { mapQuery } = api();
    expect(mapQuery({ name: "Only A Name" })).toBe("Only A Name");
    expect(mapQuery({ address: "Only An Address" })).toBe("Only An Address");
    expect(mapQuery({ name: "TODO — venue name", address: "Kotdwar" })).toBe("Kotdwar");
  });

  it("returns an empty query when there is nothing to map", () => {
    const { mapQuery } = api();
    expect(mapQuery({})).toBe("");
    expect(mapQuery(undefined)).toBe("");
    expect(mapQuery({ name: "TODO", address: "TODO" })).toBe("");
  });

  it("builds a keyless embed URL, so no API key is needed", () => {
    const { mapEmbedUrl } = api();
    expect(mapEmbedUrl("Ambience Garden Resort, Kotdwar")).toBe(
      "https://maps.google.com/maps?q=Ambience%20Garden%20Resort%2C%20Kotdwar&t=m&z=15&output=embed"
    );
  });

  it("has no embed URL when there is no query", () => {
    const { mapEmbedUrl } = api();
    expect(mapEmbedUrl("")).toBeNull();
    expect(mapEmbedUrl(null)).toBeNull();
    expect(mapEmbedUrl("TODO — venue name")).toBeNull();
  });


});
