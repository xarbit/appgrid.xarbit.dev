#!/usr/bin/env bash
# SPDX-FileCopyrightText: 2026 AppGrid Contributors
# SPDX-License-Identifier: GPL-2.0-or-later
#
# Normalize the website screenshots:
#   1. Trim transparent borders from all PNGs (idempotent — running twice is a no-op).
#   2. Rebuild the hero sprites (light + dark) from the 5 frame files.
#
# Why: screenshots captured from a centered launcher come with a shadow/blur halo
# of transparent pixels around the visible window. The hero animation expects the
# sprite frames to be pixel-aligned to a fixed aspect ratio, and the gallery /
# inline screenshots look cleaner without the transparent margin.
#
# Usage:
#   scripts/normalize-screenshots.sh            # trim + rebuild sprites
#   scripts/normalize-screenshots.sh trim       # trim only
#   scripts/normalize-screenshots.sh sprites    # rebuild sprites only

set -euo pipefail

DIR="$(cd "$(dirname "$0")/.." && pwd)"
SHOTS="$DIR/src/assets/screenshots"

if command -v magick >/dev/null 2>&1; then
    IM=magick
elif command -v convert >/dev/null 2>&1; then
    IM=convert
else
    echo "error: ImageMagick (magick or convert) not found on PATH" >&2
    exit 1
fi

# Frames stacked top→bottom in the sprite. Order must match the keyframe
# percentages in Hero.astro (.hero-sprite background-position-y).
LIGHT_FRAMES=(launcher-empty launcher-t launcher-te launcher-term)
DARK_FRAMES=(launcher-dark-empty launcher-dark-t launcher-dark-te launcher-dark-term)

# Files trim() should NOT touch — the sprites are rebuilt below from their
# already-trimmed source frames, and trimming the stacked sprite separately
# could change its aspect ratio and break the hero CSS.
SKIP_TRIM=(hero-sprite-light.png hero-sprite-dark.png)

in_skip_list() {
    local needle="$1"
    for s in "${SKIP_TRIM[@]}"; do
        [[ "$needle" == "$s" ]] && return 0
    done
    return 1
}

trim_all() {
    echo "Trimming transparent borders…"
    local count=0
    for f in "$SHOTS"/*.png; do
        [[ -f "$f" ]] || continue
        local base; base="$(basename "$f")"
        if in_skip_list "$base"; then
            continue
        fi
        "$IM" "$f" -trim +repage "$f"
        count=$((count + 1))
        printf '  %s\n' "$base"
    done
    echo "  done — $count file(s)"
}

build_sprite() {
    local out_name="$1"; shift
    local -a frames=("$@")
    local out="$SHOTS/$out_name"

    echo "Building $out_name…"

    # Verify every frame exists before doing any work.
    local -a frame_paths=()
    for name in "${frames[@]}"; do
        local p="$SHOTS/$name.png"
        if [[ ! -f "$p" ]]; then
            echo "  error: missing source frame $p" >&2
            return 1
        fi
        frame_paths+=("$p")
    done

    # Stack first, then trim once — keeps every frame aligned to the same
    # bounding box so the per-frame slice math in Hero.astro stays accurate.
    "$IM" "${frame_paths[@]}" -append -trim +repage "$out"

    local size; size="$("$IM" identify -format '%wx%h' "$out")"
    echo "  $out_name = $size (frame = $(($(echo "$size" | cut -dx -f1))) x $(($(echo "$size" | cut -dx -f2) / ${#frames[@]})))"
}

mode="${1:-all}"
case "$mode" in
    trim)
        trim_all
        ;;
    sprites)
        build_sprite hero-sprite-light.png "${LIGHT_FRAMES[@]}"
        build_sprite hero-sprite-dark.png  "${DARK_FRAMES[@]}"
        ;;
    all)
        trim_all
        build_sprite hero-sprite-light.png "${LIGHT_FRAMES[@]}"
        build_sprite hero-sprite-dark.png  "${DARK_FRAMES[@]}"
        ;;
    *)
        echo "usage: $(basename "$0") [trim|sprites|all]" >&2
        exit 1
        ;;
esac

echo "Done. Remember: if the new sprite dimensions changed, update the"
echo "aspect-ratio in src/components/Hero.astro (.hero-demo)."
