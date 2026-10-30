CREATE TYPE "public"."cheque_status" AS ENUM('em_carteira', 'depositado', 'compensado', 'devolvido', 'repassado');--> statement-breakpoint
CREATE TYPE "public"."conta_status" AS ENUM('em_aberto', 'pago');--> statement-breakpoint
CREATE TYPE "public"."conta_tipo" AS ENUM('pagar', 'receber');--> statement-breakpoint
CREATE TYPE "public"."contrato_status" AS ENUM('gerado', 'assinado');--> statement-breakpoint
CREATE TYPE "public"."desconto_tipo" AS ENUM('percentual', 'valor');--> statement-breakpoint
CREATE TYPE "public"."duplicata_status" AS ENUM('em_aberto', 'paga');--> statement-breakpoint
CREATE TYPE "public"."forma_pagamento" AS ENUM('boleto', 'cartao_credito', 'pix', 'dinheiro', 'cheque');--> statement-breakpoint
CREATE TYPE "public"."movimentacao_tipo" AS ENUM('entrada', 'saida');--> statement-breakpoint
CREATE TYPE "public"."orcamento_status" AS ENUM('rascunho', 'enviado', 'aprovado', 'recusado');--> statement-breakpoint
CREATE TYPE "public"."pedido_status" AS ENUM('aguardando_producao', 'em_producao', 'pronto', 'entregue', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."unidade_medida" AS ENUM('m2', 'chapa', 'unidade', 'metro_linear', 'caixa');--> statement-breakpoint
CREATE SEQUENCE "public"."orcamento_numero_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE SEQUENCE "public"."contrato_numero_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE SEQUENCE "public"."pedido_numero_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"impersonated_by" text,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clientes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"documento" text,
	"telefone" text,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fornecedores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"documento" text,
	"telefone" text,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orcamento_comodos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"orcamento_id" uuid NOT NULL,
	"nome" text DEFAULT '' NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orcamento_itens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"descricao" text DEFAULT '' NOT NULL,
	"quantidade" numeric(12, 3) DEFAULT 1 NOT NULL,
	"largura" integer,
	"altura" integer,
	"profundidade" integer,
	"material" text,
	"valor_unitario" numeric(14, 2) DEFAULT 0 NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"movel_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orcamento_moveis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comodo_id" uuid NOT NULL,
	"nome" text DEFAULT '' NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orcamentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero" integer DEFAULT nextval('orcamento_numero_seq') NOT NULL,
	"status" "orcamento_status" DEFAULT 'rascunho' NOT NULL,
	"cliente_id" uuid,
	"cliente_nome_livre" text,
	"data_emissao" date DEFAULT now() NOT NULL,
	"validade_dias" integer DEFAULT 15 NOT NULL,
	"vendedor_id" text,
	"endereco_obra" text,
	"desconto_tipo" "desconto_tipo" DEFAULT 'percentual' NOT NULL,
	"desconto_valor" numeric(14, 2) DEFAULT 0 NOT NULL,
	"forma_pagamento" text,
	"condicao_detalhada" text,
	"prazo_entrega_dias" integer,
	"observacoes" text,
	"enviado_em" timestamp with time zone,
	"aprovado_em" timestamp with time zone,
	"recusado_em" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orcamentos_numero_unique" UNIQUE("numero")
);
--> statement-breakpoint
CREATE TABLE "contratos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero" integer DEFAULT nextval('contrato_numero_seq') NOT NULL,
	"pedido_id" uuid NOT NULL,
	"status" "contrato_status" DEFAULT 'gerado' NOT NULL,
	"clausulas" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"gerado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"assinado_em" timestamp with time zone,
	"arquivo_assinado_path" text,
	"arquivo_assinado_nome" text,
	"arquivo_assinado_tamanho" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contratos_numero_unique" UNIQUE("numero"),
	CONSTRAINT "contratos_pedidoId_unique" UNIQUE("pedido_id")
);
--> statement-breakpoint
CREATE TABLE "pedido_comodos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pedido_id" uuid NOT NULL,
	"nome" text DEFAULT '' NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pedido_itens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"descricao" text DEFAULT '' NOT NULL,
	"quantidade" numeric(12, 3) DEFAULT 1 NOT NULL,
	"largura" integer,
	"altura" integer,
	"profundidade" integer,
	"material" text,
	"valor_unitario" numeric(14, 2) DEFAULT 0 NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"movel_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pedido_moveis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comodo_id" uuid NOT NULL,
	"nome" text DEFAULT '' NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pedido_status_historico" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pedido_id" uuid NOT NULL,
	"status" "pedido_status" NOT NULL,
	"data" timestamp with time zone DEFAULT now() NOT NULL,
	"motivo" text,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "pedidos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero" integer DEFAULT nextval('pedido_numero_seq') NOT NULL,
	"orcamento_id" uuid NOT NULL,
	"cliente_id" uuid NOT NULL,
	"status" "pedido_status" DEFAULT 'aguardando_producao' NOT NULL,
	"data_pedido" date DEFAULT now() NOT NULL,
	"prazo_entrega_dias" integer,
	"previsao_entrega" date,
	"endereco_obra" text,
	"vendedor_id" text,
	"forma_pagamento" text,
	"condicao_detalhada" text,
	"observacoes" text,
	"subtotal" numeric(14, 2) DEFAULT 0 NOT NULL,
	"desconto_tipo" "desconto_tipo" DEFAULT 'percentual' NOT NULL,
	"desconto_valor" numeric(14, 2) DEFAULT 0 NOT NULL,
	"desconto_total" numeric(14, 2) DEFAULT 0 NOT NULL,
	"total" numeric(14, 2) DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pedidos_numero_unique" UNIQUE("numero"),
	CONSTRAINT "pedidos_orcamentoId_unique" UNIQUE("orcamento_id")
);
--> statement-breakpoint
CREATE TABLE "cheque_duplicatas" (
	"cheque_id" uuid NOT NULL,
	"duplicata_id" uuid NOT NULL,
	CONSTRAINT "cheque_duplicatas_cheque_id_duplicata_id_pk" PRIMARY KEY("cheque_id","duplicata_id")
);
--> statement-breakpoint
CREATE TABLE "cheques" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero" text NOT NULL,
	"banco" text NOT NULL,
	"emitente" text NOT NULL,
	"valor" numeric(14, 2) NOT NULL,
	"data_emissao" date NOT NULL,
	"bom_para" date NOT NULL,
	"status" "cheque_status" DEFAULT 'em_carteira' NOT NULL,
	"cliente_id" uuid,
	"pedido_id" uuid,
	"observacoes" text,
	"status_alterado_em" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" "conta_tipo" NOT NULL,
	"descricao" text NOT NULL,
	"valor" numeric(14, 2) NOT NULL,
	"vencimento" date NOT NULL,
	"forma_pagamento" "forma_pagamento" NOT NULL,
	"categoria" text,
	"parcela_numero" integer,
	"parcela_total" integer,
	"grupo_parcelamento_id" uuid,
	"status" "conta_status" DEFAULT 'em_aberto' NOT NULL,
	"pago_em" date,
	"valor_pago" numeric(14, 2),
	"cliente_id" uuid,
	"pedido_id" uuid,
	"fornecedor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "duplicatas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nota_id" uuid NOT NULL,
	"numero" text NOT NULL,
	"vencimento" date NOT NULL,
	"valor" numeric(14, 2) NOT NULL,
	"status" "duplicata_status" DEFAULT 'em_aberto' NOT NULL,
	"paga_em" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero" text NOT NULL,
	"emitente_destinatario" text NOT NULL,
	"data_emissao" date NOT NULL,
	"valor_total" numeric(14, 2) NOT NULL,
	"observacoes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "materiais" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" text NOT NULL,
	"nome" text NOT NULL,
	"categoria_id" uuid NOT NULL,
	"unidade" "unidade_medida" NOT NULL,
	"chapa_largura" integer,
	"chapa_altura" integer,
	"chapa_espessura" integer,
	"cor_acabamento" text,
	"complemento" text,
	"estoque_minimo" numeric(12, 3) DEFAULT 0 NOT NULL,
	"saldo_atual" numeric(12, 3) DEFAULT 0 NOT NULL,
	"custo_medio" numeric(14, 4) DEFAULT 0 NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "materiais_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "material_categorias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"prefixo" text NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "material_categorias_nome_unique" UNIQUE("nome"),
	CONSTRAINT "material_categorias_prefixo_unique" UNIQUE("prefixo")
);
--> statement-breakpoint
CREATE TABLE "movimentacoes_estoque" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"material_id" uuid NOT NULL,
	"tipo" "movimentacao_tipo" NOT NULL,
	"data" date NOT NULL,
	"quantidade" numeric(12, 3) NOT NULL,
	"custo_unitario" numeric(14, 4) NOT NULL,
	"valor_total" numeric(14, 2) NOT NULL,
	"saldo_apos" numeric(12, 3) NOT NULL,
	"custo_medio_apos" numeric(14, 4) NOT NULL,
	"fornecedor_id" uuid,
	"numero_nota" text,
	"observacao" text,
	"pedido_id" uuid,
	"cliente_id" uuid,
	"user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orcamento_comodos" ADD CONSTRAINT "orcamento_comodos_orcamento_id_orcamentos_id_fk" FOREIGN KEY ("orcamento_id") REFERENCES "public"."orcamentos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orcamento_itens" ADD CONSTRAINT "orcamento_itens_movel_id_orcamento_moveis_id_fk" FOREIGN KEY ("movel_id") REFERENCES "public"."orcamento_moveis"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orcamento_moveis" ADD CONSTRAINT "orcamento_moveis_comodo_id_orcamento_comodos_id_fk" FOREIGN KEY ("comodo_id") REFERENCES "public"."orcamento_comodos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orcamentos" ADD CONSTRAINT "orcamentos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orcamentos" ADD CONSTRAINT "orcamentos_vendedor_id_user_id_fk" FOREIGN KEY ("vendedor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido_comodos" ADD CONSTRAINT "pedido_comodos_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido_itens" ADD CONSTRAINT "pedido_itens_movel_id_pedido_moveis_id_fk" FOREIGN KEY ("movel_id") REFERENCES "public"."pedido_moveis"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido_moveis" ADD CONSTRAINT "pedido_moveis_comodo_id_pedido_comodos_id_fk" FOREIGN KEY ("comodo_id") REFERENCES "public"."pedido_comodos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido_status_historico" ADD CONSTRAINT "pedido_status_historico_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido_status_historico" ADD CONSTRAINT "pedido_status_historico_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_orcamento_id_orcamentos_id_fk" FOREIGN KEY ("orcamento_id") REFERENCES "public"."orcamentos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_vendedor_id_user_id_fk" FOREIGN KEY ("vendedor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cheque_duplicatas" ADD CONSTRAINT "cheque_duplicatas_cheque_id_cheques_id_fk" FOREIGN KEY ("cheque_id") REFERENCES "public"."cheques"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cheque_duplicatas" ADD CONSTRAINT "cheque_duplicatas_duplicata_id_duplicatas_id_fk" FOREIGN KEY ("duplicata_id") REFERENCES "public"."duplicatas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cheques" ADD CONSTRAINT "cheques_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cheques" ADD CONSTRAINT "cheques_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contas" ADD CONSTRAINT "contas_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contas" ADD CONSTRAINT "contas_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contas" ADD CONSTRAINT "contas_fornecedor_id_fornecedores_id_fk" FOREIGN KEY ("fornecedor_id") REFERENCES "public"."fornecedores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duplicatas" ADD CONSTRAINT "duplicatas_nota_id_notas_id_fk" FOREIGN KEY ("nota_id") REFERENCES "public"."notas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materiais" ADD CONSTRAINT "materiais_categoria_id_material_categorias_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."material_categorias"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_material_id_materiais_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materiais"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_fornecedor_id_fornecedores_id_fk" FOREIGN KEY ("fornecedor_id") REFERENCES "public"."fornecedores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_index" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_id_index" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_index" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "clientes_nome_index" ON "clientes" USING btree ("nome");--> statement-breakpoint
CREATE INDEX "clientes_documento_index" ON "clientes" USING btree ("documento");--> statement-breakpoint
CREATE INDEX "fornecedores_nome_index" ON "fornecedores" USING btree ("nome");--> statement-breakpoint
CREATE INDEX "orcamento_comodos_orcamento_id_index" ON "orcamento_comodos" USING btree ("orcamento_id");--> statement-breakpoint
CREATE INDEX "orcamento_itens_movel_id_index" ON "orcamento_itens" USING btree ("movel_id");--> statement-breakpoint
CREATE INDEX "orcamento_moveis_comodo_id_index" ON "orcamento_moveis" USING btree ("comodo_id");--> statement-breakpoint
CREATE INDEX "orcamentos_status_index" ON "orcamentos" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orcamentos_cliente_id_index" ON "orcamentos" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX "pedido_comodos_pedido_id_index" ON "pedido_comodos" USING btree ("pedido_id");--> statement-breakpoint
CREATE INDEX "pedido_itens_movel_id_index" ON "pedido_itens" USING btree ("movel_id");--> statement-breakpoint
CREATE INDEX "pedido_moveis_comodo_id_index" ON "pedido_moveis" USING btree ("comodo_id");--> statement-breakpoint
CREATE INDEX "pedido_status_historico_pedido_id_index" ON "pedido_status_historico" USING btree ("pedido_id");--> statement-breakpoint
CREATE INDEX "pedidos_status_index" ON "pedidos" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pedidos_cliente_id_index" ON "pedidos" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX "cheques_status_index" ON "cheques" USING btree ("status");--> statement-breakpoint
CREATE INDEX "cheques_bom_para_index" ON "cheques" USING btree ("bom_para");--> statement-breakpoint
CREATE INDEX "cheques_cliente_id_index" ON "cheques" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX "cheques_pedido_id_index" ON "cheques" USING btree ("pedido_id");--> statement-breakpoint
CREATE INDEX "contas_tipo_status_index" ON "contas" USING btree ("tipo","status");--> statement-breakpoint
CREATE INDEX "contas_vencimento_index" ON "contas" USING btree ("vencimento");--> statement-breakpoint
CREATE INDEX "contas_pedido_id_index" ON "contas" USING btree ("pedido_id");--> statement-breakpoint
CREATE INDEX "contas_cliente_id_index" ON "contas" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX "duplicatas_nota_id_index" ON "duplicatas" USING btree ("nota_id");--> statement-breakpoint
CREATE INDEX "duplicatas_status_index" ON "duplicatas" USING btree ("status");--> statement-breakpoint
CREATE INDEX "notas_numero_index" ON "notas" USING btree ("numero");--> statement-breakpoint
CREATE INDEX "materiais_categoria_id_index" ON "materiais" USING btree ("categoria_id");--> statement-breakpoint
CREATE INDEX "materiais_nome_index" ON "materiais" USING btree ("nome");--> statement-breakpoint
CREATE INDEX "movimentacoes_estoque_material_id_data_index" ON "movimentacoes_estoque" USING btree ("material_id","data");--> statement-breakpoint
CREATE INDEX "movimentacoes_estoque_pedido_id_index" ON "movimentacoes_estoque" USING btree ("pedido_id");--> statement-breakpoint
CREATE INDEX "movimentacoes_estoque_cliente_id_index" ON "movimentacoes_estoque" USING btree ("cliente_id");