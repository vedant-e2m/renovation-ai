import React, { useState } from 'react';
import { Check, ChevronDown, Pipette, X } from 'lucide-react';
import { MATERIAL_CATALOG, type Material } from '../data/materials';
import { isCategoryAllowed } from '../data/compatibility';

interface MaterialPickerProps {
  onSelect: (material: Material) => void;
  onDeselect?: () => void;
  selectedId?: string;
  /** Component type the picker is assigning to; used to hide incompatible categories. */
  componentType?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  paint: 'Paint',
  stone_cladding: 'Stone Cladding',
  wood: 'Wood Panels',
  railing: 'Railing',
};

export const MaterialPicker: React.FC<MaterialPickerProps> = ({
  onSelect,
  onDeselect,
  selectedId,
  componentType,
}) => {
  const [openCategory, setOpenCategory] = useState<string>('paint');
  const [customColors, setCustomColors] = useState<Record<string, string>>({});

  const selectedMaterial = Object.values(MATERIAL_CATALOG)
    .flat()
    .find((m) => m.id === selectedId);

  // Only show catalog groups compatible with the selected component type.
  const allowedEntries = Object.entries(MATERIAL_CATALOG).filter(([category]) =>
    isCategoryAllowed(componentType, category),
  );

  // Keep an allowed category open even if the remembered one is now hidden.
  const effectiveOpen = allowedEntries.some(([c]) => c === openCategory)
    ? openCategory
    : allowedEntries[0]?.[0] ?? '';

  const handleCustomColor = (category: string, hex: string) => {
    setCustomColors((prev) => ({ ...prev, [category]: hex }));
    // Find the first material in this category to base cost/finish on
    const base = MATERIAL_CATALOG[category]?.[0];
    if (!base) return;
    onSelect({
      ...base,
      id: `${category}-custom`,
      name: 'Custom Colour',
      color_hex: hex,
    });
  };

  return (
    <div className="space-y-2 max-h-[58vh] overflow-y-auto pr-0.5">
      {/* Selected swatch summary */}
      {selectedMaterial && (
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-surface border border-border mb-3">
          <div
            className="w-6 h-6 rounded-md shrink-0 shadow-inner border border-black/10"
            style={{ backgroundColor: selectedMaterial.color_hex }}
          />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-charcoal truncate">{selectedMaterial.name}</p>
            <p className="text-[10px] text-muted">
              {selectedMaterial.finish} · ${selectedMaterial.cost_per_unit}/{selectedMaterial.unit}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 shrink-0">
            <Check className="w-3.5 h-3.5 text-primary" />
            {onDeselect && (
              <button
                type="button"
                title="Remove selection"
                onClick={onDeselect}
                className="w-4 h-4 flex items-center justify-center rounded-full bg-muted/20 hover:bg-red-100 hover:text-red-500 text-muted transition-colors"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {allowedEntries.map(([category, materials]) => {
        const isOpen = effectiveOpen === category;

        return (
          <div key={category} className="rounded-xl border border-border overflow-hidden">
            {/* Category header */}
            <button
              type="button"
              onClick={() => setOpenCategory(isOpen ? '' : category)}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-surface hover:bg-surface-muted transition-colors text-left"
            >
              <span className="text-xs font-semibold text-charcoal">
                {CATEGORY_LABELS[category] ?? category.replace('_', ' ')}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Swatch grid */}
            {isOpen && (
              <div className="px-2.5 pb-2.5 pt-1.5 bg-white">
                <div className="flex flex-wrap gap-1 mb-2">
                  {materials.map((mat) => {
                    const isSelected = selectedId === mat.id;
                    const isCustomSelected =
                      selectedId === `${category}-custom` &&
                      customColors[category] === mat.color_hex;
                    const active = isSelected || isCustomSelected;

                    return (
                      <button
                        key={mat.id}
                        type="button"
                        title={active ? `Remove ${mat.name}` : `${mat.name} — ${mat.finish} · $${mat.cost_per_unit}/${mat.unit}`}
                        onClick={() => (active && onDeselect ? onDeselect() : onSelect(mat))}
                        className={`relative w-7 h-7 shrink-0 rounded-md border-2 transition-all duration-150 hover:scale-105 active:scale-95 focus:outline-none ${
                          active
                            ? 'border-primary shadow-sm scale-105'
                            : 'border-transparent hover:border-border'
                        }`}
                        style={{ backgroundColor: mat.color_hex }}
                      >
                        {active && (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <Check
                              className="w-2.5 h-2.5 drop-shadow"
                              style={{ color: isLightColor(mat.color_hex) ? '#1C1C1C' : '#FFFFFF' }}
                            />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Hovered/selected name */}
                <SwatchLabel materials={materials} selectedId={selectedId} category={category} />

                {/* Custom colour picker */}
                <label
                  className="mt-2 flex items-center gap-2 cursor-pointer group"
                  title="Pick a custom colour"
                >
                  <Pipette className="w-3 h-3 text-muted group-hover:text-primary transition-colors shrink-0" />
                  <span className="text-[10px] text-muted group-hover:text-charcoal transition-colors">
                    Custom colour
                  </span>
                  <input
                    type="color"
                    className="ml-auto w-6 h-6 rounded cursor-pointer border border-border p-0.5 bg-white"
                    value={customColors[category] ?? '#FFFFFF'}
                    onChange={(e) => handleCustomColor(category, e.target.value)}
                  />
                </label>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

/** Shows the name of the material that is currently selected within this category. */
const SwatchLabel: React.FC<{
  materials: Material[];
  selectedId?: string;
  category: string;
}> = ({ materials, selectedId, category }) => {
  const mat = materials.find(
    (m) => m.id === selectedId || (selectedId === `${category}-custom` && false),
  );

  if (!mat) return <p className="text-[10px] text-muted h-4">&nbsp;</p>;

  return (
    <p className="text-[10px] text-charcoal font-medium truncate h-4">
      {mat.name}
      <span className="text-muted font-normal ml-1">
        · {mat.finish} · ${mat.cost_per_unit}/{mat.unit}
      </span>
    </p>
  );
};

function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  // Perceived luminance
  return (r * 299 + g * 587 + b * 114) / 1000 > 155;
}
