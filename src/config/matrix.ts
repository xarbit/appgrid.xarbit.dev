// Matrix community channels — public Space on matrix.org.
// The Space groups three rooms; only General + Random are public.
// Development is invite-only and intentionally hidden from the
// directory, so it's surfaced as a description, not a link.

export const matrixSpace = {
  alias: "#appgrid-plasma:matrix.org",
  url: "https://matrix.to/#/#appgrid-plasma:matrix.org",
} as const;

export interface MatrixRoom {
  name: string;
  description: string;
  url: string | null; // null = invite-only, no public join link
  invite?: boolean;
}

export const matrixRooms: MatrixRoom[] = [
  {
    name: "General",
    description:
      "Help, install issues, feature ideas, day-to-day chat about AppGrid.",
    url: "https://matrix.to/#/#appgrid-general:matrix.org",
  },
  {
    name: "Random",
    description:
      "Off-topic — KDE setups, screenshots, distro chat, anything that isn't a bug report.",
    url: "https://matrix.to/#/#appgrid-random:matrix.org",
  },
  {
    name: "Development",
    description:
      "Maintainer / contributor coordination. Invite-only — open a PR or active issue first, then ping in #appgrid-general for access.",
    url: "https://matrix.to/#/#appgrid-development:matrix.org",
    invite: true,
  },
];
