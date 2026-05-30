import { NextResponse } from "next/server";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

export function isPrismaErrorCode(error: unknown, code: string) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === code
  );
}

export function errorResponse(error: unknown, fallbackMessage = "Unknown error") {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (isPrismaErrorCode(error, "P2002")) {
    return NextResponse.json({ error: "A record with this unique value already exists" }, { status: 409 });
  }

  return NextResponse.json(
    { error: error instanceof Error ? error.message : fallbackMessage },
    { status: 500 },
  );
}
