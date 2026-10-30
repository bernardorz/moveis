"use client";

import * as React from "react";
import { faCheck, faMinus } from "@fortawesome/free-solid-svg-icons";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative flex size-4 shrink-0 items-center justify-center rounded-[3px] border border-navy-300 bg-white text-white transition-colors outline-none after:absolute after:-inset-2 focus-visible:shadow-focus disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-navy-900 data-[state=checked]:bg-navy-900 data-[state=indeterminate]:border-navy-900 data-[state=indeterminate]:bg-navy-900",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator data-slot="checkbox-indicator" className="grid place-content-center">
        <Icon icon={props.checked === "indeterminate" ? faMinus : faCheck} size={9} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
