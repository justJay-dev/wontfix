import createClient from "openapi-fetch";
import type { paths } from "@/lib/api-types";

export const apiClient = createClient<paths>({
  baseUrl: "/",
});
