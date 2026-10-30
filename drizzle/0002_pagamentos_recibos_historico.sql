CREATE TYPE "public"."material_alteracao_tipo" AS ENUM('cadastro', 'edicao');--> statement-breakpoint
CREATE TYPE "public"."recibo_tipo" AS ENUM('pedido', 'corte', 'montagem', 'outro');--> statement-breakpoint
ALTER TYPE "public"."forma_pagamento" ADD VALUE 'cartao_debito';--> statement-breakpoint
CREATE SEQUENCE "public"."recibo_numero_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "pagamentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"duplicata_id" uuid NOT NULL,
	"lote_id" uuid NOT NULL,
	"forma" "forma_pagamento" NOT NULL,
	"valor" numeric(14, 2) NOT NULL,
	"data" date NOT NULL,
	"observacao" text,
	"user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recibos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero" integer DEFAULT nextval('recibo_numero_seq') NOT NULL,
	"tipo" "recibo_tipo" NOT NULL,
	"data" date NOT NULL,
	"cliente_id" uuid,
	"pagador_nome" text NOT NULL,
	"pagador_documento" text,
	"valor" numeric(14, 2) NOT NULL,
	"forma" "forma_pagamento" NOT NULL,
	"descricao" text NOT NULL,
	"pedido_id" uuid,
	"observacoes" text,
	"cancelado_em" timestamp with time zone,
	"cancelado_motivo" text,
	"user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recibos_numero_unique" UNIQUE("numero")
);
--> statement-breakpoint
CREATE TABLE "material_alteracoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"material_id" uuid NOT NULL,
	"tipo" "material_alteracao_tipo" NOT NULL,
	"campos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "duplicatas" ADD COLUMN "valor_original" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "duplicatas" ADD COLUMN "origem_id" uuid;--> statement-breakpoint
ALTER TABLE "notas" ADD COLUMN "cliente_id" uuid;--> statement-breakpoint
ALTER TABLE "notas" ADD COLUMN "pedido_id" uuid;--> statement-breakpoint
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_duplicata_id_duplicatas_id_fk" FOREIGN KEY ("duplicata_id") REFERENCES "public"."duplicatas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recibos" ADD CONSTRAINT "recibos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recibos" ADD CONSTRAINT "recibos_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recibos" ADD CONSTRAINT "recibos_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_alteracoes" ADD CONSTRAINT "material_alteracoes_material_id_materiais_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materiais"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_alteracoes" ADD CONSTRAINT "material_alteracoes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pagamentos_duplicata_id_index" ON "pagamentos" USING btree ("duplicata_id");--> statement-breakpoint
CREATE INDEX "pagamentos_lote_id_index" ON "pagamentos" USING btree ("lote_id");--> statement-breakpoint
CREATE INDEX "recibos_data_index" ON "recibos" USING btree ("data");--> statement-breakpoint
CREATE INDEX "recibos_pedido_id_index" ON "recibos" USING btree ("pedido_id");--> statement-breakpoint
CREATE INDEX "recibos_cliente_id_index" ON "recibos" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX "material_alteracoes_material_id_created_at_index" ON "material_alteracoes" USING btree ("material_id","created_at");--> statement-breakpoint
ALTER TABLE "duplicatas" ADD CONSTRAINT "duplicatas_origem_id_duplicatas_id_fk" FOREIGN KEY ("origem_id") REFERENCES "public"."duplicatas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notas" ADD CONSTRAINT "notas_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notas" ADD CONSTRAINT "notas_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notas_cliente_id_index" ON "notas" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX "notas_pedido_id_index" ON "notas" USING btree ("pedido_id");