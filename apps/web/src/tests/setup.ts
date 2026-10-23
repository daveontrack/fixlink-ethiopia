import { config } from "dotenv";
import { fileURLToPath } from "node:url";

// The project keeps one .env at the repository root. Loading it here lets
// the read-only RLS integration test use the public URL/key; no test prints
// or writes a secret.
config({
  path: fileURLToPath(new URL("../../../../.env", import.meta.url)),
  quiet: true,
});
