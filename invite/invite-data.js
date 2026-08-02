/* invite/invite-data.js — every fact on the invitation lives here.
 *
 * Transcribed from the printed card (मांगलिक कार्यक्रम, 17–19 October 2026).
 * This is the only file you need to edit. Anything left as "TODO …" is hidden
 * on the page instead of being printed, so the link always reads as finished.
 *
 * Dates are wall-clock at the venue, written as
 *   YYYY-MM-DDTHH:MM:00+05:30
 * The +05:30 is India Standard Time — keep it so the countdown is right for
 * guests abroad. The printed date and time always read as the venue's clock.
 * An event with no clock time carries a `timeLabel` instead.
 */
window.INVITE = {
  /* ---------- Browser tab, link previews ---------- */
  coupleLabel: "Akanksha & Ashish",

  /* ---------- The envelope you tap to open ---------- */
  envelope: {
    seal: "Tap\nto\nopen",
    caption: "You are invited",
  },

  /* ---------- Hero, behind the envelope ---------- */
  hero: {
    // The invocation the card opens with.
    invocation: "॥ श्री गणेशाय नमः ॥",
    message: "With the blessings of our elders,\nwe invite you to the wedding of..",
    // A photo behind the names, if you ever want one — e.g.
    // "../images/Ring Ceremony/DSC08827.jpg". Left empty, the hero falls back
    // to a dusk sky drawn in the invitation's own colours.
    photo: "",
    scrollHint: "Scroll",
  },

  /* The card names the bride first, as the invitation comes from her family.
   * `first` is printed above the ampersand, `second` below it. */
  first: {
    name: "Akanksha",
    lines: [
      "Daughter of Smt. Malti Dhuliya & Shri Yugalkishore Dhuliya",
      "Granddaughter of the late Smt. Manorama Devi & Shri Sarveshwar Prasad Dhuliya",
    ],
  },

  second: {
    name: "Ashish",
    lines: ["Son of Smt. Shobha Devi & Shri Binod Barthwal"],
  },

  /* ---------- The welcome, on the dusk gradient ---------- */
  // The shloka the card opens with, set apart in Devanagari.
  welcomeShloka:
    "वक्रतुण्ड महाकाय सूर्यकोटि समप्रभः।\nनिर्विघ्नं कुरु मे देव सर्वकार्येषु सर्वदा॥",
  welcome:
    "We request the honour of your presence at the wedding of Akanksha & Ashish.\n" +
    "Please join us through the celebrations and bless the bride and groom ❤",

  /* ---------- Scratch to reveal ---------- */
  scratch: {
    heading: "Scratch to Reveal",
    kicker: "You're Invited!",
    hint: "Scratch here ✨",
  },

  /* ---------- The moment everything counts down to ----------
   * The Panigrahan Sanskar itself is शुभ लग्नानुसार, so there is no clock time
   * to count to. This counts down to Baraat Aagaman on the wedding day — the
   * moment guests need to be at the venue. Move it if you'd rather count to the
   * Mehendi on the 17th. */
  weddingDate: "2026-10-18T19:00:00+05:30",

  countdown: {
    heading: "Counting Down to Forever",
    todayLabel: "Today is the day ❤",
    pastLabel: "Married ❤",
  },

  /* ---------- Photo gallery ----------
   * `thumb` fills the grid, `full` loads only when a guest taps to enlarge.
   * `shape` is "tall" or "wide" — on a wide screen the tall one stands beside
   * the two wide ones. Both sizes are required; an entry missing either is
   * skipped. Empty the list and the whole section disappears.
   *
   * The files under photos/ come from images/Ring Ceremony: thumbs downsized
   * with lanczos and a mild unsharp (ffmpeg), fulls kept at original size.
   * Re-run that step if you swap them. With four photos, the last wide one
   * runs across the whole grid on a desktop, as a closing band. */
  gallery: {
    photos: [
      {
        thumb: "photos/selfie-thumb.jpg",
        full: "photos/selfie-full.jpg",
        shape: "tall",
        alt: "Akanksha and Ashish, cheek to cheek at their ring ceremony",
      },
      {
        thumb: "photos/hands-thumb.jpg",
        full: "photos/hands-full.jpg",
        shape: "wide",
        alt: "Akanksha and Ashish showing their engagement rings",
      },
      {
        thumb: "photos/sofa-thumb.jpg",
        full: "photos/sofa-full.jpg",
        shape: "wide",
        alt: "Ashish lying across Akanksha's lap on the ceremony sofa",
      },
      {
        thumb: "photos/rings-thumb.jpg",
        full: "photos/rings-full.jpg",
        shape: "wide",
        alt: "Their rings, on henna-painted hands",
      },
    ],
  },

  /* ---------- Sunday 18 October, and the vidai on the 19th ---------- */
  timeline: {
    heading: "Program Timeline",
    events: [
      {
        title: "Ganesh Sthapana",
        at: "2026-10-18T09:00:00+05:30",
        note: "The day begins with Ganesh ji's blessing.",
      },
      {
        title: "Haldi Rasam & Mangal Snan",
        at: "2026-10-18T10:00:00+05:30",
      },
      {
        title: "Ganesh Poojan",
        at: "2026-10-18T11:00:00+05:30",
      },
      {
        title: "Baraat Aagaman",
        at: "2026-10-18T19:00:00+05:30",
        note: "The groom's procession arrives.",
      },
      {
        title: "Baraat Swagat",
        at: "2026-10-18T20:00:00+05:30",
        note: "Your gracious presence is requested ❤",
      },
      {
        title: "Panigrahan Sanskar",
        at: "2026-10-18",
        // The card gives no clock time here — शुभ लग्नानुसार.
        timeLabel: "At the auspicious muhurat",
        note: "The wedding ceremony itself.",
      },
      {
        title: "Baraat Vidai",
        at: "2026-10-19T07:00:00+05:30",
        note: "Monday morning — we say our goodbyes.",
      },
    ],
  },

  /* ---------- Where ---------- */
  venue: {
    heading: "Venue",
    name: "Ambience Garden Resort & Wedding Point",
    address:
      "Badrinath Marg, Chandar Singh Colony, near Ginvai Srot Pul, Kotdwar 246149, Pauri Garhwal, Uttarakhand",
    // What the embedded map looks up. A short query pins more reliably than the
    // full postal address above. Guests open Maps from the map itself.
    mapQuery: "Ambience Garden Resort, Badrinath Marg, Kotdwar, Uttarakhand 246149",
  },

  /* ---------- What to wear ---------- */
  dressCode: {
    heading: "Dress Code",
    women: "TODO — e.g. Indian formals in pastel or jewel tones",
    men: "TODO — e.g. Kurta, sherwani or suit",
  },

  /* ---------- Saturday 17 October ---------- */
  preWedding: {
    heading: "Pre-Wedding Events",
    events: [
      { title: "Mehendi Rasam", at: "2026-10-17T16:00:00+05:30", place: "At the venue" },
      {
        // The card reads न्यूतेर (संगीत) — both happen through the evening.
        title: "Nyuter & Sangeet",
        at: "2026-10-17T19:00:00+05:30",
        place: "At the venue",
        note:
          "Nyuter is the Garhwali custom of neg — the gifts and contributions " +
          "family and friends offer the couple — kept alongside the sangeet.",
      },
      { title: "Preeti Bhoj", at: "2026-10-17T20:00:00+05:30", place: "At the venue" },
    ],
  },

  /* ---------- Getting there and staying ---------- */
  transport: {
    heading: "Transportation",
    body:
      "The venue is on Badrinath Marg, about a kilometre past Jhanda Chowk and a " +
      "kilometre from Kotdwar railway station and the bus stand. Kotdwar is roughly " +
      "200 km from Delhi by road.",
  },

  accommodation: {
    heading: "Accommodation",
    body: "TODO — rooms held at the venue? add the details, or delete this block",
  },

  gifts: {
    heading: "Gifts",
    body: "Your love, blessings, and presence are the greatest gifts we could ever ask for.",
  },

  /* ---------- Sign-off ---------- */
  signoff: {
    line: "We can't wait to celebrate with you!",
  },

  footer: {
    // दर्शनाभिलाषी / विनीत, as the card signs off.
    note:
      "Awaiting your presence — the Dhuliya family and well-wishers · " +
      "Smt. Malti, Shri Yugalkishore Dhuliya, Devansh Dhuliya",
  },
};
