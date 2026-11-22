-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "documents_owner_id_deleted_at_idx" ON "documents"("owner_id", "deleted_at");
