import type { TypeDefinitionsConfig } from "../src/types/categoryTypes.js";
import { readAppData, writeAppData } from "./dataStore.js";
import { defaultTypeDefinitionsConfig, mergeTypeDefinitions } from "../src/lib/typeDefinitions.js";

export function getTypeDefinitions(): TypeDefinitionsConfig {
  const data = readAppData();
  const saved = data.settings.typeDefinitions;
  return mergeTypeDefinitions(saved ?? null);
}

export function saveTypeDefinitions(config: TypeDefinitionsConfig): TypeDefinitionsConfig {
  const merged = mergeTypeDefinitions(config);
  merged.updatedAt = new Date().toISOString();
  const data = readAppData();
  data.settings.typeDefinitions = merged;
  writeAppData(data);
  return merged;
}

export async function syncTypeDefinitionsFromGas(
  proxyToGas: (payload: Record<string, unknown>) => Promise<unknown>
): Promise<TypeDefinitionsConfig> {
  try {
    const result = (await proxyToGas({ action: "get_type_definitions" })) as {
      types?: TypeDefinitionsConfig["types"];
      error?: string;
    };
    if (result?.types && Array.isArray(result.types) && result.types.length > 0) {
      return saveTypeDefinitions({ types: result.types });
    }
  } catch (e) {
    console.warn("syncTypeDefinitionsFromGas:", e);
  }
  return getTypeDefinitions();
}

export async function persistTypeDefinitionsToGas(
  config: TypeDefinitionsConfig,
  proxyToGas: (payload: Record<string, unknown>) => Promise<unknown>
): Promise<{ ok: boolean; error?: string }> {
  try {
    const result = (await proxyToGas({
      action: "save_type_definitions",
      types: config.types,
    })) as { success?: boolean; error?: string };
    if (result?.error) return { ok: false, error: result.error };
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : "Save failed" };
  }
}

export { defaultTypeDefinitionsConfig };
