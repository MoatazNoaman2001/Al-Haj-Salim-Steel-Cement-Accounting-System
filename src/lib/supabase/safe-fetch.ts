"use client";

import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { queueMutation } from "@/lib/offline-queue";

function rejectOfflineUserId(data: Record<string, unknown>): boolean {
  const uuidFields = ["created_by", "requested_by", "reviewed_by"];
  for (const f of uuidFields) {
    if (data[f] === "offline") {
      toast.error("خطأ: لم يتم تحميل بيانات المستخدم بعد — أعد المحاولة");
      return true;
    }
  }
  return false;
}

export async function safeInsert(table: string, data: Record<string, unknown>): Promise<{ error: unknown }> {
  if (rejectOfflineUserId(data)) return { error: "offline-user-id" };
  if (!navigator.onLine) {
    await queueMutation({ table, type: "insert", data });
    toast.info("تم حفظ العملية محلياً — ستتم المزامنة عند الاتصال");
    return { error: null };
  }

  const supabase = createClient();
  const { error } = await supabase.from(table).insert(data);
  if (error) return { error };
  return { error: null };
}

export async function safeUpdate(table: string, data: Record<string, unknown>, match: Record<string, unknown>): Promise<{ error: unknown }> {
  if (rejectOfflineUserId(data)) return { error: "offline-user-id" };
  if (!navigator.onLine) {
    await queueMutation({ table, type: "update", data, match });
    toast.info("تم حفظ التعديل محلياً — ستتم المزامنة عند الاتصال");
    return { error: null };
  }

  const supabase = createClient();
  let query = supabase.from(table).update(data) as any;
  for (const [k, v] of Object.entries(match)) query = query.eq(k, v);
  const { error } = await query;
  if (error) return { error };
  return { error: null };
}

export async function safeDelete(table: string, match: Record<string, unknown>): Promise<{ error: unknown }> {
  if (!navigator.onLine) {
    await queueMutation({ table, type: "delete", data: {}, match });
    toast.info("تم حفظ الحذف محلياً — ستتم المزامنة عند الاتصال");
    return { error: null };
  }

  const supabase = createClient();
  let query = supabase.from(table).delete() as any;
  for (const [k, v] of Object.entries(match)) query = query.eq(k, v);
  const { error } = await query;
  if (error) return { error };
  return { error: null };
}
