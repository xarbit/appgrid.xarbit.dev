interface Props {
  distro: "arch" | "fedora" | "ubuntu" | "debian" | "opensuse" | "gentoo";
  size?: number;
  className?: string;
}

/**
 * Inline distro brand marks. Simplified geometric versions of each distro's
 * recognizable mark (not the full multi-color logos — trademark cleaner +
 * stays crisp at small sizes). Uses currentColor so the icon picks up the
 * tab's tint colour automatically.
 */
export default function DistroLogo({ distro, size = 14, className = "" }: Props) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "currentColor",
    "aria-hidden": true,
    className,
  } as const;

  switch (distro) {
    case "arch":
      // Stylized chevron / mountain mark — Arch's signature triangle.
      return (
        <svg {...common}>
          <path d="M12 2 2 22h4l2.5-5h7L18 22h4L12 2zm-2 11 2-4 2 4h-4z" />
        </svg>
      );
    case "fedora":
      // Lowercase "f" inside a circle — Fedora's infinity-stylized "f".
      return (
        <svg {...common}>
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1.2 4.8c1.1 0 2 .9 2 2h-1.6c0-.2-.2-.4-.4-.4-.2 0-.4.2-.4.4v1.6h2.4v1.6h-2.4v5.2h-1.6v-5.2H9.4v-1.6h1.8V8.8c0-1.1.9-2 2-2z" />
        </svg>
      );
    case "ubuntu":
      // Circle of friends — three dots on a ring.
      return (
        <svg {...common}>
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM5.5 14a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm6.5 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0-12a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm6.5 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
        </svg>
      );
    case "debian":
      // Open spiral — Debian's stylized swirl.
      return (
        <svg {...common}>
          <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 0 1-8-8 8 8 0 0 1 14.5-4.6 6 6 0 0 0-8.8 6.7 4.4 4.4 0 0 0 4.6 3.6 4 4 0 0 0 3.7-2.6 5.6 5.6 0 0 1-7.4 1.6A6 6 0 0 1 6.3 9a8 8 0 0 0 5.7 13z" />
        </svg>
      );
    case "opensuse":
      // Stylized chameleon outline — simplified head profile.
      return (
        <svg {...common}>
          <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm4 11.5a1 1 0 1 1 1-1 1 1 0 0 1-1 1zM7.5 16a4.5 4.5 0 0 1 0-9 6.5 6.5 0 0 1 6.5 4 4.5 4.5 0 0 1 4 4.5 1.5 1.5 0 0 1-3 0 1.5 1.5 0 0 0-3 0v.5a3 3 0 0 1-4.5 0z" />
        </svg>
      );
    case "gentoo":
      // Stylized "g" swirl — abstracted from Gentoo's mark.
      return (
        <svg {...common}>
          <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 16a6 6 0 1 1 6-6 6 6 0 0 1-6 6zm0-10a4 4 0 1 0 4 4h-4V8z" />
        </svg>
      );
  }
}
