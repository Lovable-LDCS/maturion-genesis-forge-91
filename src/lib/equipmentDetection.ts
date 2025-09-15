// Equipment detection utilities for diamond processing training slides
export const DIAMOND_EQUIPMENT = {
  'crusher-jaw': { name: 'Jaw Crusher', keywords: ['jaw crusher', 'primary crusher', 'jaw crushing'] },
  'crusher-cone': { name: 'Cone Crusher', keywords: ['cone crusher', 'secondary crusher', 'cone crushing'] },
  'dms-cyclone': { name: 'DMS Cyclone', keywords: ['dms', 'dense media separation', 'cyclone', 'density separation'] },
  'xrt-sorter': { name: 'XRT Sorter', keywords: ['xrt', 'x-ray transmission', 'optical sorting', 'automated sorting'] },
  'banana-screen': { name: 'Banana Screen', keywords: ['banana screen', 'vibrating screen', 'screening'] },
  'grease-belt': { name: 'Grease Belt', keywords: ['grease belt', 'adhesion belt', 'belt concentration'] },
  'pan-conveyor': { name: 'Pan Conveyor', keywords: ['pan conveyor', 'conveyor belt', 'material transport'] },
  'wash-plant': { name: 'Wash Plant', keywords: ['wash plant', 'washing', 'scrubbing'] },
  'jigging-machine': { name: 'Jigging Machine', keywords: ['jig', 'jigging', 'gravity separation'] },
  'recovery-plant': { name: 'Recovery Plant', keywords: ['recovery plant', 'diamond recovery', 'final recovery'] }
} as const;

export function detectEquipment(text: string): string[] {
  const detectedEquipment: string[] = [];
  const lowerText = text.toLowerCase();
  
  Object.entries(DIAMOND_EQUIPMENT).forEach(([slug, equipment]) => {
    const hasMatch = equipment.keywords.some(keyword => 
      lowerText.includes(keyword.toLowerCase())
    );
    if (hasMatch) {
      detectedEquipment.push(slug);
    }
  });
  
  return detectedEquipment;
}

export function determineStageFromContent(text: string): string {
  const lowerText = text.toLowerCase();
  
  // Stage detection based on content keywords
  if (lowerText.includes('exploration') || lowerText.includes('prospect')) return 'exploration';
  if (lowerText.includes('mining') || lowerText.includes('extraction')) return 'mining';
  if (lowerText.includes('processing') || lowerText.includes('crusher') || lowerText.includes('dms')) return 'processing';
  if (lowerText.includes('sorting') || lowerText.includes('xrt') || lowerText.includes('optical')) return 'sorting';
  if (lowerText.includes('selling') || lowerText.includes('marketing') || lowerText.includes('retail')) return 'selling';
  
  return 'processing'; // Default stage
}

export function generateTrainingSlideTitle(fileName: string, stage: string): string {
  const baseName = fileName.replace(/\.(pptm|pptx)$/i, '').replace(/[-_]/g, ' ');
  return `Training – ${stage.charAt(0).toUpperCase() + stage.slice(1)} – ${baseName}`;
}