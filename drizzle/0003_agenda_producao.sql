ALTER TABLE "pedidos" ADD COLUMN "producao_inicio" date;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "producao_fim" date;--> statement-breakpoint
CREATE INDEX "pedidos_producao_inicio_index" ON "pedidos" USING btree ("producao_inicio");