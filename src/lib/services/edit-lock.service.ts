import { edit_lock_object_type } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/utils/errors";

const OBJECT_TYPE: edit_lock_object_type = "boq_version";

export type EditLockInfo = {
  edit_lock_id: string;
  locked_by: string;
  locked_at: string;
  expires_at: string | null;
  is_active: boolean;
};

export const editLockService = {
  async getLock(boqVersionId: string): Promise<EditLockInfo | null> {
    const row = await prisma.edit_locks.findUnique({
      where: {
        object_type_object_id: {
          object_type: OBJECT_TYPE,
          object_id: boqVersionId,
        },
      },
    });
    if (!row) return null;

    const expired = row.expires_at != null && row.expires_at < new Date();
    return {
      edit_lock_id: row.edit_lock_id,
      locked_by: row.locked_by,
      locked_at: row.locked_at.toISOString(),
      expires_at: row.expires_at?.toISOString() ?? null,
      is_active: !expired,
    };
  },

  async acquireForEdit(boqVersionId: string, actor: string): Promise<EditLockInfo> {
    const existing = await prisma.edit_locks.findUnique({
      where: {
        object_type_object_id: {
          object_type: OBJECT_TYPE,
          object_id: boqVersionId,
        },
      },
    });

    const now = new Date();

    if (existing) {
      const expired = existing.expires_at != null && existing.expires_at < now;
      if (!expired && existing.locked_by !== actor) {
        throw new AppError(
          `BOQ กำลังถูกแก้ไขโดย ${existing.locked_by} — รอให้ปล่อย lock หรือลองใหม่ภายหลัง`,
          "EDIT_LOCK_HELD",
          409,
        );
      }
      const row = await prisma.edit_locks.update({
        where: { edit_lock_id: existing.edit_lock_id },
        data: { locked_by: actor, locked_at: now, expires_at: null },
      });
      return {
        edit_lock_id: row.edit_lock_id,
        locked_by: row.locked_by,
        locked_at: row.locked_at.toISOString(),
        expires_at: row.expires_at?.toISOString() ?? null,
        is_active: true,
      };
    }

    const row = await prisma.edit_locks.create({
      data: {
        object_type: OBJECT_TYPE,
        object_id: boqVersionId,
        locked_by: actor,
        locked_at: now,
      },
    });
    return {
      edit_lock_id: row.edit_lock_id,
      locked_by: row.locked_by,
      locked_at: row.locked_at.toISOString(),
      expires_at: row.expires_at?.toISOString() ?? null,
      is_active: true,
    };
  },

  async release(boqVersionId: string, actor: string): Promise<void> {
    const existing = await prisma.edit_locks.findUnique({
      where: {
        object_type_object_id: {
          object_type: OBJECT_TYPE,
          object_id: boqVersionId,
        },
      },
    });
    if (!existing || existing.locked_by !== actor) return;

    await prisma.edit_locks.delete({
      where: { edit_lock_id: existing.edit_lock_id },
    });
  },
};
