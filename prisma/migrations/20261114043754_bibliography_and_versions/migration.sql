-- CreateEnum
CREATE TYPE "VersionKind" AS ENUM ('AUTO', 'NAMED', 'BEFORE_RESTORE');

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "bibliography" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "document_versions" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "kind" "VersionKind" NOT NULL DEFAULT 'AUTO',
    "label" TEXT,
    "title" TEXT NOT NULL,
    "markdown" TEXT NOT NULL,
    "settings" JSONB NOT NULL,
    "bibliography" TEXT NOT NULL DEFAULT '',
    "revision" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_versions_document_id_created_at_idx" ON "document_versions"("document_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
