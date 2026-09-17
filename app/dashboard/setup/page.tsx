import type { Metadata } from "next";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { requireOwner } from "@/lib/auth";
import { formatPrice, LABELS, WEEK_DAYS } from "@/lib/business-labels";
import { prisma } from "@/lib/prisma";
import {
  addScheduleAction,
  createResourceAction,
  createServiceAction,
  deleteResourceAction,
  deleteScheduleAction,
  deleteServiceAction,
  toggleResourceAction,
  toggleServiceAction,
  updateBusinessAction,
} from "./actions";

export const metadata: Metadata = { title: "Configuración — Pinta" };

export default async function SetupPage() {
  const { business } = await requireOwner();
  const labels = LABELS[business.type];

  const [resources, services, schedules] = await Promise.all([
    prisma.resource.findMany({ where: { businessId: business.id }, orderBy: { name: "asc" } }),
    prisma.service.findMany({ where: { businessId: business.id }, orderBy: { name: "asc" } }),
    prisma.schedule.findMany({
      where: { businessId: business.id },
      orderBy: [{ startTime: "asc" }],
    }),
  ]);
  const resourceName = new Map(resources.map((r) => [r.id, r.name]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>
        <p className="text-sm text-muted-foreground">
          Lo que cargues acá es lo que tus clientes van a poder reservar.
        </p>
      </div>

      {/* --- Negocio --- */}
      <Card>
        <CardHeader>
          <CardTitle>Datos del negocio</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionForm action={updateBusinessAction}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="business-name">Nombre</Label>
                <Input id="business-name" name="name" defaultValue={business.name} required maxLength={80} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="business-phone">Teléfono</Label>
                <Input
                  id="business-phone"
                  name="phone"
                  type="tel"
                  defaultValue={business.phone ?? ""}
                  maxLength={20}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="business-address">Dirección</Label>
                <Input
                  id="business-address"
                  name="address"
                  defaultValue={business.address ?? ""}
                  maxLength={120}
                />
              </div>
            </div>
            <SubmitButton pendingText="Guardando…" className="self-start">
              Guardar
            </SubmitButton>
          </ActionForm>
        </CardContent>
      </Card>

      {/* --- Recursos --- */}
      <Card>
        <CardHeader>
          <CardTitle>{labels.resources}</CardTitle>
          <CardDescription>{labels.resourceHint}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {resources.length > 0 && (
            <ul className="divide-y rounded-lg border">
              {resources.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                  <span className={r.active ? "font-medium" : "text-muted-foreground line-through"}>
                    {r.name}
                  </span>
                  {!r.active && <Badge variant="secondary">Inactivo</Badge>}
                  <div className="ml-auto flex items-start gap-1">
                    <ActionForm action={toggleResourceAction} className="items-end gap-1">
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="active" value={String(!r.active)} />
                      <SubmitButton variant="ghost" size="sm">
                        {r.active ? "Desactivar" : "Activar"}
                      </SubmitButton>
                    </ActionForm>
                    <ActionForm action={deleteResourceAction} className="items-end gap-1">
                      <input type="hidden" name="id" value={r.id} />
                      <SubmitButton variant="destructive" size="sm">
                        Borrar
                      </SubmitButton>
                    </ActionForm>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <ActionForm action={createResourceAction}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="resource-name">Agregar {labels.resource.toLowerCase()}</Label>
              <div className="flex gap-2">
                <Input
                  id="resource-name"
                  name="name"
                  placeholder={labels.resourcePlaceholder}
                  required
                  maxLength={60}
                />
                <SubmitButton pendingText="Agregando…">Agregar</SubmitButton>
              </div>
            </div>
          </ActionForm>
        </CardContent>
      </Card>

      {/* --- Servicios --- */}
      <Card>
        <CardHeader>
          <CardTitle>{labels.services}</CardTitle>
          <CardDescription>{labels.serviceHint}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {services.length > 0 && (
            <ul className="divide-y rounded-lg border">
              {services.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                  <span className={s.active ? "font-medium" : "text-muted-foreground line-through"}>
                    {s.name}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {s.durationMin} min · {formatPrice(s.price)}
                  </span>
                  {!s.active && <Badge variant="secondary">Inactivo</Badge>}
                  <div className="ml-auto flex items-start gap-1">
                    <ActionForm action={toggleServiceAction} className="items-end gap-1">
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="active" value={String(!s.active)} />
                      <SubmitButton variant="ghost" size="sm">
                        {s.active ? "Desactivar" : "Activar"}
                      </SubmitButton>
                    </ActionForm>
                    <ActionForm action={deleteServiceAction} className="items-end gap-1">
                      <input type="hidden" name="id" value={s.id} />
                      <SubmitButton variant="destructive" size="sm">
                        Borrar
                      </SubmitButton>
                    </ActionForm>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <ActionForm action={createServiceAction}>
            <p className="text-sm font-medium">Agregar {labels.service.toLowerCase()}</p>
            <div className="grid gap-3 sm:grid-cols-[1fr_8rem_8rem_auto] sm:items-end">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="service-name">Nombre</Label>
                <Input
                  id="service-name"
                  name="name"
                  placeholder={labels.servicePlaceholder}
                  required
                  maxLength={60}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="service-duration">Duración (min)</Label>
                <Input
                  id="service-duration"
                  name="durationMin"
                  type="number"
                  inputMode="numeric"
                  min={5}
                  max={600}
                  step={5}
                  defaultValue={business.type === "CANCHA" ? 60 : 30}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="service-price">Precio ($U)</Label>
                <Input id="service-price" name="price" inputMode="decimal" placeholder="450" required />
              </div>
              <SubmitButton pendingText="Agregando…">Agregar</SubmitButton>
            </div>
          </ActionForm>
        </CardContent>
      </Card>

      {/* --- Horarios --- */}
      <Card>
        <CardHeader>
          <CardTitle>Horarios de atención</CardTitle>
          <CardDescription>
            Podés cargar más de una franja por día (por ejemplo 9 a 13 y 15 a 20).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ul className="divide-y rounded-lg border">
            {WEEK_DAYS.map((day) => {
              const ranges = schedules.filter((s) => s.dayOfWeek === day.value);
              return (
                <li key={day.value} className="flex flex-wrap items-center gap-2 px-3 py-2">
                  <span className="w-24 text-sm font-medium">{day.label}</span>
                  {ranges.length === 0 && <span className="text-sm text-muted-foreground">Cerrado</span>}
                  {ranges.map((s) => (
                    <ActionForm key={s.id} action={deleteScheduleAction} className="gap-1">
                      <input type="hidden" name="id" value={s.id} />
                      <span className="inline-flex items-center gap-1 rounded-md bg-muted py-0.5 pr-0.5 pl-2 text-sm">
                        {s.startTime}–{s.endTime}
                        {s.resourceId && (
                          <span className="text-muted-foreground">· {resourceName.get(s.resourceId)}</span>
                        )}
                        <SubmitButton variant="ghost" size="icon-xs" className="text-muted-foreground">
                          <span aria-hidden>×</span>
                          <span className="sr-only">
                            Borrar {day.label} {s.startTime} a {s.endTime}
                          </span>
                        </SubmitButton>
                      </span>
                    </ActionForm>
                  ))}
                </li>
              );
            })}
          </ul>

          <ActionForm action={addScheduleAction}>
            <p className="text-sm font-medium">Agregar horario</p>
            <div className="grid gap-3 sm:grid-cols-[1fr_7rem_7rem_1fr_auto] sm:items-end">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="schedule-day">Día</Label>
                <NativeSelect id="schedule-day" name="dayOfWeek" defaultValue="1">
                  {WEEK_DAYS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="schedule-start">Desde</Label>
                <Input id="schedule-start" name="startTime" type="time" defaultValue="09:00" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="schedule-end">Hasta</Label>
                <Input id="schedule-end" name="endTime" type="time" defaultValue="18:00" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="schedule-resource">Aplica a</Label>
                <NativeSelect id="schedule-resource" name="resourceId" defaultValue="">
                  <option value="">Todos</option>
                  {resources
                    .filter((r) => r.active)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                </NativeSelect>
              </div>
              <SubmitButton pendingText="Agregando…">Agregar</SubmitButton>
            </div>
          </ActionForm>
        </CardContent>
      </Card>
    </div>
  );
}
