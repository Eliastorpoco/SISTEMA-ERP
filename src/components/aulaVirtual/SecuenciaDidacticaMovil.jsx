import { useMemo } from "react";
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Layers3,
  Menu,
  MessageCircle,
  MonitorPlay,
  Settings2,
  Upload,
} from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Separator } from "@/components/ui/separator";

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const TIPOS_RECURSO = new Set([
  "pdf",
  "video",
  "enlace",
  "recurso externo",
  "lectura",
  "guia",
  "guía",
  "separata",
  "presentacion",
  "presentación",
  "imagen",
  "infografia",
  "infografía",
  "documento",
  "material",
  "ficha",
]);

function normalizarTipo(tipo = "") {
  return String(tipo || "").trim().toLowerCase();
}

function esRecurso(block = {}) {
  return (
    block?.esRecursoAprendizaje === true ||
    block?.categoriaDidactica === "recurso" ||
    TIPOS_RECURSO.has(normalizarTipo(block?.tipo))
  );
}

function tieneMaterial(block = {}) {
  return Boolean(
    block?.resourceUrl ||
      block?.url ||
      block?.activityPdfUrl ||
      block?.activityFileUrl ||
      block?.activityFileName
  );
}

function obtenerVisual(block = {}) {
  const tipo = normalizarTipo(block?.tipo);

  const mapa = {
    h5p: {
      icono: Layers3,
      nombre: "H5P",
      fondo: "bg-blue-50",
      iconoFondo: "bg-blue-100",
      iconoTexto: "text-blue-700",
      borde: "border-blue-200",
    },

    cuestionario: {
      icono: ClipboardCheck,
      nombre: "Cuestionario",
      fondo: "bg-violet-50",
      iconoFondo: "bg-violet-100",
      iconoTexto: "text-violet-700",
      borde: "border-violet-200",
    },

    foro: {
      icono: MessageCircle,
      nombre: "Foro",
      fondo: "bg-cyan-50",
      iconoFondo: "bg-cyan-100",
      iconoTexto: "text-cyan-700",
      borde: "border-cyan-200",
    },

    evidencia: {
      icono: Upload,
      nombre: "Evidencia",
      fondo: "bg-emerald-50",
      iconoFondo: "bg-emerald-100",
      iconoTexto: "text-emerald-700",
      borde: "border-emerald-200",
    },

    pdf: {
      icono: FileText,
      nombre: "PDF",
      fondo: "bg-red-50",
      iconoFondo: "bg-red-100",
      iconoTexto: "text-red-700",
      borde: "border-red-200",
    },

    video: {
      icono: MonitorPlay,
      nombre: "Video",
      fondo: "bg-rose-50",
      iconoFondo: "bg-rose-100",
      iconoTexto: "text-rose-700",
      borde: "border-rose-200",
    },
  };

  return (
    mapa[tipo] || {
      icono: BookOpen,
      nombre: block?.tipo || "Elemento",
      fondo: "bg-slate-50",
      iconoFondo: "bg-slate-100",
      iconoTexto: "text-slate-700",
      borde: "border-slate-200",
    }
  );
}

function obtenerEstado(block = {}) {
  if (esRecurso(block)) {
    return tieneMaterial(block)
      ? {
          texto: "Disponible",
          clase:
            "border-emerald-200 bg-emerald-50 text-emerald-700",
        }
      : {
          texto: "Pendiente de material",
          clase: "border-amber-200 bg-amber-50 text-amber-700",
        };
  }

  const estado =
    block?.activityStatus ||
    block?.estado ||
    "Pendiente";

  return {
    texto: estado,
    clase:
      estado === "Completado"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-blue-200 bg-blue-50 text-blue-700",
  };
}

function TarjetaSecundaria({
  block,
  activo,
  onSeleccionar,
}) {
  const visual = obtenerVisual(block);
  const estado = obtenerEstado(block);
  const Icono = visual.icono;
  const recurso = esRecurso(block);

  return (
    <Card
      className={[
        "w-full min-w-0 overflow-hidden rounded-3xl border shadow-sm transition",
        visual.borde,
        activo
          ? "ring-2 ring-blue-500 ring-offset-2"
          : "hover:shadow-md",
      ].join(" ")}
    >
      <CardHeader className={`gap-4 p-4 ${visual.fondo}`}>
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div
            className={[
              "flex size-11 shrink-0 items-center justify-center rounded-2xl",
              visual.iconoFondo,
              visual.iconoTexto,
            ].join(" ")}
          >
            <Icono className="size-5" />
          </div>

          <div className="flex min-w-0 flex-wrap justify-end gap-2">
            <Badge
              variant="secondary"
              className="max-w-full whitespace-normal rounded-xl"
            >
              {visual.nombre}
            </Badge>

            <Badge
              variant="outline"
              className={[
                "max-w-full whitespace-normal rounded-xl text-center",
                recurso
                  ? "border-emerald-200 text-emerald-700"
                  : "border-violet-200 text-violet-700",
              ].join(" ")}
            >
              {recurso ? "Recurso" : "Evaluable"}
            </Badge>
          </div>
        </div>

        <div className="min-w-0">
          <CardTitle className="break-words text-base leading-snug">
            {block?.titulo || "Sin título"}
          </CardTitle>

          <CardDescription className="mt-2 break-words leading-5">
            {block?.descripcion ||
              "Elemento de la secuencia didáctica."}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3 p-4">
        <Badge
          variant="outline"
          className={[
            "w-fit max-w-full whitespace-normal rounded-xl",
            estado.clase,
          ].join(" ")}
        >
          {estado.texto}
        </Badge>

        <p className="break-words text-xs leading-5 text-muted-foreground">
          {recurso
            ? "Recurso de aprendizaje no evaluable."
            : `Puntaje registrado: ${
                block?.activityScore ??
                block?.formativeScore ??
                0
              }%`}
        </p>
      </CardContent>

      <CardFooter className="border-t bg-muted/30 p-4">
        <Button
          type="button"
          variant="outline"
          className="w-full rounded-2xl"
          onClick={() => onSeleccionar?.(block.id)}
        >
          Ver detalle
          <ChevronRight className="ml-2 size-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function SecuenciaDidacticaMovil({
  bloques = [],
  bloqueActivo = null,
  onSeleccionarBloque,
}) {
  const bloquesOrdenados = useMemo(
    () =>
      [...bloques].sort(
        (a, b) =>
          Number(a?.orden || 0) -
          Number(b?.orden || 0)
      ),
    [bloques]
  );

  const activo =
    bloqueActivo ||
    bloquesOrdenados[0] ||
    null;

  const bloquesSecundarios = bloquesOrdenados.filter(
    (block) =>
      String(block?.id) !== String(activo?.id)
  );

  const visualActivo = activo
    ? obtenerVisual(activo)
    : null;

  const estadoActivo = activo
    ? obtenerEstado(activo)
    : null;

  const IconoActivo =
    visualActivo?.icono || Layers3;

  const seleccionar = (id) => {
    if (typeof onSeleccionarBloque === "function") {
      onSeleccionarBloque(id);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 overflow-x-hidden pb-6 lg:hidden">
      {/* HEADER MÓVIL */}
      <header className="sticky top-0 z-40 flex w-full items-center justify-between border-b bg-background/95 px-4 py-3 shadow-sm backdrop-blur">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-sm">
            <Layers3 className="size-5" />
          </div>

          <div className="min-w-0">
            <div className="truncate text-base font-black">
              EduERP
            </div>

            <div className="truncate text-xs text-muted-foreground">
              Aula Virtual
            </div>
          </div>
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 rounded-2xl"
              aria-label="Abrir menú"
            >
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>

          <SheetContent
            side="right"
            className="w-[85vw] max-w-sm overflow-y-auto"
          >
            <SheetHeader className="text-left">
              <SheetTitle>
                Navegación del aula
              </SheetTitle>

              <SheetDescription>
                Selecciona un recurso o actividad.
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 flex flex-col gap-2">
              {bloquesOrdenados.map((block) => {
                const visual =
                  obtenerVisual(block);

                const Icono = visual.icono;

                return (
                  <SheetClose asChild key={block.id}>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-auto w-full justify-start gap-3 rounded-2xl px-3 py-3 text-left"
                      onClick={() =>
                        seleccionar(block.id)
                      }
                    >
                      <div
                        className={[
                          "flex size-9 shrink-0 items-center justify-center rounded-xl",
                          visual.iconoFondo,
                          visual.iconoTexto,
                        ].join(" ")}
                      >
                        <Icono className="size-4" />
                      </div>

                      <span className="min-w-0 flex-1 whitespace-normal break-words">
                        {block?.titulo ||
                          block?.tipo ||
                          "Sin título"}
                      </span>
                    </Button>
                  </SheetClose>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </header>

      <main className="flex w-full flex-col gap-4 px-3">
        {/* TARJETA PRINCIPAL */}
        {activo ? (
          <Card className="w-full min-w-0 overflow-hidden rounded-3xl border-blue-200 shadow-sm">
            <CardHeader className="gap-4 bg-gradient-to-br from-blue-50 via-white to-violet-50 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
                  <IconoActivo className="size-6" />
                </div>

                <Badge
                  variant="outline"
                  className={[
                    "max-w-full whitespace-normal rounded-xl",
                    estadoActivo.clase,
                  ].join(" ")}
                >
                  {estadoActivo.texto}
                </Badge>
              </div>

              <div className="min-w-0">
                <p className="mb-2 text-xs font-black uppercase tracking-wide text-blue-700">
                  {esRecurso(activo)
                    ? "Recurso de aprendizaje abierto"
                    : "Actividad evaluable abierta"}
                </p>

                <CardTitle className="break-words text-xl leading-tight">
                  {activo?.titulo ||
                    "Actividad H5P de prueba"}
                </CardTitle>

                <CardDescription className="mt-2 break-words text-sm leading-6">
                  {activo?.descripcion ||
                    "Actividad interactiva para desarrollar y comprobar los aprendizajes."}
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="flex flex-col gap-4 p-5">
              <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
                <div className="min-w-0 rounded-2xl border bg-muted/30 p-3">
                  <div className="text-xs text-muted-foreground">
                    Tipo
                  </div>

                  <div className="mt-1 break-words text-sm font-bold">
                    {visualActivo.nombre}
                  </div>
                </div>

                <div className="min-w-0 rounded-2xl border bg-muted/30 p-3">
                  <div className="text-xs text-muted-foreground">
                    Evaluación
                  </div>

                  <div className="mt-1 break-words text-sm font-bold">
                    {esRecurso(activo)
                      ? "No evaluable"
                      : "Con seguimiento"}
                  </div>
                </div>
              </div>

              <Button
                type="button"
                size="lg"
                className="w-full rounded-2xl font-black shadow-sm"
                onClick={() =>
                  seleccionar(activo.id)
                }
              >
                {esRecurso(activo)
                  ? "Abrir recurso"
                  : "Abrir actividad"}

                <ChevronRight className="ml-2 size-5" />
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-3xl shadow-sm">
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              No existen elementos en esta unidad.
            </CardContent>
          </Card>
        )}

        {/* CONFIGURACIÓN PEDAGÓGICA */}
        {activo && (
          <Card className="w-full min-w-0 overflow-hidden rounded-3xl shadow-sm">
            <Accordion
              type="single"
              collapsible
              className="w-full"
            >
              <AccordionItem
                value="configuracion"
                className="border-0"
              >
                <AccordionTrigger className="gap-3 px-5 py-4 text-left hover:no-underline">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                      <Settings2 className="size-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="break-words font-black">
                        Configuración pedagógica
                      </div>

                      <div className="mt-1 break-words text-xs font-normal text-muted-foreground">
                        Propósito, criterio, producto e intentos
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="px-5 pb-5">
                  <Separator className="mb-4" />

                  <div className="flex flex-col gap-4">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        Competencia
                      </div>

                      <p className="mt-1 break-words text-sm font-semibold leading-6">
                        {activo?.competencia ||
                          "Resuelve problemas de cantidad"}
                      </p>
                    </div>

                    <div>
                      <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        Propósito
                      </div>

                      <p className="mt-1 break-words text-sm leading-6">
                        {activo?.proposito ||
                          "Desarrollar el aprendizaje previsto en la unidad."}
                      </p>
                    </div>

                    <div>
                      <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        Criterio de evaluación
                      </div>

                      <p className="mt-1 break-words text-sm leading-6">
                        {activo?.criterioEvaluacion ||
                          "Aplica correctamente el procedimiento y explica su respuesta."}
                      </p>
                    </div>

                    <div>
                      <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        Producto esperado
                      </div>

                      <p className="mt-1 break-words text-sm leading-6">
                        {activo?.productoEsperado ||
                          "Actividad desarrollada y enviada por el estudiante."}
                      </p>
                    </div>

                    {!esRecurso(activo) && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border bg-muted/30 p-3">
                          <div className="text-xs text-muted-foreground">
                            Intentos
                          </div>

                          <div className="mt-1 text-base font-black">
                            {activo?.intentosPermitidos ??
                              1}
                          </div>
                        </div>

                        <div className="rounded-2xl border bg-muted/30 p-3">
                          <div className="text-xs text-muted-foreground">
                            Puntaje mínimo
                          </div>

                          <div className="mt-1 text-base font-black">
                            {activo?.puntajeMinimo ??
                              60}
                            %
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        )}

        {/* TARJETAS SECUNDARIAS */}
        <section className="flex w-full flex-col gap-3">
          <div className="flex items-center justify-between gap-3 px-1">
            <div className="min-w-0">
              <h2 className="break-words text-base font-black">
                Secuencia didáctica
              </h2>

              <p className="break-words text-xs text-muted-foreground">
                Recursos y actividades
              </p>
            </div>

            <Badge
              variant="secondary"
              className="shrink-0 rounded-xl"
            >
              {bloquesOrdenados.length} elementos
            </Badge>
          </div>

          <div className="flex w-full flex-col gap-4">
            {bloquesSecundarios.map((block) => (
              <TarjetaSecundaria
                key={block.id}
                block={block}
                activo={
                  String(block?.id) ===
                  String(bloqueActivo?.id || "")
                }
                onSeleccionar={seleccionar}
              />
            ))}
          </div>
        </section>

        <Card className="overflow-hidden rounded-3xl border-emerald-200 bg-emerald-50 shadow-sm">
          <CardContent className="flex items-start gap-3 p-4">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-700" />

            <div className="min-w-0">
              <p className="font-bold text-emerald-900">
                Vista optimizada para celulares
              </p>

              <p className="mt-1 break-words text-xs leading-5 text-emerald-700">
                Tarjetas y configuraciones adaptadas al ancho disponible.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
