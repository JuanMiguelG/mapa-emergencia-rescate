import { getSql, hasDbEnv } from "./db";

/** Registro de persona desaparecida tal como se expone al cliente (sin la foto embebida). */
export interface MissingPerson {
  id: string;
  name: string;
  age: number | null;
  description: string;
  lastSeen: string;
  contact: string;
  /** URL del endpoint que sirve la foto, o null si no hay foto. */
  photoUrl: string | null;
  createdAt: number;
}

export interface NewMissingPerson {
  name: string;
  age?: number | string | null;
  description?: string;
  lastSeen?: string;
  contact?: string;
  /** Data URL de la foto (data:image/...;base64,...). Opcional. */
  photo?: string | null;
}

export const MAX_NAME = 120;
export const MAX_DESCRIPTION = 600;
export const MAX_LAST_SEEN = 200;
export const MAX_CONTACT = 120;
/** Límite del data URL de la foto (~1.4 MB en base64 ≈ 1 MB de imagen). */
export const MAX_PHOTO_CHARS = 1_400_000;

const FETCH_LIMIT = 1000;

let _schemaReady: Promise<void> | null = null;
function ensureSchema(): Promise<void> {
  if (!_schemaReady) {
    const sql = getSql();
    _schemaReady = sql`
      CREATE TABLE IF NOT EXISTS missing_persons (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        age INTEGER,
        description TEXT NOT NULL DEFAULT '',
        last_seen TEXT NOT NULL DEFAULT '',
        contact TEXT NOT NULL DEFAULT '',
        photo TEXT,
        created_at BIGINT NOT NULL
      )
    `.then(() => undefined);
  }
  return _schemaReady;
}

interface MemoryRecord extends MissingPerson {
  photo: string | null;
}
const memoryStore = new Map<string, MemoryRecord>();

type Row = {
  id: string;
  name: string;
  age: number | null;
  description: string;
  last_seen: string;
  contact: string;
  has_photo: boolean;
  created_at: string | number;
};

function rowToPerson(row: Row): MissingPerson {
  return {
    id: row.id,
    name: row.name,
    age: row.age === null ? null : Number(row.age),
    description: row.description,
    lastSeen: row.last_seen,
    contact: row.contact,
    photoUrl: row.has_photo ? `/api/missing/${row.id}/photo` : null,
    createdAt: Number(row.created_at),
  };
}

function normalizeAge(age: NewMissingPerson["age"]): number | null {
  if (age === null || age === undefined || age === "") return null;
  const n = Math.trunc(Number(age));
  if (!Number.isFinite(n) || n < 0 || n > 130) return null;
  return n;
}

/** Valida que la cadena sea un data URL de imagen soportada. */
export function isValidPhotoDataUrl(photo: string): boolean {
  return /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(photo);
}

export async function listMissing(): Promise<MissingPerson[]> {
  if (hasDbEnv()) {
    await ensureSchema();
    const rows = (await getSql()`
      SELECT id, name, age, description, last_seen, contact,
             (photo IS NOT NULL) AS has_photo, created_at
      FROM missing_persons
      ORDER BY created_at DESC
      LIMIT ${FETCH_LIMIT}
    `) as Row[];
    return rows.map(rowToPerson);
  }
  return [...memoryStore.values()]
    .map(({ photo: _photo, ...rest }) => rest)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function addMissing(
  input: NewMissingPerson,
): Promise<MissingPerson> {
  if (!hasDbEnv() && process.env.VERCEL) {
    throw new Error("DATABASE_URL no configurada: la persistencia es obligatoria.");
  }

  const id = crypto.randomUUID();
  const name = (input.name ?? "").trim().slice(0, MAX_NAME);
  const age = normalizeAge(input.age);
  const description = (input.description ?? "").trim().slice(0, MAX_DESCRIPTION);
  const lastSeen = (input.lastSeen ?? "").trim().slice(0, MAX_LAST_SEEN);
  const contact = (input.contact ?? "").trim().slice(0, MAX_CONTACT);
  const photo =
    typeof input.photo === "string" && input.photo ? input.photo : null;
  const createdAt = Date.now();

  if (hasDbEnv()) {
    await ensureSchema();
    await getSql()`
      INSERT INTO missing_persons
        (id, name, age, description, last_seen, contact, photo, created_at)
      VALUES (
        ${id}, ${name}, ${age}, ${description}, ${lastSeen},
        ${contact}, ${photo}, ${createdAt}
      )
    `;
  } else {
    memoryStore.set(id, {
      id,
      name,
      age,
      description,
      lastSeen,
      contact,
      photo,
      photoUrl: photo ? `/api/missing/${id}/photo` : null,
      createdAt,
    });
  }

  return {
    id,
    name,
    age,
    description,
    lastSeen,
    contact,
    photoUrl: photo ? `/api/missing/${id}/photo` : null,
    createdAt,
  };
}

export interface PhotoData {
  contentType: string;
  buffer: Buffer;
}

/** Devuelve los bytes de la foto de una persona, o null si no existe. */
export async function getMissingPhoto(id: string): Promise<PhotoData | null> {
  let dataUrl: string | null = null;
  if (hasDbEnv()) {
    await ensureSchema();
    const rows = (await getSql()`
      SELECT photo FROM missing_persons WHERE id = ${id}
    `) as { photo: string | null }[];
    dataUrl = rows[0]?.photo ?? null;
  } else {
    dataUrl = memoryStore.get(id)?.photo ?? null;
  }
  if (!dataUrl) return null;

  const match = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  return {
    contentType: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}

export async function removeMissing(id: string): Promise<boolean> {
  if (hasDbEnv()) {
    await ensureSchema();
    const rows = (await getSql()`
      DELETE FROM missing_persons WHERE id = ${id} RETURNING id
    `) as { id: string }[];
    return rows.length > 0;
  }
  return memoryStore.delete(id);
}
