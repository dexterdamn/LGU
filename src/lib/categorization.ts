export interface TagResult {
  tags: string[];
}

export function autoDetectTags(
  title: string,
  rowHeaderLabels: string[],
  colHeaderLabels: string[]
): TagResult {
  const searchText = [title, ...rowHeaderLabels, ...colHeaderLabels].join(" ").toLowerCase();
  const tags: string[] = [];

  const hasSex =
    /sex|gender|male|female/i.test(searchText);
  const hasBarangay = /barangay|brgy/i.test(searchText);

  if (hasSex) tags.push("#gad", "#sex-disaggregated");
  if (hasBarangay) tags.push("#barangay-level");
  if (searchText.includes("population")) tags.push("#demographic");
  if (searchText.includes("health")) tags.push("#health");
  if (searchText.includes("education") || searchText.includes("literacy")) tags.push("#education");

  return { tags: [...new Set(tags)] };
}

export const COMMON_TAGS = [
  "#gad",
  "#sex-disaggregated",
  "#barangay-level",
  "#demographic",
  "#health",
  "#education",
  "#annual",
  "#quarterly",
  "#monthly",
  "#baseline",
  "#indicator",
];

export const DEFAULT_CATEGORIES = [
  "Social Sector",
  "Environment Sector",
  "Institutional Sector",
  "Infrastructure Sector",
  "Economic Sector",
];

export const DEFAULT_SUBCATEGORIES: Record<string, string[]> = {
  "Social Sector": ["Health", "Education", "Population", "Social Welfare", "Gender & Development", "General"],
  "Environment Sector": ["Natural Resources", "Waste Management", "Disaster Risk", "Climate & Air", "General"],
  "Institutional Sector": ["Governance", "Finance", "Personnel", "Local Legislation", "General"],
  "Infrastructure Sector": ["Roads", "Utilities", "Facilities", "Transport", "General"],
  "Economic Sector": ["Business", "Agriculture", "Fisheries", "Employment", "Tourism", "Livelihood", "General"],
};

// Legacy helpers for pages still referencing sector labels
export const SECTOR_LABELS: Record<string, string> = {
  SOCIAL: "Social Sector",
  ENVIRONMENT: "Environment Sector",
  INSTITUTIONAL: "Institutional Sector",
  INFRASTRUCTURE: "Infrastructure Sector",
  ECONOMIC: "Economic Sector",
};

export function formatSectorLabel(sector: string): string {
  return SECTOR_LABELS[sector] || sector;
}
