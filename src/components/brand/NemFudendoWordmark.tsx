import Image from "next/image";
import wordmark from "@design/mockups/design-logo-nem-fudendo-wordmark.png";

type NemFudendoWordmarkProps = {
  className?: string;
  priority?: boolean;
};

export function NemFudendoWordmark({
  className,
  priority = false,
}: NemFudendoWordmarkProps) {
  return (
    <Image
      src={wordmark}
      alt="Nem fudendo — o jogo"
      width={wordmark.width}
      height={wordmark.height}
      className={className}
      priority={priority}
    />
  );
}
