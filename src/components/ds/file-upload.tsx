"use client";

import { useRef, useState } from "react";
import { faEye, faFilePdf } from "@fortawesome/free-regular-svg-icons";
import { faArrowUpFromBracket, faCheck, faXmark } from "@fortawesome/free-solid-svg-icons";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// DS · Upload de arquivo (Figma 1:3746): arrastar e soltar, progresso,
// pré-visualização, substituir ou remover.

const ACCEPT = ".pdf,.jpg,.jpeg,.png";
const MAX_BYTES = 10 * 1024 * 1024;

const formatSize = (bytes: number) => `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(bytes / 1024 / 1024)} MB`;

export function Dropzone({ onFiles, error, disabled }: { onFiles: (files: File[]) => void; error?: string; disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (!disabled) onFiles([...e.dataTransfer.files]);
      }}
      className={cn(
        "flex flex-col items-center gap-1 rounded-card border-2 border-dashed px-6 py-7 text-center transition-colors",
        over ? "border-navy-400 bg-navy-50" : "border-navy-200 bg-navy-50/40",
        error && "border-danger-border",
      )}
    >
      <span className="mb-2 flex size-12 items-center justify-center rounded-full border border-navy-200 bg-white text-navy-700">
        <Icon icon={faArrowUpFromBracket} size={14} />
      </span>
      <p className="text-body font-medium text-navy-900">Arraste o contrato assinado aqui</p>
      <p className="text-caption text-navy-500">
        ou{" "}
        <button type="button" disabled={disabled} onClick={() => input.current?.click()} className="font-medium text-navy-900 underline underline-offset-2 hover:text-navy-700">
          selecione um arquivo
        </button>
      </p>
      <p className="pt-2 text-overline text-navy-400">PDF, JPG ou PNG · até 10 MB</p>
      {error && <p className="pt-1 text-overline text-danger">{error}</p>}
      <input ref={input} type="file" accept={ACCEPT} hidden onChange={(e) => onFiles([...(e.target.files ?? [])])} />
    </div>
  );
}

export function UploadProgress({ name, loaded, total, onCancel }: { name: string; loaded: number; total: number; onCancel: () => void }) {
  const pct = total ? Math.round((loaded / total) * 100) : 0;
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-field border border-danger-soft bg-danger-bg text-danger">
        <Icon icon={faFilePdf} size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-table font-medium text-navy-900">{name}</p>
          <span className="num text-caption text-navy-400">{pct}%</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-navy-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-navy-900 transition-[width]" style={{ width: `${pct}%` }} />
        </div>
        <p className="num pt-1 text-overline text-navy-400">
          {formatSize(loaded)} de {formatSize(total)}
        </p>
      </div>
      <button type="button" onClick={onCancel} aria-label="Cancelar envio" className="mt-1 flex size-7 items-center justify-center rounded-field-sm text-navy-400 hover:bg-navy-50 hover:text-navy-900">
        <Icon icon={faXmark} size={12} />
      </button>
    </div>
  );
}

export function AttachedFile({
  name,
  meta,
  onView,
  onReplace,
  onRemove,
}: {
  name: string;
  meta: string;
  onView?: () => void;
  onReplace?: () => void;
  onRemove?: () => void;
}) {
  return (
    <div className="flex items-start gap-3">
      {/* Miniatura do documento */}
      <div aria-hidden className="flex h-[68px] w-20 shrink-0 flex-col gap-1 rounded-field-sm border border-navy-200 bg-white p-2">
        <span className="h-1.5 w-8 rounded-sm bg-navy-900" />
        <span className="h-1 w-full rounded-sm bg-navy-100" />
        <span className="h-1 w-full rounded-sm bg-navy-100" />
        <span className="h-1 w-3/4 rounded-sm bg-navy-100" />
        <span className="mt-auto flex justify-between">
          <span className="h-px w-5 bg-navy-300" />
          <span className="h-px w-5 bg-navy-300" />
        </span>
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="truncate text-table font-medium text-navy-900">{name}</p>
        <p className="num text-overline text-navy-400">{meta}</p>
        <span className="inline-flex h-5 items-center gap-1.5 self-start rounded-full bg-success-bg px-2.5 text-caption font-medium text-success-fg shadow-[0_0_0_1px_rgb(5_150_105/0.2)]">
          <Icon icon={faCheck} size={9} /> Contrato assinado
        </span>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button variant="secondary" size="sm" onClick={onView}>
            <Icon icon={faEye} size={12} /> Ver
          </Button>
          <Button variant="secondary" size="sm" onClick={onReplace}>
            Substituir
          </Button>
          <Button variant="ghost" size="sm" onClick={onRemove} className="text-danger-fg hover:bg-danger-bg hover:text-danger-fg">
            Remover
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Demonstração do fluxo completo (upload simulado no navegador). */
export function FileUploadDemo() {
  const [state, setState] = useState<{ kind: "empty" } | { kind: "uploading"; file: File; loaded: number } | { kind: "attached"; file: File }>({ kind: "empty" });
  const [error, setError] = useState<string>();
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  function start(files: File[]) {
    const file = files[0];
    if (!file) return;
    if (file.size > MAX_BYTES) return setError("Arquivo acima de 10 MB.");
    setError(undefined);
    let loaded = 0;
    setState({ kind: "uploading", file, loaded });
    timer.current = setInterval(() => {
      loaded = Math.min(file.size, loaded + Math.max(file.size / 12, 50_000));
      if (loaded >= file.size) {
        clearInterval(timer.current!);
        setState({ kind: "attached", file });
      } else setState({ kind: "uploading", file, loaded });
    }, 120);
  }

  if (state.kind === "uploading")
    return (
      <UploadProgress
        name={state.file.name}
        loaded={state.loaded}
        total={state.file.size}
        onCancel={() => {
          clearInterval(timer.current!);
          setState({ kind: "empty" });
        }}
      />
    );
  if (state.kind === "attached")
    return (
      <AttachedFile
        name={state.file.name}
        meta={`${formatSize(state.file.size)} · ${new Intl.DateTimeFormat("pt-BR").format(new Date())}`}
        onView={() => window.open(URL.createObjectURL(state.file), "_blank")}
        onReplace={() => setState({ kind: "empty" })}
        onRemove={() => setState({ kind: "empty" })}
      />
    );
  return <Dropzone onFiles={start} error={error} />;
}
