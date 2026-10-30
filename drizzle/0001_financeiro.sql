CREATE TYPE "public"."cheque_tipo" AS ENUM('recebido', 'emitido');--> statement-breakpoint
ALTER TYPE "public"."cheque_status" ADD VALUE 'emitido';--> statement-breakpoint
ALTER TABLE "cheques" ADD COLUMN "tipo" "cheque_tipo" DEFAULT 'recebido' NOT NULL;--> statement-breakpoint
ALTER TABLE "cheques" ADD COLUMN "favorecido" text;--> statement-breakpoint
CREATE UNIQUE INDEX "cheques_tipo_banco_numero_emitente_index" ON "cheques" USING btree ("tipo","banco","numero","emitente");--> statement-breakpoint
CREATE UNIQUE INDEX "duplicatas_nota_id_numero_index" ON "duplicatas" USING btree ("nota_id","numero");