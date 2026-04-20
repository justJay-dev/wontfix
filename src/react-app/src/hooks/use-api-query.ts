import {
  useQuery,
  useMutation,
  type UseQueryOptions,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { paths } from "@/lib/api-types";
import type { FetchOptions } from "openapi-fetch";

type PathsWithGet = {
  [Path in keyof paths]: paths[Path] extends { get: unknown } ? Path : never;
}[keyof paths];

type PathsWithPost = {
  [Path in keyof paths]: paths[Path] extends { post: unknown } ? Path : never;
}[keyof paths];

type PathsWithPut = {
  [Path in keyof paths]: paths[Path] extends { put: unknown } ? Path : never;
}[keyof paths];

type PathsWithDelete = {
  [Path in keyof paths]: paths[Path] extends { delete: unknown }
    ? Path
    : never;
}[keyof paths];

type MutablePaths = PathsWithPost | PathsWithPut | PathsWithDelete;

type HttpMethod = "post" | "put" | "delete";

type GetRequestOptions<Path extends PathsWithGet> =
  paths[Path] extends { get: { parameters: infer Params } }
    ? FetchOptions<{ parameters: Params }>
    : FetchOptions<Record<string, never>>;

type GetResponseData<Path extends PathsWithGet> =
  paths[Path] extends {
    get: { responses: { 200: { content: { "application/json": infer Data } } } };
  }
    ? Data
    : unknown;

type MutationRequestBody<
  Path extends MutablePaths,
  Method extends HttpMethod,
> = paths[Path] extends { [key in Method]: { requestBody: { content: { "application/json": infer Body } } } }
  ? Body
  : void;

type MutationResponseData<
  Path extends MutablePaths,
  Method extends HttpMethod,
> = paths[Path] extends {
  [key in Method]: {
    responses: { 200: { content: { "application/json": infer Data } } };
  };
}
  ? Data
  : unknown;

/**
 * Typed wrapper around react-query's useQuery for GET endpoints.
 *
 * @example
 * const { data, isLoading } = useApiQuery("/api/users", {
 *   queryKey: ["users"],
 * });
 */
export function useApiQuery<Path extends PathsWithGet>(
  path: Path,
  options?: GetRequestOptions<Path> & {
    queryKey?: unknown[];
    queryOptions?: Omit<
      UseQueryOptions<GetResponseData<Path>>,
      "queryKey" | "queryFn"
    >;
  },
) {
  const { queryKey, queryOptions, ...fetchOptions } = options ?? {};

  return useQuery<GetResponseData<Path>>({
    queryKey: queryKey ?? [path],
    queryFn: async () => {
      const { data, error } = await apiClient.GET(
        path as never,
        fetchOptions as never,
      );
      if (error) throw error;
      return data as GetResponseData<Path>;
    },
    ...queryOptions,
  });
}

/**
 * Typed wrapper around react-query's useMutation for POST/PUT/DELETE endpoints.
 *
 * @example
 * const createUser = useApiMutation("post", "/api/users", {
 *   onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
 * });
 * createUser.mutate({ name: "Jay" });
 */
export function useApiMutation<
  Method extends HttpMethod,
  Path extends MutablePaths,
>(
  method: Method,
  path: Path,
  options?: Omit<
    UseMutationOptions<
      MutationResponseData<Path, Method>,
      Error,
      MutationRequestBody<Path, Method>
    >,
    "mutationFn"
  >,
) {
  const clientMethod = method === "post"
    ? apiClient.POST
    : method === "put"
      ? apiClient.PUT
      : apiClient.DELETE;

  return useMutation<
    MutationResponseData<Path, Method>,
    Error,
    MutationRequestBody<Path, Method>
  >({
    mutationFn: async (body) => {
      const { data, error } = await (clientMethod as CallableFunction)(path, {
        body,
      });
      if (error) throw error;
      return data;
    },
    ...options,
  });
}
