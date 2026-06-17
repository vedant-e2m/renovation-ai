export interface Material {
  id: string;
  name: string;
  category: string;
  color_hex: string;
  finish: string;
  cost_per_unit: number;
  unit: string;
  coverage_per_unit: number;
  wastage_pct?: number;
}

export const MATERIAL_CATALOG: Record<string, Material[]> = {
  paint: [
    { id: 'paint-pure-white',      name: 'Pure White',          category: 'paint', color_hex: '#FFFFFF', finish: 'Matte',   cost_per_unit: 15, unit: 'liter', coverage_per_unit: 10 },
    { id: 'paint-off-white',       name: 'Off White',           category: 'paint', color_hex: '#F5F0E8', finish: 'Matte',   cost_per_unit: 15, unit: 'liter', coverage_per_unit: 10 },
    { id: 'paint-cream',           name: 'Cream',               category: 'paint', color_hex: '#FFFDD0', finish: 'Matte',   cost_per_unit: 15, unit: 'liter', coverage_per_unit: 10 },
    { id: 'paint-ivory',           name: 'Ivory',               category: 'paint', color_hex: '#FFFFF0', finish: 'Satin',   cost_per_unit: 16, unit: 'liter', coverage_per_unit: 10 },
    { id: 'paint-beige',           name: 'Warm Beige',          category: 'paint', color_hex: '#D4B896', finish: 'Matte',   cost_per_unit: 16, unit: 'liter', coverage_per_unit: 10 },
    { id: 'paint-sandstone',       name: 'Sandstone',           category: 'paint', color_hex: '#C2A882', finish: 'Matte',   cost_per_unit: 16, unit: 'liter', coverage_per_unit: 10 },
    { id: 'paint-tan',             name: 'Warm Tan',            category: 'paint', color_hex: '#B8906A', finish: 'Satin',   cost_per_unit: 17, unit: 'liter', coverage_per_unit: 10 },
    { id: 'paint-terracotta',      name: 'Terracotta',          category: 'paint', color_hex: '#C0644A', finish: 'Matte',   cost_per_unit: 17, unit: 'liter', coverage_per_unit: 10 },
    { id: 'paint-rust',            name: 'Rust Red',            category: 'paint', color_hex: '#B7410E', finish: 'Matte',   cost_per_unit: 17, unit: 'liter', coverage_per_unit: 10 },
    { id: 'paint-brick-red',       name: 'Brick Red',           category: 'paint', color_hex: '#8B2500', finish: 'Matte',   cost_per_unit: 18, unit: 'liter', coverage_per_unit: 10 },
    { id: 'paint-sage',            name: 'Sage Green',          category: 'paint', color_hex: '#8FAF80', finish: 'Matte',   cost_per_unit: 17, unit: 'liter', coverage_per_unit: 10 },
    { id: 'paint-olive',           name: 'Olive',               category: 'paint', color_hex: '#6B7C45', finish: 'Matte',   cost_per_unit: 17, unit: 'liter', coverage_per_unit: 10 },
    { id: 'paint-hunter-green',    name: 'Hunter Green',        category: 'paint', color_hex: '#355E3B', finish: 'Satin',   cost_per_unit: 18, unit: 'liter', coverage_per_unit: 10 },
    { id: 'paint-forest',          name: 'Forest Green',        category: 'paint', color_hex: '#228B22', finish: 'Matte',   cost_per_unit: 18, unit: 'liter', coverage_per_unit: 10 },
    { id: 'paint-teal',            name: 'Deep Teal',           category: 'paint', color_hex: '#0D6B6B', finish: 'Satin',   cost_per_unit: 18, unit: 'liter', coverage_per_unit: 10 },
    { id: 'paint-navy',            name: 'Navy Blue',           category: 'paint', color_hex: '#1B3A5C', finish: 'Satin',   cost_per_unit: 18, unit: 'liter', coverage_per_unit: 10 },
    { id: 'paint-slate-blue',      name: 'Slate Blue',          category: 'paint', color_hex: '#5B7FA6', finish: 'Matte',   cost_per_unit: 17, unit: 'liter', coverage_per_unit: 10 },
    { id: 'paint-powder-blue',     name: 'Powder Blue',         category: 'paint', color_hex: '#B0C4DE', finish: 'Matte',   cost_per_unit: 16, unit: 'liter', coverage_per_unit: 10 },
    { id: 'paint-lilac',           name: 'Soft Lilac',          category: 'paint', color_hex: '#C8A0C8', finish: 'Matte',   cost_per_unit: 17, unit: 'liter', coverage_per_unit: 10 },
    { id: 'paint-light-grey',      name: 'Light Grey',          category: 'paint', color_hex: '#D1D5DB', finish: 'Matte',   cost_per_unit: 16, unit: 'liter', coverage_per_unit: 10 },
    { id: 'paint-mid-grey',        name: 'Mid Grey',            category: 'paint', color_hex: '#9CA3AF', finish: 'Satin',   cost_per_unit: 16, unit: 'liter', coverage_per_unit: 10 },
    { id: 'paint-charcoal',        name: 'Charcoal Grey',       category: 'paint', color_hex: '#36454F', finish: 'Satin',   cost_per_unit: 18, unit: 'liter', coverage_per_unit: 10 },
    { id: 'paint-graphite',        name: 'Graphite',            category: 'paint', color_hex: '#4B5563', finish: 'Satin',   cost_per_unit: 18, unit: 'liter', coverage_per_unit: 10 },
    { id: 'paint-black',           name: 'Matte Black',         category: 'paint', color_hex: '#1C1C1C', finish: 'Matte',   cost_per_unit: 19, unit: 'liter', coverage_per_unit: 10 },
    { id: 'paint-yellow-ochre',    name: 'Yellow Ochre',        category: 'paint', color_hex: '#C8962A', finish: 'Matte',   cost_per_unit: 17, unit: 'liter', coverage_per_unit: 10 },
    { id: 'paint-mustard',         name: 'Mustard',             category: 'paint', color_hex: '#E3A020', finish: 'Matte',   cost_per_unit: 17, unit: 'liter', coverage_per_unit: 10 },
    { id: 'paint-blush',           name: 'Blush Pink',          category: 'paint', color_hex: '#E8B4A0', finish: 'Matte',   cost_per_unit: 17, unit: 'liter', coverage_per_unit: 10 },
    { id: 'paint-dusty-rose',      name: 'Dusty Rose',          category: 'paint', color_hex: '#C47A7A', finish: 'Matte',   cost_per_unit: 17, unit: 'liter', coverage_per_unit: 10 },
  ],
  stone_cladding: [
    { id: 'stone-white-marble',    name: 'White Marble',        category: 'stone_cladding', color_hex: '#F5F0EC', finish: 'Polished',  cost_per_unit: 85,  unit: 'sqm', coverage_per_unit: 1 },
    { id: 'stone-limestone',       name: 'Limestone',           category: 'stone_cladding', color_hex: '#D4C5A9', finish: 'Honed',     cost_per_unit: 55,  unit: 'sqm', coverage_per_unit: 1 },
    { id: 'stone-sandstone',       name: 'Sandstone',           category: 'stone_cladding', color_hex: '#C2A870', finish: 'Natural',   cost_per_unit: 50,  unit: 'sqm', coverage_per_unit: 1 },
    { id: 'stone-travertine',      name: 'Travertine',          category: 'stone_cladding', color_hex: '#C8B49A', finish: 'Brushed',   cost_per_unit: 70,  unit: 'sqm', coverage_per_unit: 1 },
    { id: 'stone-slate',           name: 'Natural Slate',       category: 'stone_cladding', color_hex: '#708090', finish: 'Textured',  cost_per_unit: 45,  unit: 'sqm', coverage_per_unit: 1 },
    { id: 'stone-dark-slate',      name: 'Dark Slate',          category: 'stone_cladding', color_hex: '#3D4A52', finish: 'Textured',  cost_per_unit: 48,  unit: 'sqm', coverage_per_unit: 1 },
    { id: 'stone-basalt',          name: 'Basalt Black',        category: 'stone_cladding', color_hex: '#2C2F33', finish: 'Honed',     cost_per_unit: 60,  unit: 'sqm', coverage_per_unit: 1 },
    { id: 'stone-granite-grey',    name: 'Granite Grey',        category: 'stone_cladding', color_hex: '#808080', finish: 'Polished',  cost_per_unit: 75,  unit: 'sqm', coverage_per_unit: 1 },
    { id: 'stone-red-granite',     name: 'Red Granite',         category: 'stone_cladding', color_hex: '#8B4040', finish: 'Polished',  cost_per_unit: 80,  unit: 'sqm', coverage_per_unit: 1 },
    { id: 'stone-fieldstone',      name: 'Fieldstone',          category: 'stone_cladding', color_hex: '#9E8A6E', finish: 'Rustic',    cost_per_unit: 52,  unit: 'sqm', coverage_per_unit: 1 },
    { id: 'stone-cobblestone',     name: 'Cobblestone',         category: 'stone_cladding', color_hex: '#A09080', finish: 'Rustic',    cost_per_unit: 48,  unit: 'sqm', coverage_per_unit: 1 },
    { id: 'stone-quartzite',       name: 'White Quartzite',     category: 'stone_cladding', color_hex: '#E8E0D0', finish: 'Natural',   cost_per_unit: 90,  unit: 'sqm', coverage_per_unit: 1 },
  ],
  wood: [
    { id: 'wood-natural-pine',     name: 'Natural Pine',        category: 'panels', color_hex: '#E8C98A', finish: 'Natural',   cost_per_unit: 45,  unit: 'sqm', coverage_per_unit: 1 },
    { id: 'wood-light-oak',        name: 'Light Oak',           category: 'panels', color_hex: '#D4A86A', finish: 'Oiled',     cost_per_unit: 55,  unit: 'sqm', coverage_per_unit: 1 },
    { id: 'wood-cedar',            name: 'Cedar Slats',         category: 'panels', color_hex: '#8B5A2B', finish: 'Natural',   cost_per_unit: 65,  unit: 'sqm', coverage_per_unit: 1 },
    { id: 'wood-walnut',           name: 'Walnut',              category: 'panels', color_hex: '#5C3A1E', finish: 'Oiled',     cost_per_unit: 90,  unit: 'sqm', coverage_per_unit: 1 },
    { id: 'wood-ebony',            name: 'Ebony',               category: 'panels', color_hex: '#3B2314', finish: 'Polished',  cost_per_unit: 110, unit: 'sqm', coverage_per_unit: 1 },
    { id: 'wood-grey-wash',        name: 'Grey Wash',           category: 'panels', color_hex: '#9A9890', finish: 'Washed',    cost_per_unit: 60,  unit: 'sqm', coverage_per_unit: 1 },
    { id: 'wood-whitewash',        name: 'Whitewash',           category: 'panels', color_hex: '#EDE8E0', finish: 'Washed',    cost_per_unit: 55,  unit: 'sqm', coverage_per_unit: 1 },
    { id: 'wood-charred',          name: 'Charred (Shou Sugi)', category: 'panels', color_hex: '#1A1A1A', finish: 'Charred',   cost_per_unit: 95,  unit: 'sqm', coverage_per_unit: 1 },
    { id: 'wood-teak',             name: 'Teak',                category: 'panels', color_hex: '#A0724A', finish: 'Oiled',     cost_per_unit: 120, unit: 'sqm', coverage_per_unit: 1 },
    { id: 'wood-bamboo',           name: 'Bamboo Panel',        category: 'panels', color_hex: '#C8B878', finish: 'Natural',   cost_per_unit: 40,  unit: 'sqm', coverage_per_unit: 1 },
  ],
  railing: [
    { id: 'rail-glass',            name: 'Frameless Glass',     category: 'glass_railing',  color_hex: '#D0EBF5', finish: 'Transparent', cost_per_unit: 120, unit: 'meter', coverage_per_unit: 1 },
    { id: 'rail-frosted-glass',    name: 'Frosted Glass',       category: 'glass_railing',  color_hex: '#E8F4F8', finish: 'Frosted',     cost_per_unit: 130, unit: 'meter', coverage_per_unit: 1 },
    { id: 'rail-black-metal',      name: 'Black Aluminum',      category: 'metal_railing',  color_hex: '#1C1C1C', finish: 'Matte',       cost_per_unit: 80,  unit: 'meter', coverage_per_unit: 1 },
    { id: 'rail-white-metal',      name: 'White Aluminum',      category: 'metal_railing',  color_hex: '#F0F0F0', finish: 'Powder Coat', cost_per_unit: 75,  unit: 'meter', coverage_per_unit: 1 },
    { id: 'rail-bronze',           name: 'Bronze',              category: 'metal_railing',  color_hex: '#8C6940', finish: 'Brushed',     cost_per_unit: 100, unit: 'meter', coverage_per_unit: 1 },
    { id: 'rail-stainless',        name: 'Stainless Steel',     category: 'metal_railing',  color_hex: '#C0C8CC', finish: 'Brushed',     cost_per_unit: 95,  unit: 'meter', coverage_per_unit: 1 },
    { id: 'rail-iron-black',       name: 'Wrought Iron',        category: 'metal_railing',  color_hex: '#2A2A2A', finish: 'Painted',     cost_per_unit: 70,  unit: 'meter', coverage_per_unit: 1 },
    { id: 'rail-wood-teak',        name: 'Teak Handrail',       category: 'wood_railing',   color_hex: '#A0724A', finish: 'Oiled',       cost_per_unit: 90,  unit: 'meter', coverage_per_unit: 1 },
  ],
};
