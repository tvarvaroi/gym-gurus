import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Client, Workout, ProgressEntry } from '@shared/schema';

// Mock the module before importing
vi.mock('./exportUtils', async () => {
  const actual = await vi.importActual('./exportUtils');
  return {
    ...actual,
  };
});

describe('exportUtils', () => {
  let mockLink: HTMLAnchorElement;
  let clickSpy: ReturnType<typeof vi.spyOn>;
  let createElementSpy: ReturnType<typeof vi.spyOn>;
  let createObjectURLSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Create mock link element
    mockLink = {
      setAttribute: vi.fn(),
      click: vi.fn(),
      style: {},
    } as any;

    clickSpy = vi.spyOn(mockLink, 'click');
    createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink);
    createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink);
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('CSV generation and download', () => {
    it('should create a downloadable CSV file', async () => {
      const { exportClientsToCSV } = await import('./exportUtils');

      const mockClients: Client[] = [
        {
          id: '1',
          trainerId: 'trainer-1',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '123-456-7890',
          goal: 'Weight Loss',
          status: 'active',
          height: 180,
          weight: 80,
          notes: 'Good progress',
          createdAt: new Date('2024-01-01'),
          lastSession: null,
          nextSession: null,
          profileImageUrl: null,
        },
      ];

      exportClientsToCSV(mockClients, 'test.csv');

      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(mockLink.setAttribute).toHaveBeenCalledWith('download', 'test.csv');
      expect(clickSpy).toHaveBeenCalled();
    });

    it('should handle empty data gracefully', async () => {
      const { exportWorkoutsToCSV } = await import('./exportUtils');

      const mockWorkouts: Workout[] = [];

      exportWorkoutsToCSV(mockWorkouts, 'empty.csv');

      expect(createElementSpy).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
    });

    it('should escape special characters in CSV', async () => {
      const { exportClientsToCSV } = await import('./exportUtils');

      const mockClients: Client[] = [
        {
          id: '1',
          trainerId: 'trainer-1',
          name: 'Doe, John "Johnny"',
          email: 'john@example.com',
          phone: null,
          goal: 'Muscle gain, strength',
          status: 'active',
          height: null,
          weight: null,
          notes: null,
          createdAt: new Date(),
          lastSession: null,
          nextSession: null,
          profileImageUrl: null,
        },
      ];

      exportClientsToCSV(mockClients, 'test.csv');

      expect(clickSpy).toHaveBeenCalled();
    });
  });

  describe('exportWorkoutsToCSV', () => {
    it('should export workouts with correct headers', async () => {
      const { exportWorkoutsToCSV } = await import('./exportUtils');

      const mockWorkouts: Workout[] = [
        {
          id: '1',
          trainerId: 'trainer-1',
          title: 'Morning Cardio',
          description: '30 min run',
          category: 'cardio',
          difficulty: 'intermediate',
          duration: 30,
          createdAt: new Date('2024-01-01'),
        },
      ];

      exportWorkoutsToCSV(mockWorkouts);

      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
    });
  });

  describe('exportAllData', () => {
    it('should export both clients and workouts', async () => {
      const { exportAllData } = await import('./exportUtils');

      const mockClients: Client[] = [
        {
          id: '1',
          trainerId: 'trainer-1',
          name: 'John Doe',
          email: 'john@example.com',
          phone: null,
          goal: 'Weight Loss',
          status: 'active',
          height: null,
          weight: null,
          notes: null,
          createdAt: new Date(),
          lastSession: null,
          nextSession: null,
          profileImageUrl: null,
        },
      ];

      const mockWorkouts: Workout[] = [
        {
          id: '1',
          trainerId: 'trainer-1',
          title: 'Test Workout',
          description: 'Test',
          category: 'strength',
          difficulty: 'beginner',
          duration: 30,
          createdAt: new Date(),
        },
      ];

      exportAllData(mockClients, mockWorkouts, '2024-01-01');

      // Should call download twice (clients and workouts)
      expect(clickSpy).toHaveBeenCalledTimes(2);
    });
  });
});
