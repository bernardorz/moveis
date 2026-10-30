"use client";

import { useState } from "react";
import { faBell } from "@fortawesome/free-regular-svg-icons";
import { faArrowDownShortWide, faArrowUpWideShort, faBars, faGripLines, faPhone } from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ds/badge";
import { BarChart } from "@/components/ds/bar-chart";
import { Combobox } from "@/components/ds/combobox";
import { ConfirmDialog } from "@/components/ds/confirm-dialog";
import { DataTable, Pagination, SkeletonRow, TBody, TD, TFoot, TH, THead, TR } from "@/components/ds/data-table";
import { DateInput, DimensionsInput, DiscountInput, MoneyInput } from "@/components/ds/inputs";
import { AttachedFile, UploadProgress } from "@/components/ds/file-upload";
import { MultiSelect } from "@/components/ds/multi-select";
import { RowActions } from "@/components/ds/row-actions";
import { Segmented } from "@/components/ds/segmented";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Estrutura } from "@/features/orcamentos/components/estrutura";
import type { ComodoDoc } from "@/features/orcamentos/schemas";
import { formatBRL } from "@/lib/format";
import { maskCpfCnpj, maskPhone } from "@/lib/masks";

export function CamposDemo() {
  const [doc, setDoc] = useState("123.456.789-09");
  const [tel, setTel] = useState("(41) 99812-4471");
  const [valor, setValor] = useState<number | null>(6315.28);
  const [data, setData] = useState<string | null>("2025-06-20");
  const [dims, setDims] = useState<{ largura: number | null; altura: number | null; profundidade: number | null }>({ largura: 2400, altura: 900, profundidade: 1100 });
  const [desconto, setDesconto] = useState<{ tipo: "percentual" | "valor"; valor: number }>({ tipo: "percentual", valor: 5 });
  const [abaixo, setAbaixo] = useState(true);
  const [status, setStatus] = useState("em_aberto");
  const [compacta, setCompacta] = useState(true);

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <Field label="Nome / Razão social" htmlFor="ds-nome" required>
        <Input id="ds-nome" defaultValue="Maria Silva" />
      </Field>
      <Field label="E-mail" htmlFor="ds-email" optional>
        <Input id="ds-email" type="email" placeholder="nome@email.com" />
      </Field>
      <Field label="Nº do cheque" htmlFor="ds-cheque" required error="Informe o número do cheque.">
        <Input id="ds-cheque" aria-invalid />
      </Field>
      <Field label="CPF/CNPJ" htmlFor="ds-doc" optional description="Alterna para CNPJ (00.000.000/0000-00) acima de 11 dígitos">
        <Input id="ds-doc" className="num" value={doc} onChange={(e) => setDoc(maskCpfCnpj(e.target.value))} />
      </Field>
      <Field label="Telefone" htmlFor="ds-tel" optional>
        <Input id="ds-tel" className="num pl-[37px]" leading={<Icon icon={faPhone} size={11} />} value={tel} onChange={(e) => setTel(maskPhone(e.target.value))} />
      </Field>
      <Field label="Valor" htmlFor="ds-valor" required description="Alinhado à direita · vírgula decimal">
        <MoneyInput id="ds-valor" value={valor} onValueChange={setValor} />
      </Field>
      <Field label="Bom para" htmlFor="ds-data" required>
        <DateInput id="ds-data" value={data} onValueChange={setData} />
      </Field>
      <Field label="Dimensões" hint="L × A × P (mm)">
        <DimensionsInput value={dims} onValueChange={setDims} showCaptions />
      </Field>
      <Field label="Desconto" htmlFor="ds-desc">
        <DiscountInput id="ds-desc" tipo={desconto.tipo} valor={desconto.valor} subtotal={56980} onChange={setDesconto} />
      </Field>
      <Field label="Observações" htmlFor="ds-obs" optional className="md:col-span-2">
        <Textarea id="ds-obs" defaultValue="Instalação inclusa para Criciuma e região." />
      </Field>
      <div className="flex flex-col gap-2.5">
        <span className="text-table font-medium text-navy-900">Controles</span>
        <label className="flex items-center gap-2.5 text-table text-navy-900">
          <Checkbox checked={abaixo} onCheckedChange={(v) => setAbaixo(v === true)} /> Abaixo do mínimo
        </label>
        <RadioGroup value={status} onValueChange={setStatus} className="flex items-center gap-3">
          <label className="flex items-center gap-2.5 text-table text-navy-900">
            <RadioGroupItem value="em_aberto" /> Em aberto
          </label>
          <label className="flex items-center gap-2.5 text-table text-navy-900">
            <RadioGroupItem value="paga" /> Paga
          </label>
        </RadioGroup>
        <label className="flex items-center gap-2.5 text-table text-navy-900">
          <Switch checked={compacta} onCheckedChange={setCompacta} /> Tabela compacta
        </label>
      </div>
    </div>
  );
}

const CLIENTES = [
  { value: "1", label: "Maria Silva", detail: "123.456.789-09" },
  { value: "2", label: "Mariana Teixeira", detail: "987.654.321-00" },
  { value: "3", label: "Ana Maria Prado", detail: "(41) 98877-1203" },
];

const DUPLICATAS = [
  { value: "a", group: "NF 58.214 · Duratex S.A.", label: "Dup 1/3", detail: "15/04/2025", amount: 7912.4 },
  { value: "b", group: "NF 58.214 · Duratex S.A.", label: "Dup 2/3", detail: "15/05/2025", amount: 7912.4 },
  { value: "c", group: "NF 12.877 · Häfele Brasil", label: "Dup 1/2", detail: "20/05/2025", amount: 4615 },
];

export function SelecaoDemo() {
  const [forma, setForma] = useState("pix");
  const [cliente, setCliente] = useState<string | null>("1");
  const [dups, setDups] = useState(["b", "c"]);
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <div className="flex flex-col gap-5">
        <Field label="Forma de pagamento" htmlFor="ds-forma">
          <NativeSelect id="ds-forma" value={forma} onChange={(e) => setForma(e.target.value)}>
            <option value="pix">Pix</option>
            <option value="boleto">Boleto</option>
            <option value="cartao">Cartão de crédito</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="cheque">Cheque</option>
          </NativeSelect>
        </Field>
        <Field label="Unidade de medida" htmlFor="ds-unidade">
          <NativeSelect id="ds-unidade" defaultValue="chapa">
            <option value="m2">m²</option>
            <option value="chapa">chapa</option>
            <option value="unidade">unidade</option>
            <option value="metro_linear">metro linear</option>
            <option value="caixa">caixa</option>
          </NativeSelect>
        </Field>
      </div>
      <Field label="Cliente" htmlFor="ds-cliente" optional="pesquisável">
        <Combobox
          id="ds-cliente"
          options={CLIENTES}
          value={cliente}
          onValueChange={setCliente}
          placeholder="Buscar cliente"
          searchPlaceholder="Digite “mari”"
          onCreate={(q) => toast.info("Cadastrar novo cliente", { description: q ? `Nome: ${q}` : "Abre o cadastro rápido." })}
          createLabel="Cadastrar novo cliente"
        />
      </Field>
      <Field label="Duplicatas vinculadas" optional="multisseleção">
        <MultiSelect
          options={DUPLICATAS}
          value={dups}
          onValueChange={setDups}
          placeholder="Buscar por nota..."
          chipLabel={(o) => `${o.group.split(" · ")[0]} · ${o.label}`}
        />
      </Field>
    </div>
  );
}

export function AbasDemo() {
  const [periodo, setPeriodo] = useState("mes");
  return (
    <div className="grid grid-cols-1 gap-7 md:grid-cols-2">
      <div className="flex flex-col gap-3">
        <p className="eyebrow">Abas sublinhadas · detalhe</p>
        <Tabs defaultValue="orcamentos">
          <TabsList>
            <TabsTrigger value="orcamentos" count={4}>Orçamentos</TabsTrigger>
            <TabsTrigger value="pedidos" count={2}>Pedidos</TabsTrigger>
            <TabsTrigger value="cheques" count={6}>Cheques</TabsTrigger>
            <TabsTrigger value="contas">Contas</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="flex flex-col gap-3">
        <p className="eyebrow">Segmentado · alternância de visão</p>
        <Segmented
          ariaLabel="Período"
          value={periodo}
          onChange={setPeriodo}
          className="self-start"
          options={[
            { value: "mes", label: "Este mês" },
            { value: "trimestre", label: "Trimestre" },
            { value: "ano", label: "Ano" },
            { value: "personalizado", label: "Personalizado" },
          ]}
        />
      </div>
    </div>
  );
}

export function DensityToggle({ value, onChange }: { value: "comfortable" | "compact"; onChange: (v: "comfortable" | "compact") => void }) {
  return (
    <Segmented
      ariaLabel="Densidade"
      size="sm"
      value={value}
      onChange={onChange}
      options={[
        { value: "comfortable", label: <><Icon icon={faBars} size={11} /> Confortável</> },
        { value: "compact", label: <><Icon icon={faGripLines} size={11} /> Compacto</> },
      ]}
    />
  );
}

const MESES = [
  { mes: "Jan", previsto: 42000, realizado: 39800 },
  { mes: "Fev", previsto: 51000, realizado: 47250 },
  { mes: "Mar", previsto: 48500, realizado: 48500 },
  { mes: "Abr", previsto: 63000, realizado: 55900 },
  { mes: "Mai", previsto: 96450, realizado: 41208 },
  { mes: "Jun", previsto: 72300, realizado: 0 },
  { mes: "Jul", previsto: 58700, realizado: 0 },
];

export function ChartDemo() {
  return <BarChart data={MESES} mesAtual="Mai" />;
}

export function OverlaysDemo() {
  const [modal, setModal] = useState<"confirm" | "destroy" | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [data, setData] = useState<string | null>("2025-06-20");
  const [valor, setValor] = useState<number | null>(6315.28);

  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="secondary" size="compact" onClick={() => setModal("confirm")}>
        Modal de confirmação
      </Button>
      <Button variant="secondary" size="compact" onClick={() => setModal("destroy")}>
        Ação destrutiva
      </Button>
      <Button variant="secondary" size="compact" onClick={() => setDrawer(true)}>
        Drawer lateral
      </Button>
      <ConfirmDialog
        open={modal === "confirm"}
        onOpenChange={(v) => !v && setModal(null)}
        title="Marcar cheque como compensado?"
        description="As duplicatas abaixo serão baixadas automaticamente:"
        confirmLabel="Confirmar compensação"
        onConfirm={() => {
          setModal(null);
          toast.success("Cheque compensado", { description: "2 duplicatas baixadas" });
        }}
      >
        <ul className="num flex flex-col gap-1 pt-1.5 text-caption text-navy-900">
          <li className="flex justify-between">
            <span>NF 58.214 · Dup 2/3</span>
            <span className="font-medium">R$ 7.912,40</span>
          </li>
          <li className="flex justify-between">
            <span>NF 12.877 · Dup 1/2</span>
            <span className="font-medium">R$ 4.615,00</span>
          </li>
        </ul>
      </ConfirmDialog>
      <ConfirmDialog
        open={modal === "destroy"}
        onOpenChange={(v) => !v && setModal(null)}
        destructive
        title="Excluir conta a pagar?"
        description="“Aluguel do galpão · 16/05/2025” será removida. Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        cancelLabel="Voltar"
        onConfirm={() => setModal(null)}
      />
      <Sheet open={drawer} onOpenChange={setDrawer}>
        <SheetContent className="max-w-[360px]">
          <SheetHeader title="Registrar recebimento" />
          <SheetBody>
            <Field label="Data do recebimento" htmlFor="ds-rec-data" required>
              <DateInput id="ds-rec-data" value={data} onValueChange={setData} />
            </Field>
            <Field label="Valor recebido" htmlFor="ds-rec-valor" required>
              <MoneyInput id="ds-rec-valor" value={valor} onValueChange={setValor} />
            </Field>
          </SheetBody>
          <SheetFooter>
            <Button variant="secondary" size="compact" onClick={() => setDrawer(false)}>
              Cancelar
            </Button>
            <Button size="compact" onClick={() => setDrawer(false)}>
              Salvar
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function ToastTrigger() {
  return (
    <Button
      variant="secondary"
      size="compact"
      onClick={() => {
        toast.success("Orçamento salvo", { description: "Orçamento #0248 atualizado às 14:32" });
        setTimeout(() => toast.error("Não foi possível salvar", { description: "Verifique a conexão e tente novamente.", action: { label: "Tentar de novo", onClick: () => {} } }), 250);
        setTimeout(() => toast.warning("Saldo ficará abaixo do mínimo", { description: "MDF Branco TX 18 mm: saldo após saída 2 / mín. 15" }), 500);
        setTimeout(() => toast.info("Pedido #0131 criado", { description: "A partir do Orçamento #0248 aprovado.", action: { label: "Abrir", onClick: () => {} } }), 750);
      }}
    >
      <Icon icon={faBell} size={13} />
      Disparar toast
    </Button>
  );
}

const CHEQUES_DEMO = [
  { numero: "000287", emitente: "Carlos Mendes", banco: "Itaú", bomPara: "16/05/2025", status: "em_carteira", vinculo: "Pedido #0124", valor: 4380 },
  { numero: "102455", emitente: "Ana Beatriz Costa", banco: "Bradesco", bomPara: "18/05/2025", status: "depositado", vinculo: "Pedido #0127", valor: 3125 },
  { numero: "004512", emitente: "Fernando Rocha", banco: "Banco do Brasil", bomPara: "02/05/2025", status: "compensado", vinculo: "NF 58.214 · Dup 2/3", valor: 2950 },
  { numero: "000918", emitente: "Juliana Prado", banco: "Santander", bomPara: "28/04/2025", status: "devolvido", vinculo: "Pedido #0112", valor: 5600 },
] as const;

export function TabelaDemo() {
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [sort, setSort] = useState<"asc" | "desc">("asc");
  const rows = [...CHEQUES_DEMO].sort((a, b) => (sort === "asc" ? a.numero.localeCompare(b.numero) : b.numero.localeCompare(a.numero)));
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <DensityToggle value={density} onChange={setDensity} />
      </div>
      <DataTable
        density={density}
        footer={<Pagination page={1} pageSize={4} total={23} hrefFor={(p) => `#tabela-p${p}`} />}
      >
        <THead>
          <th scope="col" className="py-2.5 pr-3 pl-5 text-left">
            <button type="button" onClick={() => setSort((s) => (s === "asc" ? "desc" : "asc"))} className="inline-flex items-center gap-1.5 font-semibold">
              Número <Icon icon={sort === "asc" ? faArrowDownShortWide : faArrowUpWideShort} size={10} />
            </button>
          </th>
          <TH>Emitente</TH>
          <TH>Banco</TH>
          <TH sort={{ active: false, href: "#tabela" }}>Bom para</TH>
          <TH>Status</TH>
          <TH>Vínculo</TH>
          <TH align="right" sort={{ active: false, href: "#tabela" }}>
            Valor
          </TH>
          <TH width={60}>
            <span className="sr-only">Ações</span>
          </TH>
        </THead>
        <TBody>
          {rows.map((c) => (
            <TR key={c.numero}>
              <TD strong className="num">
                {c.numero}
              </TD>
              <TD>{c.emitente}</TD>
              <TD muted>{c.banco}</TD>
              <TD className="num">{c.bomPara}</TD>
              <TD>
                <StatusBadge entity="cheque" status={c.status} />
              </TD>
              <TD>
                <span className="inline-flex h-[22px] items-center rounded-field-sm border border-navy-100 bg-navy-50 px-[9px] text-caption font-medium">{c.vinculo}</span>
              </TD>
              <TD align="right" strong>
                {formatBRL(c.valor)}
              </TD>
              <TD align="right">
                <RowActions>
                  <DropdownMenuItem>Ver detalhe</DropdownMenuItem>
                  <DropdownMenuItem>Marcar como compensado</DropdownMenuItem>
                </RowActions>
              </TD>
            </TR>
          ))}
          <SkeletonRow columns={8} />
        </TBody>
        <TFoot>
          <tr>
            <td colSpan={6} className="py-2.5 pl-5">
              Total · 4 cheques
            </td>
            <td className="num py-2.5 pr-3 text-right">{formatBRL(16055)}</td>
            <td />
          </tr>
        </TFoot>
      </DataTable>
    </div>
  );
}

const TREE_DEMO: ComodoDoc[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    nome: "Cozinha",
    moveis: [
      {
        id: "00000000-0000-4000-8000-000000000002",
        nome: "Ilha",
        itens: [
          { id: "00000000-0000-4000-8000-000000000003", descricao: "Bancada da ilha", quantidade: 1, largura: 2400, altura: 900, profundidade: 1100, material: "Quartzo Branco Prime", valorUnitario: 6200 },
          { id: "00000000-0000-4000-8000-000000000004", descricao: "Passa-prato", quantidade: 1, largura: 1200, altura: 450, profundidade: 40, material: "MDF Louro Freijó 18 mm", valorUnitario: 1420 },
        ],
      },
      {
        id: "00000000-0000-4000-8000-000000000005",
        nome: "Armários superiores",
        itens: [
          { id: "00000000-0000-4000-8000-000000000006", descricao: "Módulo superior", quantidade: 3, largura: 800, altura: 700, profundidade: 350, material: "MDF Branco TX 18 mm", valorUnitario: 1640 },
          { id: "00000000-0000-4000-8000-000000000007", descricao: "Nicho aberto com LED", quantidade: 2, largura: 600, altura: 350, profundidade: 350, material: "MDF Louro Freijó 18 mm", valorUnitario: 950 },
          { id: "00000000-0000-4000-8000-000000000008", descricao: "Cantoneira superior", quantidade: 1, largura: 900, altura: 700, profundidade: 350, material: "MDF Branco TX 18 mm", valorUnitario: 1600 },
        ],
      },
    ],
  },
];

export function ArvoreDemo() {
  const [comodos, setComodos] = useState(TREE_DEMO);
  const [collapsed, setCollapsed] = useState(new Set(["00000000-0000-4000-8000-000000000005"]));
  return <Estrutura comodos={comodos} onChange={setComodos} readOnly={false} collapsed={collapsed} onCollapsedChange={setCollapsed} materiais={["MDF Branco TX 18 mm", "MDF Louro Freijó 18 mm"]} />;
}

export function UploadStates() {
  return (
    <>
      <div className="rounded-card border border-navy-100 p-5">
        <p className="eyebrow pb-3">Enviando</p>
        <UploadProgress name="contrato-0098-assinado" loaded={1.2 * 1024 * 1024} total={1.8 * 1024 * 1024} onCancel={() => {}} />
      </div>
      <div className="rounded-card border border-navy-100 p-5">
        <p className="eyebrow pb-3">Anexado</p>
        <AttachedFile name="contrato-0098-assinado.pdf" meta="1,8 MB · 16/05/2025 · Ricardo Dias" />
      </div>
    </>
  );
}
