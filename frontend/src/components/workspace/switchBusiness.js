import { api, cacheUser } from "@/utils/api";

/**
 * Continue as the owner of another business of the workspace, then open `path` there. The server starts a new session for that
 * business's owner account; the page reloads so nothing of the previous business stays on screen.
 */
export async function switchBusiness(institutionId, path = "/dashboard") {
  await api.post("/workspace/switch", { institutionId });
  cacheUser(null);
  window.location.assign(path);
}
