"use server";

import { revalidatePath } from "next/cache";
import type * as z from "zod";
import { toActionError, type ActionState } from "@/lib/action-state";
import { requireOwner } from "@/lib/auth";
import * as setup from "@/lib/setup";
import {
  BusinessUpdateSchema,
  firstError,
  ResourceSchema,
  ScheduleSchema,
  ServiceSchema,
} from "@/lib/validation";

// Cada acción verifica al dueño y opera solo sobre SU negocio.
async function run(fn: (businessId: string) => Promise<void>): Promise<ActionState> {
  const owner = await requireOwner();
  try {
    await fn(owner.businessId);
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

function parse<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (!result.success) throw new setup.SetupError(firstError(result.error));
  return result.data;
}

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "");

export async function updateBusinessAction(_s: ActionState, formData: FormData) {
  return run(async (businessId) => {
    const data = parse(BusinessUpdateSchema, {
      name: text(formData, "name"),
      phone: text(formData, "phone"),
      address: text(formData, "address"),
    });
    await setup.updateBusiness(businessId, data);
  });
}

export async function createResourceAction(_s: ActionState, formData: FormData) {
  return run(async (businessId) => {
    const { name } = parse(ResourceSchema, { name: text(formData, "name") });
    await setup.createResource(businessId, name);
  });
}

export async function toggleResourceAction(_s: ActionState, formData: FormData) {
  return run((businessId) =>
    setup.setResourceActive(businessId, text(formData, "id"), text(formData, "active") === "true"),
  );
}

export async function deleteResourceAction(_s: ActionState, formData: FormData) {
  return run((businessId) => setup.deleteResource(businessId, text(formData, "id")));
}

export async function createServiceAction(_s: ActionState, formData: FormData) {
  return run(async (businessId) => {
    const data = parse(ServiceSchema, {
      name: text(formData, "name"),
      durationMin: text(formData, "durationMin"),
      price: text(formData, "price"),
    });
    await setup.createService(businessId, data);
  });
}

export async function toggleServiceAction(_s: ActionState, formData: FormData) {
  return run((businessId) =>
    setup.setServiceActive(businessId, text(formData, "id"), text(formData, "active") === "true"),
  );
}

export async function deleteServiceAction(_s: ActionState, formData: FormData) {
  return run((businessId) => setup.deleteService(businessId, text(formData, "id")));
}

export async function addScheduleAction(_s: ActionState, formData: FormData) {
  return run(async (businessId) => {
    const data = parse(ScheduleSchema, {
      dayOfWeek: text(formData, "dayOfWeek"),
      startTime: text(formData, "startTime"),
      endTime: text(formData, "endTime"),
      resourceId: text(formData, "resourceId"),
    });
    await setup.addSchedule(businessId, data);
  });
}

export async function deleteScheduleAction(_s: ActionState, formData: FormData) {
  return run((businessId) => setup.deleteSchedule(businessId, text(formData, "id")));
}
