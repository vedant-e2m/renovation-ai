import { MATERIAL_CATALOG, type Material } from './materials';

/**
 * Defines which material catalog groups are valid for each component type.
 * Keys are component `type` values (see backend ComponentType enum); values are
 * the top-level keys of MATERIAL_CATALOG.
 *
 * This is the single source of truth used by both the picker UI (to hide
 * incompatible categories) and the selection guard (to reject bad combos).
 */
export const ALLOWED_MATERIALS: Record<string, string[]> = {
  wall: ['paint', 'stone_cladding', 'wood'],
  roof: ['stone_cladding'],
  railing: ['railing'],
  balcony: ['railing', 'stone_cladding', 'wood'],
  parapet: ['paint', 'stone_cladding'],
  pillar: ['paint', 'stone_cladding', 'wood'],
  door: ['paint', 'wood'],
  window: ['paint'],
  gate: ['railing', 'wood'],
};

/** Returns the catalog groups allowed for a component type. Unknown types allow everything. */
export function allowedCategoriesFor(componentType?: string): string[] | null {
  if (!componentType) return null;
  return ALLOWED_MATERIALS[componentType] ?? null;
}

/** Whether a material catalog group can be applied to the given component type. */
export function isCategoryAllowed(componentType: string | undefined, catalogGroup: string): boolean {
  const allowed = allowedCategoriesFor(componentType);
  // No rule defined => permissive (don't block unknown component types).
  if (!allowed) return true;
  return allowed.includes(catalogGroup);
}

/**
 * Maps a material's fine-grained `category` (e.g. "glass_railing", "panels")
 * back to its top-level catalog group (e.g. "railing", "wood").
 */
const CATALOG_GROUP_BY_MATERIAL_CATEGORY: Record<string, string> = Object.entries(
  MATERIAL_CATALOG,
).reduce<Record<string, string>>((acc, [group, materials]) => {
  for (const mat of materials) acc[mat.category] = group;
  return acc;
}, {});

/** Resolves the catalog group for a material, falling back to its raw category. */
export function catalogGroupForMaterial(material: Material): string {
  return CATALOG_GROUP_BY_MATERIAL_CATEGORY[material.category] ?? material.category;
}

/** Whether a specific material can be applied to the given component type. */
export function isMaterialAllowed(componentType: string | undefined, material: Material): boolean {
  return isCategoryAllowed(componentType, catalogGroupForMaterial(material));
}
