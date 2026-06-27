"use client";

import { useRef } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ClipboardList,
  Lightbulb,
  MapPin,
  Send,
  Tags,
  type LucideIcon,
} from "lucide-react";

const STEPS: {
  Icon: LucideIcon;
  iconClassName: string;
  iconWrapClassName: string;
  title: string;
  text: string;
  tip?: string;
}[] = [
  {
    Icon: MapPin,
    iconClassName: "text-red-700",
    iconWrapClassName: "bg-red-50 ring-red-100",
    title: "Ubica el lugar",
    text: "Toca un punto del mapa o escribe la dirección en el buscador (ej.: Av. Francisco de Miranda, Chacao).",
    tip: "Acércate con el zoom para mayor precisión.",
  },
  {
    Icon: Tags,
    iconClassName: "text-amber-700",
    iconWrapClassName: "bg-amber-50 ring-amber-100",
    title: "Elige el tipo de marcador",
    text: "Selecciona uno de los 6 tipos según la situación: emergencia crítica, suministros, centro de acopio, zona sin luz, persona buscada o edificación.",
    tip: "Cada color e icono ayuda a priorizar el rescate.",
  },
  {
    Icon: ClipboardList,
    iconClassName: "text-sky-700",
    iconWrapClassName: "bg-sky-50 ring-sky-100",
    title: "Describe y agrega foto",
    text: "Llena los datos del lugar, personas afectadas y qué se necesita. Si puedes, sube una foto: ayuda a verificar la situación.",
    tip: "Sé específico: paramédicos, agua, maquinaria, medicinas...",
  },
  {
    Icon: Send,
    iconClassName: "text-emerald-700",
    iconWrapClassName: "bg-emerald-50 ring-emerald-100",
    title: "Publica y comparte",
    text: "Tu alerta aparece de inmediato en el mapa de toda la comunidad. Comparte el enlace para que más gente pueda ayudar.",
    tip: "Si la emergencia ya fue atendida, avisa para limpiar el mapa.",
  },
];

export default function ReportStepsCarousel() {
  const scrollerRef = useRef<HTMLOListElement>(null);

  const scrollStep = (direction: -1 | 1) => {
    const node = scrollerRef.current;
    if (!node) return;

    const card = node.querySelector<HTMLElement>("[data-step-card]");
    const cardWidth = card?.getBoundingClientRect().width ?? node.clientWidth * 0.82;
    node.scrollBy({ left: direction * (cardWidth + 16), behavior: "smooth" });
  };

  return (
    <div className="relative">
      <ol
        ref={scrollerRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden"
      >
        {STEPS.map((step, index) => (
          <li
            key={step.title}
            data-step-card
            className="relative w-[82vw] max-w-[23rem] shrink-0 snap-start overflow-hidden rounded-2xl bg-white p-5 shadow-md shadow-slate-200/80 transition hover:-translate-y-0.5 hover:shadow-lg sm:w-auto sm:max-w-none"
          >
            <span
              className="absolute right-4 top-4 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-500"
              aria-hidden
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <span
              className={`grid h-11 w-11 place-items-center rounded-xl ring-1 ${step.iconWrapClassName}`}
              aria-hidden
            >
              <step.Icon className={`h-5 w-5 ${step.iconClassName}`} strokeWidth={2.4} />
            </span>
            <h3 className="mt-4 text-base font-bold text-slate-950">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.text}</p>
            {step.tip && (
              <p className="mt-4 flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
                <Lightbulb
                  aria-hidden
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500"
                  strokeWidth={2.4}
                />
                <span>{step.tip}</span>
              </p>
            )}
          </li>
        ))}
      </ol>

      <div className="mt-4 flex justify-center gap-3 sm:hidden">
        <button
          type="button"
          onClick={() => scrollStep(-1)}
          aria-label="Ver paso anterior"
          className="grid h-11 w-11 place-items-center rounded-full bg-white text-slate-700 shadow-md shadow-slate-200/80 transition active:scale-95"
        >
          <ArrowLeft aria-hidden className="h-5 w-5" strokeWidth={2.5} />
        </button>
        <button
          type="button"
          onClick={() => scrollStep(1)}
          aria-label="Ver siguiente paso"
          className="grid h-11 w-11 place-items-center rounded-full bg-slate-950 text-white shadow-md shadow-slate-300/80 transition active:scale-95"
        >
          <ArrowRight aria-hidden className="h-5 w-5" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
