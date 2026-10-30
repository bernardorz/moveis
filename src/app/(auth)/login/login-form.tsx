"use client";

import { useActionState, useState } from "react";
import { faCircleQuestion, faEnvelope, faEye, faEyeSlash } from "@fortawesome/free-regular-svg-icons";
import { faCircleExclamation, faLock } from "@fortawesome/free-solid-svg-icons";
import { BrandMark } from "@/components/brand-mark";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { login, type LoginState } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, {});
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);

  return (
    <div className="flex w-full max-w-[400px] flex-col gap-9">
      <div className="flex items-center gap-3 lg:hidden">
        <span className="rounded-field bg-navy-900 p-1">
          <BrandMark size={36} />
        </span>
        <p className="text-h3 text-navy-900">DH Móveis</p>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-h1 text-navy-900">Entrar</h2>
        <p className="text-body text-navy-500">Acesse com seu e-mail corporativo.</p>
      </div>

      <form action={formAction} className="flex flex-col gap-5" noValidate>
        {next && <input type="hidden" name="next" value={next} />}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-body font-medium text-navy-900">
            E-mail
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            placeholder="nome@dhmoveis.com.br"
            inputSize="lg"
            defaultValue={state.email}
            aria-invalid={Boolean(state.error) || undefined}
            leading={<Icon icon={faEnvelope} size={14} className="ml-0.5" />}
            className="pl-[41px]"
            required
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-body font-medium text-navy-900">
              Senha
            </label>
            <Popover>
              <PopoverTrigger className="rounded-sm text-caption font-medium text-navy-600 hover:text-navy-900 hover:underline focus-visible:shadow-focus focus-visible:outline-none">
                Esqueci minha senha
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 text-table text-navy-600">
                Para redefinir a senha, fale com o administrador do sistema. Ele pode gerar uma nova senha
                temporária para você.
              </PopoverContent>
            </Popover>
          </div>
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            inputSize="lg"
            aria-invalid={Boolean(state.error) || undefined}
            leading={<Icon icon={faLock} size={14} className="ml-0.5" />}
            className="pr-[45px] pl-[41px]"
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                className="-mr-1 flex size-8 items-center justify-center rounded-field-sm text-navy-400 hover:bg-navy-50 hover:text-navy-700 focus-visible:shadow-focus focus-visible:outline-none"
              >
                <Icon icon={showPassword ? faEyeSlash : faEye} size={14} />
              </button>
            }
            required
          />
        </div>

        <label className="flex cursor-pointer items-center gap-2.5 text-body text-navy-600">
          <Checkbox
            name="rememberMe"
            checked={remember}
            onCheckedChange={(v) => setRemember(v === true)}
          />
          Manter conectado neste computador
        </label>

        {state.error && (
          <p role="alert" className="-mt-1 flex items-center gap-2 rounded-field bg-danger-bg px-3 py-2 text-table text-danger-fg">
            <Icon icon={faCircleExclamation} size={12} />
            {state.error}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" loading={pending}>
          {pending ? "Entrando..." : "Entrar"}
        </Button>
      </form>

      <div className="flex items-start gap-3 border-t border-navy-100 pt-[29px] text-caption text-navy-500">
        <Icon icon={faCircleQuestion} size={12} className="mt-[3px]" />
        <p>Sem acesso? Solicite ao administrador do sistema a criação do seu usuário.</p>
      </div>
    </div>
  );
}
