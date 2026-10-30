"use client";

import { faArrowRightFromBracket, faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { faPalette } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { logout } from "@/app/(auth)/login/actions";
import { Icon } from "@/components/icon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/lib/format";

export function UserMenu({ name, role, image }: { name: string; role: string; image?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-3 rounded-field py-1 pr-1 text-left focus-visible:shadow-focus focus-visible:outline-none">
        <Avatar className="size-9">
          {image && <AvatarImage src={image} alt="" />}
          <AvatarFallback className="bg-navy-100 text-caption font-semibold text-navy-700">
            {initials(name)}
          </AvatarFallback>
        </Avatar>
        <span className="flex flex-col">
          <span className="text-table leading-[16.25px] font-medium text-navy-900">{name}</span>
          <span className="text-overline leading-[13.75px] text-navy-400">{role}</span>
        </span>
        <Icon icon={faChevronDown} size={10} className="text-navy-400" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem asChild>
          <Link href="/design-system">
            <Icon icon={faPalette} size={12} />
            Design system
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => logout()}>
          <Icon icon={faArrowRightFromBracket} size={12} />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
