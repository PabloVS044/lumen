import type { DescMessage, MessageShape } from "@bufbuild/protobuf";
import { createValidator } from "@bufbuild/protovalidate";

const validator = createValidator();

/**
 * Valida un mensaje con las mismas reglas `buf.validate` que aplica el motor.
 * Útil en formularios: devuelve { campo: mensaje } o null si es válido.
 */
export function validateMessage<Desc extends DescMessage>(
  schema: Desc,
  message: MessageShape<Desc>,
): Record<string, string> | null {
  const result = validator.validate(schema, message);
  if (result.kind === "valid") return null;
  if (result.kind === "error") return { _: result.error.message };
  return Object.fromEntries(
    result.violations.map((v) => [
      v.field
        .map((f) => ("name" in f ? f.name : `[${"index" in f ? f.index : String(f.key)}]`))
        .join(".") || "_",
      v.message,
    ]),
  );
}
