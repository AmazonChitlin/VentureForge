import type { WebsiteTone } from "./schema";

export interface ToneProfile {
  headlineLead: string;
  summary: string;
  traits: string[];
  wordsToUse: string[];
  wordsToAvoid: string[];
  writingGuidelines: string[];
  colors: {
    ink: string;
    muted: string;
    background: string;
    surface: string;
    accent: string;
    accentText: string;
  };
}

export const toneProfiles: Record<WebsiteTone, ToneProfile> = {
  professional: profile(
    "A practical way to",
    "Clear, credible, and direct. Explain the offer without hype.",
    ["clear", "reliable", "organized"],
    ["practical", "clear", "helpful"],
    ["best", "guaranteed", "unmatched"],
    ["Use short factual sentences.", "Keep one primary next step.", "Label details that require confirmation."],
    ["#172033", "#536071", "#f5f7fb", "#ffffff", "#2457d6", "#ffffff"],
  ),
  friendly: profile(
    "A welcoming way to",
    "Warm and approachable while staying specific about the offer.",
    ["welcoming", "helpful", "plain-spoken"],
    ["welcome", "easy", "talk with us"],
    ["pressure", "exclusive", "guaranteed"],
    ["Write conversationally.", "Answer common concerns plainly.", "Invite questions without overselling."],
    ["#27312a", "#66736a", "#f7f5ef", "#ffffff", "#397251", "#ffffff"],
  ),
  luxury: profile(
    "A considered way to",
    "Calm, polished, and selective. Let detail and restraint carry the message.",
    ["polished", "measured", "attentive"],
    ["considered", "crafted", "personal"],
    ["cheap", "flash sale", "best"],
    ["Use restrained language.", "Emphasize care and process.", "Avoid status claims that are not supported."],
    ["#241f20", "#756b6d", "#f8f5f0", "#ffffff", "#7c5a40", "#ffffff"],
  ),
  punk_edgy: profile(
    "Skip the usual hassle. Get a sharper way to",
    "Direct, energetic, and independent without using unsupported bravado.",
    ["direct", "bold", "uncomplicated"],
    ["skip the hassle", "straightforward", "built for"],
    ["number one", "destroy the competition", "guaranteed"],
    ["Lead with the friction the customer wants to avoid.", "Use compact copy.", "Keep claims concrete and supportable."],
    ["#171717", "#666666", "#f4f4f4", "#ffffff", "#c9362b", "#ffffff"],
  ),
  modern: profile(
    "A simpler way to",
    "Concise, useful, and current. Favor clarity over ornament.",
    ["simple", "focused", "efficient"],
    ["simple", "focused", "designed for"],
    ["revolutionary", "disruptive", "guaranteed"],
    ["Keep headings compact.", "Use clear benefit language.", "Make the call to action easy to scan."],
    ["#14212b", "#5d6d78", "#f4f7f8", "#ffffff", "#087f8c", "#ffffff"],
  ),
  local_community: profile(
    "A local way to",
    "Grounded and neighborly. Connect the offer to an accurate service area.",
    ["local", "approachable", "community-minded"],
    ["local", "nearby", "community"],
    ["everyone's favorite", "best in town", "guaranteed"],
    ["Name the service area only when verified.", "Use welcoming language.", "Avoid implying community endorsement."],
    ["#263027", "#647167", "#f6f4ec", "#ffffff", "#a6532b", "#ffffff"],
  ),
  industrial: profile(
    "A dependable process to",
    "Specific, capable, and operationally clear. Emphasize fit, process, and next steps.",
    ["precise", "practical", "capable"],
    ["process", "specification", "responsive"],
    ["perfect", "zero-risk", "guaranteed"],
    ["Use concrete service language.", "Explain how inquiries become work.", "Avoid claims that require performance evidence."],
    ["#1e2529", "#65727a", "#f2f5f5", "#ffffff", "#b45a2a", "#ffffff"],
  ),
  playful: profile(
    "A brighter way to",
    "Lively and easy to read while keeping the offer trustworthy.",
    ["upbeat", "clear", "inviting"],
    ["discover", "explore", "let's start"],
    ["magic", "best ever", "guaranteed"],
    ["Use light phrasing in headings.", "Keep service details plain.", "Do not let playful copy obscure the next step."],
    ["#2a2440", "#706887", "#faf7ff", "#ffffff", "#6f4bd8", "#ffffff"],
  ),
};

function profile(
  headlineLead: string,
  summary: string,
  traits: string[],
  wordsToUse: string[],
  wordsToAvoid: string[],
  writingGuidelines: string[],
  colors: [string, string, string, string, string, string],
): ToneProfile {
  return {
    headlineLead,
    summary,
    traits,
    wordsToUse,
    wordsToAvoid,
    writingGuidelines,
    colors: {
      ink: colors[0],
      muted: colors[1],
      background: colors[2],
      surface: colors[3],
      accent: colors[4],
      accentText: colors[5],
    },
  };
}
