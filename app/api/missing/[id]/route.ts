import { NextResponse } from "next/server";
import { removeMissing } from "@/lib/missing";
import { isAdminRequest } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json(
      { error: "Solo los administradores pueden eliminar reportes." },
      { status: 401 },
    );
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Falta el id" }, { status: 400 });
  }
  const removed = await removeMissing(id);
  if (!removed) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
