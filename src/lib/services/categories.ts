export const serviceCategories = ["massage", "face_care", "brows_lashes", "permanent_makeup"] as const;

export type ServiceCategory = (typeof serviceCategories)[number];

export function isServiceCategory(value: string | null | undefined): value is ServiceCategory {
  return serviceCategories.includes(value as ServiceCategory);
}
