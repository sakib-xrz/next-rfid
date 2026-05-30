export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  void import("./lib/rfid/serial-reader").then(({ startRfidSerialReader }) => {
    startRfidSerialReader();
  });
}
