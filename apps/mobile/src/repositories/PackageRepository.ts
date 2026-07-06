import type { Package } from '../domain';

export interface PackageRepository {
  getByExam(examId: string): Promise<Package[]>;
  getById(id: string): Promise<Package | null>;
  // All published packages across every exam — needed for the Packages
  // tab's cross-exam browse view.
  getAll(): Promise<Package[]>;
}
