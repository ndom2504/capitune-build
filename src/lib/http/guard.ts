import { NextResponse } from "next/server";
import { OwnershipError, NotFoundError, PublishSchemaError } from "@/lib/store/repository";
import { ZodError } from "zod";

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof Error && error.message === "UNAUTHENTICATED") {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }
  if (error instanceof OwnershipError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof PublishSchemaError) {
    return NextResponse.json({ error: error.message, code: "PUBLISH_SCHEMA" }, { status: 503 });
  }
  if (error instanceof ZodError) {
    return NextResponse.json({ error: "Requête invalide.", details: error.flatten() }, { status: 400 });
  }
  const message = error instanceof Error ? error.message : "Erreur inattendue.";
  return NextResponse.json({ error: message }, { status: 400 });
}
