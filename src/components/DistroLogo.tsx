import {
  siArchlinux,
  siFedora,
  siUbuntu,
  siDebian,
  siOpensuse,
  siGentoo,
} from "simple-icons";

type DistroKey = "arch" | "fedora" | "ubuntu" | "debian" | "opensuse" | "gentoo" | "terra";

interface Props {
  distro: DistroKey;
  size?: number;
  className?: string;
  /** When true, render the icon in the distro's official brand colour
   *  instead of currentColor. Defaults to currentColor so the icon picks
   *  up the surrounding text / tab tint. */
  brandColor?: boolean;
}

const ICONS = {
  arch: siArchlinux,
  fedora: siFedora,
  ubuntu: siUbuntu,
  debian: siDebian,
  opensuse: siOpensuse,
  gentoo: siGentoo,
  // Terra ships Fedora packages — reuse the Fedora glyph.
  terra: siFedora,
} as const satisfies Record<DistroKey, { path: string; hex: string; title: string }>;

export default function DistroLogo({
  distro,
  size = 14,
  className = "",
  brandColor = false,
}: Props) {
  const icon = ICONS[distro];
  return (
    <svg
      role="img"
      aria-label={icon.title}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={brandColor ? `#${icon.hex}` : "currentColor"}
      className={className}
    >
      <path d={icon.path} />
    </svg>
  );
}
