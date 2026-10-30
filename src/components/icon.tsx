import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { cn } from "@/lib/utils";

// Os ícones do Figma são do Font Awesome 6 Free (contorno = regular, sólidos
// pontuais = solid). `size` é a altura em px, como no design.

export function Icon({
  icon,
  size = 14,
  className,
  title,
}: {
  icon: IconDefinition;
  size?: number;
  className?: string;
  title?: string;
}) {
  return (
    <FontAwesomeIcon
      icon={icon}
      title={title}
      aria-hidden={title ? undefined : true}
      className={cn("shrink-0", className)}
      style={{ height: size, width: "auto" }}
    />
  );
}
