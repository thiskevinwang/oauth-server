import type { Context } from "hono";
import type { Env } from "@/types";

export interface KeyValue {
  put<T = any>(path: string, value: T): Promise<void>;
  get<T = any>(path: string): Promise<T | null>;
}
