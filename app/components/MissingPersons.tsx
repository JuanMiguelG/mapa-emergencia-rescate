"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import MissingPersonForm, {
  type MissingPersonPayload,
} from "./MissingPersonForm";

interface MissingPerson {
  id: string;
  name: string;
  age: number | null;
  description: string;
  lastSeen: string;
  contact: string;
  photoUrl: string | null;
  createdAt: number;
}

const POLL_INTERVAL_MS = 15000;
const ADMIN_STORAGE_KEY = "emergency:adminToken";

function extractPhone(contact: string): string | null {
  const digits = contact.replace(/[^\d+]/g, "");
  return digits.replace(/\D/g, "").length >= 7 ? digits : null;
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default function MissingPersons() {
  const [people, setPeople] = useState<MissingPerson[]>([]);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [persistent, setPersistent] = useState(true);

  const fetchPeople = useCallback(async () => {
    setAdminToken(sessionStorage.getItem(ADMIN_STORAGE_KEY));
    try {
      const res = await fetch("/api/missing", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setPeople(data.people ?? []);
      setPersistent(Boolean(data.persistent));
    } catch {
      // se reintenta en el siguiente ciclo
    }
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (interval) return;
      fetchPeople();
      interval = setInterval(fetchPeople, POLL_INTERVAL_MS);
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
  }, [fetchPeople]);

  const handleSubmit = useCallback(async (payload: MissingPersonPayload) => {
    const res = await fetch("/api/missing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error ?? "No se pudo guardar el reporte.");
    }
    setShowForm(false);
    if (data.person) {
      setPeople((prev) =>
        prev.some((p) => p.id === data.person.id)
          ? prev
          : [data.person, ...prev],
      );
    }
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!adminToken) return;
      const previous = people;
      setPeople((prev) => prev.filter((p) => p.id !== id));
      const res = await fetch(`/api/missing/${id}`, {
        method: "DELETE",
        headers: { "x-admin-token": adminToken },
      }).catch(() => null);
      if (res && res.status === 401) setPeople(previous);
    },
    [adminToken, people],
  );

  const visible = useMemo(() => {
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    if (terms.length === 0) return people;
    return people.filter((p) => {
      const haystack = normalize(`${p.name} ${p.lastSeen} ${p.description}`);
      return terms.every((t) => haystack.includes(t));
    });
  }, [people, query]);

  return (
    <section id="desaparecidas" className="mx-auto w-full max-w-7xl px-4 pb-14">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              🧍 Personas desaparecidas
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Lista de personas que se buscan tras el terremoto. Si reconoces a
              alguien o tienes información, contacta a la persona indicada.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="shrink-0 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
          >
            + Reportar desaparecida
          </button>
        </div>

        {people.length > 0 && (
          <div className="relative mt-4">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, zona o descripción…"
              aria-label="Buscar personas desaparecidas"
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-slate-900"
            />
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              🔎
            </span>
          </div>
        )}

        {visible.length === 0 ? (
          <p className="mt-6 rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            {people.length === 0
              ? "Aún no hay personas reportadas. Usa el botón para agregar la primera."
              : `No se encontraron personas para “${query.trim()}”.`}
          </p>
        ) : (
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((person) => {
              const phone = extractPhone(person.contact);
              return (
                <li
                  key={person.id}
                  className="flex gap-3 rounded-xl border border-slate-200 p-3"
                >
                  {person.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={person.photoUrl}
                      alt={`Foto de ${person.name}`}
                      loading="lazy"
                      className="h-24 w-24 shrink-0 rounded-lg object-cover ring-1 ring-slate-200"
                    />
                  ) : (
                    <div className="grid h-24 w-24 shrink-0 place-items-center rounded-lg bg-slate-100 text-3xl text-slate-400">
                      🧍
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-1">
                      <p className="font-semibold text-slate-900">
                        {person.name}
                        {person.age !== null && (
                          <span className="font-normal text-slate-500">
                            {" "}
                            · {person.age} años
                          </span>
                        )}
                      </p>
                      {adminToken && (
                        <button
                          type="button"
                          onClick={() => handleDelete(person.id)}
                          aria-label="Eliminar reporte"
                          className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
                          ×
                        </button>
                      )}
                    </div>
                    {person.lastSeen && (
                      <p className="mt-0.5 text-xs text-slate-600">
                        📍 {person.lastSeen}
                      </p>
                    )}
                    {person.description && (
                      <p className="mt-1 line-clamp-3 text-xs text-slate-600">
                        {person.description}
                      </p>
                    )}
                    {person.contact &&
                      (phone ? (
                        <a
                          href={`tel:${phone}`}
                          className="mt-1 inline-block text-xs font-medium text-red-700 hover:underline"
                        >
                          📞 {person.contact}
                        </a>
                      ) : (
                        <p className="mt-1 text-xs font-medium text-slate-700">
                          {person.contact}
                        </p>
                      ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {!persistent && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Modo demo: los reportes no se están guardando de forma permanente.
          </p>
        )}
      </div>

      {showForm && (
        <MissingPersonForm
          onCancel={() => setShowForm(false)}
          onSubmit={handleSubmit}
        />
      )}
    </section>
  );
}
