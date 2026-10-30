import * as React from "react";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { fieldBase } from "./input";

// Select simples (nativo) para listas curtas: forma de pagamento, unidade,
// status. Para listas longas use o Combobox pesquisável.
function NativeSelect({
  className,
  containerClassName,
  inputSize = "md",
  children,
  ...props
}: React.ComponentProps<"select"> & { inputSize?: "sm" | "md"; containerClassName?: string }) {
  return (
    <div className={cn("relative", containerClassName)}>
      <select
        data-slot="native-select"
        className={cn(
          fieldBase,
          "appearance-none pr-8 pl-[13px]",
          inputSize === "md" ? "h-10 text-table" : "h-8 rounded-field-sm pl-2.5 text-table",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <Icon
        icon={faChevronDown}
        size={9}
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-navy-400"
      />
    </div>
  );
}

export { NativeSelect };
