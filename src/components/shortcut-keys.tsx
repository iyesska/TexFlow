"use client";

import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { useIsMac } from "@/hooks/use-is-mac";
import { comboKeys, type KeyCombo } from "@/lib/keyboard";

/** Renders a shortcut as key caps, e.g. Alt 1, with Mac symbols on a Mac. */
export function ShortcutKeys({
  combo,
  className,
}: {
  combo: KeyCombo;
  className?: string;
}) {
  const isMac = useIsMac();
  return (
    <KbdGroup className={className}>
      {comboKeys(combo, isMac).map((key) => (
        <Kbd key={key}>{key}</Kbd>
      ))}
    </KbdGroup>
  );
}
