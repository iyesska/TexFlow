import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { comboKeys, type KeyCombo } from "@/lib/keyboard";

/** Renders a shortcut as key caps, e.g. Alt 1. */
export function ShortcutKeys({
  combo,
  className,
}: {
  combo: KeyCombo;
  className?: string;
}) {
  return (
    <KbdGroup className={className}>
      {comboKeys(combo).map((key) => (
        <Kbd key={key}>{key}</Kbd>
      ))}
    </KbdGroup>
  );
}
