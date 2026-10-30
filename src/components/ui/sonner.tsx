"use client";

import { faCircleCheck, faCircleInfo, faCircleExclamation, faTriangleExclamation, faCircleNotch } from "@fortawesome/free-solid-svg-icons";
import { Toaster as Sonner } from "sonner";
import { Icon } from "@/components/icon";

// DS · Toasts (Figma 1:3548): canto inferior direito, 4 s. Sucesso em navy;
// erro, aviso e info em branco com borda da cor semântica.
export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      duration={4000}
      gap={12}
      closeButton
      icons={{
        success: <Icon icon={faCircleCheck} size={13} className="text-success-dot" />,
        error: <Icon icon={faCircleExclamation} size={13} className="text-danger" />,
        warning: <Icon icon={faTriangleExclamation} size={13} className="text-warning" />,
        info: <Icon icon={faCircleInfo} size={13} className="text-info" />,
        loading: <Icon icon={faCircleNotch} size={13} className="animate-spin text-navy-400" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "group/toast flex w-[356px] items-start gap-3 rounded-field border border-transparent bg-white px-[17px] py-[13px] font-sans shadow-[0_10px_15px_-3px_rgb(0_0_0/0.1),0_4px_6px_-4px_rgb(0_0_0/0.1)]",
          icon: "mt-[3px] flex shrink-0",
          content: "flex min-w-0 flex-1 flex-col",
          title: "text-table font-medium",
          description: "text-caption text-navy-500",
          actionButton:
            "shrink-0 cursor-pointer self-start text-caption font-medium hover:underline focus-visible:underline focus-visible:outline-none",
          closeButton:
            "order-last ml-1 flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-[4px] text-navy-400 hover:text-navy-900 [&_svg]:size-3",
          success:
            "border-navy-900! bg-navy-900! [&_[data-title]]:text-white [&_[data-description]]:text-navy-300 [&_[data-close-button]]:text-navy-300 [&_[data-close-button]:hover]:text-white [&_[data-button]]:text-white",
          error: "border-danger-soft! [&_[data-title]]:text-danger-strong [&_[data-button]]:text-danger-fg",
          warning: "border-[#fde68a]! [&_[data-title]]:text-[#92400e] [&_[data-button]]:text-warning-fg",
          info: "border-[#bfdbfe]! [&_[data-title]]:text-[#1e40af] [&_[data-button]]:text-info-fg",
        },
      }}
    />
  );
}
