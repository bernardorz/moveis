import * as React from "react";
import { faCircleNotch } from "@fortawesome/free-solid-svg-icons";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

// DS · Botões (Figma 1:2441): primária navy, secundária com borda, ghost,
// destrutiva vermelha, ícone 40×40 e link de texto. Tamanhos 32 / 40 / 44.
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-field font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:shadow-focus disabled:pointer-events-none aria-busy:pointer-events-none aria-busy:opacity-60 [&_svg]:pointer-events-none",
  {
    variants: {
      variant: {
        primary:
          "bg-navy-900 text-white hover:bg-navy-800 disabled:bg-navy-100 disabled:text-navy-400",
        secondary:
          "border border-navy-200 bg-white text-navy-900 hover:bg-navy-50 aria-expanded:bg-navy-50 disabled:text-navy-400",
        ghost:
          "text-navy-600 hover:bg-navy-50 hover:text-navy-900 aria-expanded:bg-navy-50 disabled:text-navy-300",
        destructive:
          "bg-danger text-white hover:bg-danger-fg disabled:bg-navy-100 disabled:text-navy-400",
        "destructive-outline":
          "border border-danger/30 bg-white text-danger-fg hover:bg-danger-bg disabled:text-navy-400",
        link: "h-auto! px-0! text-navy-900 underline-offset-4 hover:underline disabled:text-navy-400",
      },
      size: {
        sm: "h-8 px-3 text-table [&_svg]:h-3",
        compact: "h-9 px-4 text-table [&_svg]:h-[11px]",
        md: "h-10 px-4 text-body [&_svg]:h-3.5",
        lg: "h-11 px-5 text-body [&_svg]:h-3.5",
        icon: "size-10 [&_svg]:h-3.5",
        "icon-sm": "size-8 [&_svg]:h-3",
        "icon-xs": "size-7 rounded-field-sm [&_svg]:h-3",
      },
    },
    compoundVariants: [
      { variant: "secondary", size: ["md", "compact"], className: "px-[17px]" },
      { variant: "secondary", size: "icon", className: "p-px" },
    ],
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    /** Mostra o spinner e bloqueia o clique (estado "Salvando..."). */
    loading?: boolean;
  };

function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button"
      data-variant={variant ?? "primary"}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading && <Icon icon={faCircleNotch} size={12} className="animate-spin" />}
          {children}
        </>
      )}
    </Comp>
  );
}

export { Button, buttonVariants, type ButtonProps };
