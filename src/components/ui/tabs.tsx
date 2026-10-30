"use client";

import * as React from "react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

// DS · Abas sublinhadas (detalhe) e segmentado (alternância de visão).

const Tabs = TabsPrimitive.Root;

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn("flex items-end gap-6 border-b border-navy-100", className)}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  count,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger> & { count?: number }) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "group relative -mb-px flex h-12 items-center gap-1.5 px-1 text-table font-medium whitespace-nowrap text-navy-500 transition-colors outline-none hover:text-navy-900 focus-visible:text-navy-900 focus-visible:underline data-[state=active]:text-navy-900",
        "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-transparent data-[state=active]:after:bg-navy-900",
        className,
      )}
      {...props}
    >
      {children}
      {count != null && (
        <span className="num rounded-full bg-navy-100 px-1.5 text-overline font-medium text-navy-500 group-data-[state=active]:text-navy-900">
          {count}
        </span>
      )}
    </TabsPrimitive.Trigger>
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn("outline-none", className)} {...props} />;
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
