-- AlterTable
ALTER TABLE "Subject" ADD COLUMN     "expanded" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "pinned" BOOLEAN NOT NULL DEFAULT false;
