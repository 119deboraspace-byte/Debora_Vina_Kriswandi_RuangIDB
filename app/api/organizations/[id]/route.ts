import { z } from "zod";
import { setOrganizationStatus } from "@/lib/admin";
import { getSessionUser, isSameOrigin } from "@/lib/auth";
import { forbidden, jsonFail, jsonOk, parseBody, unauthorized } from "@/lib/http";

const schema = z.object({ status: z.enum(["VERIFIED", "REJECTED", "PENDING"]) });

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  if (!isSameOrigin(request)) return jsonFail(403, "Permintaan lintas-origin ditolak.");
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (user.role !== "ADMIN1" && user.role !== "ADMIN2") return forbidden();

  const { id } = await context.params;
  const parsed = await parseBody(request, schema);
  if (!parsed.ok) return parsed.response;

  const result = setOrganizationStatus({
    organizationId: id,
    status: parsed.data.status,
    actor: user,
  });
  if (!result.ok) return jsonFail(422, result.error ?? "Gagal memperbarui organisasi.");
  return jsonOk({ ok: true });
}
