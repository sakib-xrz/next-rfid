import { NextResponse } from "next/server";

import {
  getRfidSerialReaderStatus,
  startRfidSerialReader,
} from "@/lib/rfid/serial-reader";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  startRfidSerialReader();

  return NextResponse.json(getRfidSerialReaderStatus());
}
