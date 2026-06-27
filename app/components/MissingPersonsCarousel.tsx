"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ImageOff,
  ListChecks,
  MapPin,
  Plus,
  SearchX,
  UserRoundSearch,
  UsersRound,
} from "lucide-react";
import MissingPersonForm, {
  type MissingPersonPayload,
} from "./MissingPersonForm";
import MissingPersonDetail from "./MissingPersonDetail";
import { useLowBandwidthMode } from "./useLowBandwidthMode";

interface MissingPerson {
  id: string;
  name: string;
  age: number | null;
  description: string;
  lastSeen: string;
  contact: string;
  photoUrl: string | null;
  status?: "active" | "found";
  resolutionNote?: string | null;
  resolutionPhotoUrl?: string | null;
  resolvedAt?: number | null;
  createdAt: number;
}

const POLL_INTERVAL_MS = 8000;
const LOW_BANDWIDTH_POLL_INTERVAL_MS = 45_000;
const MAX_PREVIEW = 24;

export default function MissingPersonsCarousel() {
  const [people, setPeople] = useState<MissingPerson[]>([]);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<MissingPerson | null>(null);
  const network = useLowBandwidthMode(
    POLL_INTERVAL_MS,
    LOW_BANDWIDTH_POLL_INTERVAL_MS,
  );
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const fetchPeople = useCallback(async () => {
    try {
      // Solo necesitamos la primera página para la vista previa; el total
      // viene del servidor para el contador y el enlace "ver N más".
      const res = await fetch(
        `/api/missing?status=active&page=1&pageSize=${MAX_PREVIEW}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const data = await res.json();
      setPeople(data.people ?? []);
      setTotal(data.total ?? (data.people?.length ?? 0));
    } catch {
      // se reintentará en el próximo ciclo
    }
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (interval) return;
      fetchPeople();
      interval = setInterval(fetchPeople, network.pollIntervalMs);
    };
    const stop = () => {
      if (interval) clearInterval(interval);
      interval = null;
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchPeople, network.pollIntervalMs]);

  const updateArrows = useCallback(() => {
    const node = scrollerRef.current;
    if (!node) return;
    const { scrollLeft, scrollWidth, clientWidth } = node;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useLayoutEffect(() => {
    updateArrows();
    const node = scrollerRef.current;
    if (!node) return;
    const onScroll = () => updateArrows();
    node.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => {
      node.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", updateArrows);
    };
  }, [updateArrows, people.length]);

  const scrollBy = useCallback((direction: 1 | -1) => {
    const node = scrollerRef.current;
    if (!node) return;
    const amount = Math.round(node.clientWidth * 0.85) * direction;
    node.scrollBy({ left: amount, behavior: "smooth" });
  }, []);

  const handleSubmit = useCallback(async (payload: MissingPersonPayload) => {
    const res = await fetch("/api/missing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        data?.error ?? "No se pudo guardar el reporte. Intenta de nuevo.",
      );
    }
    setShowForm(false);
    if (data.person) {
      setPeople((prev) =>
        prev.some((p) => p.id === data.person.id)
          ? prev
          : [data.person, ...prev].slice(0, MAX_PREVIEW),
      );
      setTotal((t) => t + 1);
    } else {
      fetchPeople();
    }
  }, [fetchPeople]);

  const preview = people.slice(0, MAX_PREVIEW);
  const hiddenCount = Math.max(0, total - preview.length);
  const formattedTotal = total.toLocaleString("es-VE");

  return (
    <section
      id="desaparecidas-preview"
      className="border-b border-slate-200 bg-white"
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:py-9">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-purple-50 text-purple-700">
                <UserRoundSearch aria-hidden className="h-4 w-4" strokeWidth={2.4} />
              </span>
              <h2 className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                Personas desaparecidas
              </h2>
              <span
                className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-800"
                aria-label={`${total} personas reportadas`}
              >
                <UsersRound aria-hidden className="h-3.5 w-3.5" strokeWidth={2.4} />
                {formattedTotal} reportada{total === 1 ? "" : "s"}
              </span>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Si reconoces a alguien o tienes información, abre su tarjeta y
              contacta a la persona indicada.
            </p>
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-600">
              <MapPin
                aria-hidden
                className="h-3.5 w-3.5 text-purple-700"
                strokeWidth={2.3}
              />
              Foto, datos y último lugar visto.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-red-600/20 transition hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
            >
              <Plus aria-hidden className="h-4 w-4" strokeWidth={2.6} />
              Reportar desaparecida
            </button>
            <a
              href="#desaparecidas"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-slate-50 px-5 py-2.5 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500"
            >
              <ListChecks
                aria-hidden
                className="h-4 w-4 text-purple-700"
                strokeWidth={2.4}
              />
              Ver lista completa
              <ArrowRight aria-hidden className="h-3.5 w-3.5" strokeWidth={2.5} />
            </a>
          </div>
        </div>

        <div className="relative mt-5">
          {canScrollLeft && (
            <button
              type="button"
              aria-label="Desplazar a la izquierda"
              onClick={() => scrollBy(-1)}
              className="absolute left-0 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-lg shadow-slate-900/10 transition hover:bg-slate-50 sm:grid"
            >
              <ChevronLeft aria-hidden className="h-6 w-6" strokeWidth={2.5} />
            </button>
          )}
          {canScrollRight && (
            <button
              type="button"
              aria-label="Desplazar a la derecha"
              onClick={() => scrollBy(1)}
              className="absolute right-0 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-lg shadow-slate-900/10 transition hover:bg-slate-50 sm:grid"
            >
              <ChevronRight aria-hidden className="h-6 w-6" strokeWidth={2.5} />
            </button>
          )}

          <div
            ref={scrollerRef}
            className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 sm:gap-4 [scrollbar-width:thin]"
            role="list"
          >
            {preview.length === 0 ? (
              <div
                className="flex w-[190px] shrink-0 snap-start flex-col items-center justify-center gap-2.5 rounded-xl bg-slate-50 p-5 text-center text-slate-600 sm:w-[220px]"
                role="listitem"
              >
                <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-purple-700 shadow-sm">
                  <SearchX aria-hidden className="h-5 w-5" strokeWidth={2.2} />
                </span>
                <p className="text-sm font-bold text-slate-900">
                  Aún no hay reportes
                </p>
                <p className="text-xs leading-5">
                  Sé el primero en compartir información para localizar a
                  alguien.
                </p>
              </div>
            ) : (
              preview.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => setSelected(person)}
                  className="group flex w-[178px] shrink-0 snap-start flex-col overflow-hidden rounded-xl bg-white text-left shadow-md shadow-slate-200/80 transition hover:shadow-lg hover:shadow-purple-950/10 sm:w-[205px]"
                  role="listitem"
                >
                  <div className="relative aspect-[5/4] w-full overflow-hidden bg-slate-100">
                    {person.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={person.photoUrl}
                        alt={`Foto de ${person.name}`}
                        loading="lazy"
                        className="h-full w-full object-cover object-center transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-300">
                        <ImageOff aria-hidden className="h-9 w-9" strokeWidth={1.8} />
                      </div>
                    )}
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-purple-700 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white shadow-sm">
                      <UserRoundSearch
                        aria-hidden
                        className="h-3 w-3"
                        strokeWidth={2.5}
                      />
                      Se busca
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5 p-3">
                    <p
                      className="line-clamp-1 text-base font-black leading-tight text-slate-950"
                      title={person.name}
                    >
                      {person.name}
                    </p>
                    {person.age !== null && (
                      <p className="text-xs font-semibold text-slate-500">
                        {person.age} años
                      </p>
                    )}
                    {person.lastSeen && (
                      <p
                        className="line-clamp-2 inline-flex items-start gap-1.5 text-xs leading-5 text-slate-600"
                        title={person.lastSeen}
                      >
                        <MapPin
                          aria-hidden
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600"
                          strokeWidth={2.3}
                        />
                        <span>{person.lastSeen}</span>
                      </p>
                    )}
                    <span className="mt-auto inline-flex items-center gap-1.5 pt-1 text-xs font-extrabold text-purple-700">
                      Ver detalles
                      <ArrowRight aria-hidden className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </span>
                  </div>
                </button>
              ))
            )}

            {hiddenCount > 0 && (
              <a
                href="#desaparecidas"
                className="flex w-[178px] shrink-0 snap-start flex-col items-center justify-center gap-2.5 rounded-xl bg-purple-50 p-4 text-center text-purple-900 shadow-sm transition hover:bg-purple-100 sm:w-[205px]"
                role="listitem"
              >
                <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-purple-700 shadow-sm">
                  <ArrowRight aria-hidden className="h-5 w-5" strokeWidth={2.4} />
                </span>
                <span className="text-base font-black">
                  Ver {hiddenCount.toLocaleString("es-VE")} más
                </span>
                <span className="text-xs font-semibold text-purple-700">
                  Ir a la lista completa
                </span>
              </a>
            )}
          </div>
        </div>
      </div>

      {showForm && (
        <MissingPersonForm
          onCancel={() => setShowForm(false)}
          onSubmit={handleSubmit}
        />
      )}

      {selected && (
        <MissingPersonDetail
          person={selected}
          people={preview}
          onNavigate={setSelected}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}
