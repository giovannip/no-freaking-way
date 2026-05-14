import Image from "next/image";
import icon from "@design/mockups/design-logo-nem-fudendo-icon.png";

type NemFudendoIconMarkProps = {
  className?: string;
  size?: number;
  priority?: boolean;
};

export function NemFudendoIconMark({
  className,
  size = 40,
  priority = false,
}: NemFudendoIconMarkProps) {
  return (
    <Image
      src={icon}
      alt=""
      width={size}
      height={size}
      className={className}
      priority={priority}
    />
  );
}
