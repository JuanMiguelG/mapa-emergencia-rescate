"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Calendar,
  CircleCheck,
  HeartHandshake,
  ImageOff,
  MapPin,
} from "lucide-react";
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

const POLL_INTERVAL_MS = 20_000;
const LOW_BANDWIDTH_POLL_INTERVAL_MS = 60_000;
const PAGE_SIZE = 48;

/** Ventana compacta de números de página alrededor de la página actual. */
function pageWindow(page: number, totalPages: number): number[] {
  const span = 2;
  const start = Math.max(1, Math.min(page - span, totalPages - span * 2));
  const end = Math.min(totalPages, Math.max(page + span, span * 2 + 1));
  const pages: number[] = [];
  for (let p = start; p <= end; p++) pages.push(p);
  return pages;
}

function formatDate(ts: number | null | undefined): string {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleDateString("es-VE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function FoundPersons() {
  const [people, setPeople] = useState<MissingPerson[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<MissingPerson | null>(null);
  const network = useLowBandwidthMode(
    POLL_INTERVAL_MS,
    LOW_BANDWIDTH_POLL_INTERVAL_MS,
  );
  const requestIdRef = useRef(0);
  const listTopRef = useRef<HTMLDivElement | null>(null);
  const initialPageRef = useRef(true);

  const fetchFound = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    try {
      const res = await fetch(
        `/api/missing?status=found&page=${page}&pageSize=${PAGE_SIZE}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const data = await res.json();
      // Ignorar respuestas de solicitudes anteriores (carrera con polling).
      if (requestId !== requestIdRef.current) return;
      setPeople(data.people ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
      // El servidor acota la página al rango válido.
      if (typeof data.page === "number" && data.page !== page) {
        setPage(data.page);
      }
    } catch {
      // se reintenta en el próximo ciclo
    }
  }, [page]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (interval) return;
      fetchFound();
      interval = setInterval(fetchFound, network.pollIntervalMs);
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
  }, [fetchFound, network.pollIntervalMs]);

  // Al cambiar de página, hacemos scroll al inicio de la lista (no en la
  // carga inicial).
  useEffect(() => {
    if (initialPageRef.current) {
      initialPageRef.current = false;
      return;
    }
    listTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [page]);

  const pages = pageWindow(page, totalPages);

  return (
    <div ref={listTopRef} className="bg-white">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
            <HeartHandshake
              aria-hidden
              className="h-5 w-5"
              strokeWidth={2.5}
            />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black text-slate-950 sm:text-xl">
                Personas localizadas a salvo
              </h2>
              <span
                className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800"
                aria-label={`${total} personas localizadas`}
              >
                {total} localizada{total === 1 ? "" : "s"}
              </span>
            </div>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
              Familias que volvieron a encontrarse gracias a la comunidad.
              Mantener este registro ayuda a cerrar búsquedas y orientar apoyo.
            </p>
          </div>
        </div>
        <a
          href="#desaparecidas"
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
        >
          Ver personas en búsqueda →
        </a>
      </div>

      {people.length === 0 ? (
        <div className="mt-5 flex items-start gap-3 rounded-xl bg-slate-50 px-4 py-5 text-sm text-slate-600">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-emerald-700 shadow-sm">
            <CircleCheck aria-hidden className="h-5 w-5" strokeWidth={2.4} />
          </span>
          <div>
            <p className="font-bold text-slate-950">
              Aún no hay personas localizadas registradas
            </p>
            <p className="mt-1 leading-6">
              Cuando una búsqueda se marque como localizada, aparecerá aquí para
              que la comunidad sepa que esa persona ya está a salvo.
            </p>
          </div>
        </div>
      ) : (
        <>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {people.map((person) => (
              <li
                key={person.id}
                className="relative overflow-hidden rounded-xl bg-white shadow-sm shadow-emerald-100/80 transition hover:shadow-md"
              >
                <button
                  type="button"
                  onClick={() => setSelected(person)}
                  aria-label={`Ver detalle de ${person.name}`}
                  className="flex w-full gap-3 p-3 text-left transition hover:bg-emerald-50/50 active:bg-emerald-50"
                >
                  {person.photoUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={person.photoUrl}
                      alt={`Foto de ${person.name}`}
                      loading="lazy"
                      className="h-24 w-24 shrink-0 rounded-lg bg-slate-100 object-cover"
                    />
                  ) : (
                    <div className="grid h-24 w-24 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                      <ImageOff
                        aria-hidden
                        className="h-6 w-6"
                        strokeWidth={2.4}
                      />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white">
                      <CircleCheck
                        aria-hidden
                        className="h-3 w-3"
                        strokeWidth={2.5}
                      />
                      Localizado a salvo
                    </span>
                    <p className="mt-1 text-sm font-bold text-slate-950">
                      {person.name}
                      {person.age !== null && (
                        <span className="font-normal text-slate-500">
                          {" "}
                          · {person.age} años
                        </span>
                      )}
                    </p>
                    {person.lastSeen && (
                      <p className="mt-1 inline-flex items-start gap-1.5 text-xs text-slate-600">
                        <MapPin
                          aria-hidden
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600"
                          strokeWidth={2.4}
                        />
                        <span>{person.lastSeen}</span>
                      </p>
                    )}
                    {person.resolvedAt && (
                      <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                        <Calendar
                          aria-hidden
                          className="h-3.5 w-3.5"
                          strokeWidth={2.4}
                        />
                        <span>{formatDate(person.resolvedAt)}</span>
                      </p>
                    )}
                    <p className="mt-2 text-[11px] font-bold text-emerald-700">
                      Toca para ver más
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <nav
              className="mt-6 flex flex-wrap items-center justify-center gap-1.5"
              aria-label="Paginación de personas localizadas"
            >
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-40"
              >
                ← Anterior
              </button>
              {pages[0] > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setPage(1)}
                    className="rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-bold text-emerald-800 hover:bg-emerald-100"
                  >
                    1
                  </button>
                  {pages[0] > 2 && (
                    <span className="px-1 text-slate-400">…</span>
                  )}
                </>
              )}
              {pages.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  aria-current={p === page ? "page" : undefined}
                  className={
                    p === page
                      ? "rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-bold text-white"
                      : "rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-bold text-emerald-800 hover:bg-emerald-100"
                  }
                >
                  {p}
                </button>
              ))}
              {pages[pages.length - 1] < totalPages && (
                <>
                  {pages[pages.length - 1] < totalPages - 1 && (
                    <span className="px-1 text-slate-400">…</span>
                  )}
                  <button
                    type="button"
                    onClick={() => setPage(totalPages)}
                    className="rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-bold text-emerald-800 hover:bg-emerald-100"
                  >
                    {totalPages}
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-40"
              >
                Siguiente →
              </button>
            </nav>
          )}
          <p className="mt-3 text-center text-[11px] text-slate-400">
            Página {page} de {totalPages}
          </p>
        </>
      )}

      {selected && (
        <MissingPersonDetail
          person={selected}
          people={people}
          onNavigate={setSelected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
