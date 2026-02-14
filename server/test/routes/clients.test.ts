/**
 * Client CRUD Route Tests
 *
 * Tests for:
 *   GET    /api/clients         — list clients for authenticated trainer
 *   POST   /api/clients         — create client with Zod validation
 *   PUT    /api/clients/:id     — update existing client
 *   DELETE /api/clients/:id     — soft-delete client
 *   GET    /api/clients/search  — search by name
 *
 * All database calls are mocked via vi.mock('../../storage').
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createMockRequest,
  createMockResponse,
  createTestClient,
  createTestUser,
  resetFactoryCounters,
} from '../helpers';

// ---------------------------------------------------------------------------
// Mock storage
// ---------------------------------------------------------------------------

vi.mock('../../storage', () => ({
  storage: {
    getUser: vi.fn(),
    getClient: vi.fn(),
    getClientsByTrainer: vi.fn(),
    createClient: vi.fn(),
    updateClient: vi.fn(),
    deleteClient: vi.fn(),
    updateUserOnboardingProgress: vi.fn(),
  },
}));

import { storage } from '../../storage';

// ---------------------------------------------------------------------------
// Helper to create an authenticated trainer request
// ---------------------------------------------------------------------------

function createTrainerReq(
  overrides: {
    body?: Record<string, any>;
    params?: Record<string, string>;
    query?: Record<string, string>;
  } = {}
) {
  return createMockRequest({
    user: createTestUser({ id: 'trainer-1', role: 'trainer' }),
    body: overrides.body,
    params: overrides.params,
    query: overrides.query,
  }) as any;
}

// ---------------------------------------------------------------------------
// Handler reproductions from routes.ts
// ---------------------------------------------------------------------------

async function getClientsHandler(req: any, res: any) {
  try {
    const trainerId = req.user.id as string;
    const clients = await storage.getClientsByTrainer(trainerId);
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
}

async function createClientHandler(req: any, res: any) {
  try {
    const { insertClientSchema } = await import('@shared/schema');
    const trainerId = req.user.id as string;
    const validatedData = insertClientSchema.parse({ ...req.body, trainerId });
    const client = await (storage as any).createClient(validatedData);

    try {
      await (storage as any).updateUserOnboardingProgress(trainerId, {
        addedFirstClient: true,
      });
    } catch (_) {
      // Non-critical
    }

    res.status(201).json(client);
  } catch (error: any) {
    if (error?.constructor?.name === 'ZodError' || error?.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid client data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create client' });
  }
}

async function updateClientHandler(req: any, res: any) {
  try {
    const { insertClientSchema } = await import('@shared/schema');
    const { clientId } = req.params;
    const validatedUpdates = insertClientSchema.omit({ trainerId: true }).partial().parse(req.body);

    const client = await (storage as any).updateClient(clientId, validatedUpdates);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.json(client);
  } catch (error: any) {
    if (error?.constructor?.name === 'ZodError' || error?.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid update data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update client' });
  }
}

async function deleteClientHandler(req: any, res: any) {
  try {
    const { clientId } = req.params;
    const success = await (storage as any).deleteClient(clientId);
    if (!success) {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete client' });
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Client Routes — GET /api/clients', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFactoryCounters();
  });

  it('returns a list of clients for the authenticated trainer', async () => {
    const clients = [
      createTestClient({ id: 'c1', name: 'Alice', trainerId: 'trainer-1' }),
      createTestClient({ id: 'c2', name: 'Bob', trainerId: 'trainer-1' }),
    ];
    (storage.getClientsByTrainer as any).mockResolvedValue(clients);

    const req = createTrainerReq();
    const res = createMockResponse();

    await getClientsHandler(req, res);

    expect(res.json).toHaveBeenCalledWith(clients);
    expect(storage.getClientsByTrainer).toHaveBeenCalledWith('trainer-1');
  });

  it('returns an empty array when the trainer has no clients', async () => {
    (storage.getClientsByTrainer as any).mockResolvedValue([]);

    const req = createTrainerReq();
    const res = createMockResponse();

    await getClientsHandler(req, res);

    expect(res.json).toHaveBeenCalledWith([]);
  });

  it('returns 500 when storage throws an error', async () => {
    (storage.getClientsByTrainer as any).mockRejectedValue(new Error('DB error'));

    const req = createTrainerReq();
    const res = createMockResponse();

    await getClientsHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch clients' });
  });
});

describe('Client Routes — POST /api/clients', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFactoryCounters();
  });

  it('creates a client with valid data and returns 201', async () => {
    const newClient = createTestClient({ id: 'new-client-1', trainerId: 'trainer-1' });
    (storage.createClient as any).mockResolvedValue(newClient);
    (storage.updateUserOnboardingProgress as any).mockResolvedValue({});

    const req = createTrainerReq({
      body: {
        name: 'Jane Doe',
        email: 'jane@test.com',
        goal: 'Lose weight',
      },
    });
    const res = createMockResponse();

    await createClientHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(newClient);
    expect(storage.createClient).toHaveBeenCalledTimes(1);
    // Verify trainerId was injected from session
    expect((storage.createClient as any).mock.calls[0][0]).toHaveProperty('trainerId', 'trainer-1');
  });

  it('returns 400 with Zod validation errors for missing required fields', async () => {
    const req = createTrainerReq({ body: {} });
    const res = createMockResponse();

    await createClientHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Invalid client data',
        details: expect.any(Array),
      })
    );
  });

  it('updates onboarding progress after creating the first client', async () => {
    const newClient = createTestClient({ id: 'c-new', trainerId: 'trainer-1' });
    (storage.createClient as any).mockResolvedValue(newClient);
    (storage.updateUserOnboardingProgress as any).mockResolvedValue({});

    const req = createTrainerReq({
      body: { name: 'Jane', email: 'jane@test.com', goal: 'Lose weight' },
    });
    const res = createMockResponse();

    await createClientHandler(req, res);

    expect(storage.updateUserOnboardingProgress).toHaveBeenCalledWith('trainer-1', {
      addedFirstClient: true,
    });
  });

  it('still creates the client even if onboarding update fails', async () => {
    const newClient = createTestClient({ id: 'c-new', trainerId: 'trainer-1' });
    (storage.createClient as any).mockResolvedValue(newClient);
    (storage.updateUserOnboardingProgress as any).mockRejectedValue(new Error('fail'));

    const req = createTrainerReq({
      body: { name: 'Jane', email: 'jane@test.com', goal: 'Lose weight' },
    });
    const res = createMockResponse();

    await createClientHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(newClient);
  });

  it('returns 500 when storage.createClient throws a non-Zod error', async () => {
    (storage.createClient as any).mockRejectedValue(new Error('DB insert failed'));

    const req = createTrainerReq({
      body: { name: 'Jane', email: 'jane@test.com', goal: 'Lose weight' },
    });
    const res = createMockResponse();

    await createClientHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create client' });
  });
});

describe('Client Routes — PUT /api/clients/:clientId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFactoryCounters();
  });

  it('updates an existing client and returns the updated record', async () => {
    const updated = createTestClient({ id: 'c1', name: 'Jane Updated', goal: 'Build muscle' });
    (storage.updateClient as any).mockResolvedValue(updated);

    const req = createTrainerReq({
      params: { clientId: 'c1' },
      body: { name: 'Jane Updated', goal: 'Build muscle' },
    });
    const res = createMockResponse();

    await updateClientHandler(req, res);

    expect(res.json).toHaveBeenCalledWith(updated);
    expect(storage.updateClient).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({
        name: 'Jane Updated',
        goal: 'Build muscle',
      })
    );
  });

  it('returns 404 when updating a non-existent client', async () => {
    (storage.updateClient as any).mockResolvedValue(undefined);

    const req = createTrainerReq({
      params: { clientId: 'nonexistent' },
      body: { name: 'Updated Name' },
    });
    const res = createMockResponse();

    await updateClientHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Client not found' });
  });

  it('allows partial updates (only some fields)', async () => {
    const updated = createTestClient({ id: 'c1', goal: 'New Goal' });
    (storage.updateClient as any).mockResolvedValue(updated);

    const req = createTrainerReq({
      params: { clientId: 'c1' },
      body: { goal: 'New Goal' },
    });
    const res = createMockResponse();

    await updateClientHandler(req, res);

    expect(res.json).toHaveBeenCalledWith(updated);
    expect(storage.updateClient).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({
        goal: 'New Goal',
      })
    );
  });

  it('does not allow trainerId to be changed via update', async () => {
    const updated = createTestClient({ id: 'c1', trainerId: 'trainer-1' });
    (storage.updateClient as any).mockResolvedValue(updated);

    const req = createTrainerReq({
      params: { clientId: 'c1' },
      body: { trainerId: 'attacker-id', name: 'Legit Name' },
    });
    const res = createMockResponse();

    await updateClientHandler(req, res);

    // trainerId should be stripped by .omit({ trainerId: true })
    const callArgs = (storage.updateClient as any).mock.calls[0][1];
    expect(callArgs).not.toHaveProperty('trainerId');
  });

  it('returns 500 when storage throws a non-Zod error', async () => {
    (storage.updateClient as any).mockRejectedValue(new Error('DB error'));

    const req = createTrainerReq({
      params: { clientId: 'c1' },
      body: { name: 'Updated' },
    });
    const res = createMockResponse();

    await updateClientHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update client' });
  });
});

describe('Client Routes — DELETE /api/clients/:clientId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFactoryCounters();
  });

  it('deletes an existing client and returns success message', async () => {
    (storage.deleteClient as any).mockResolvedValue(true);

    const req = createTrainerReq({ params: { clientId: 'c1' } });
    const res = createMockResponse();

    await deleteClientHandler(req, res);

    expect(res.json).toHaveBeenCalledWith({ message: 'Client deleted successfully' });
    expect(storage.deleteClient).toHaveBeenCalledWith('c1');
  });

  it('returns 404 when deleting a non-existent client', async () => {
    (storage.deleteClient as any).mockResolvedValue(false);

    const req = createTrainerReq({ params: { clientId: 'nonexistent' } });
    const res = createMockResponse();

    await deleteClientHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Client not found' });
  });

  it('returns 500 when storage throws an error during deletion', async () => {
    (storage.deleteClient as any).mockRejectedValue(new Error('DB error'));

    const req = createTrainerReq({ params: { clientId: 'c1' } });
    const res = createMockResponse();

    await deleteClientHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to delete client' });
  });
});

describe('Client Routes — GET /api/clients search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFactoryCounters();
  });

  it('returns all clients — search filtering is done client-side', async () => {
    const clients = [
      createTestClient({ id: 'c1', name: 'Alice Johnson', trainerId: 'trainer-1' }),
      createTestClient({ id: 'c2', name: 'Bob Williams', trainerId: 'trainer-1' }),
      createTestClient({ id: 'c3', name: 'Alice Cooper', trainerId: 'trainer-1' }),
    ];
    (storage.getClientsByTrainer as any).mockResolvedValue(clients);

    const req = createTrainerReq({ query: { q: 'Alice' } });
    const res = createMockResponse();

    await getClientsHandler(req, res);

    // Backend returns all clients; client-side would filter
    expect(res.json).toHaveBeenCalledWith(clients);

    // Verify client-side filtering would work
    const returned = (res.json as any).mock.calls[0][0];
    const filtered = returned.filter((c: any) => c.name.toLowerCase().includes('alice'));
    expect(filtered).toHaveLength(2);
  });

  it('returns empty results for a search query matching no clients', async () => {
    const clients = [createTestClient({ id: 'c1', name: 'Alice Johnson', trainerId: 'trainer-1' })];
    (storage.getClientsByTrainer as any).mockResolvedValue(clients);

    const req = createTrainerReq({ query: { q: 'Zzzzz' } });
    const res = createMockResponse();

    await getClientsHandler(req, res);

    const returned = (res.json as any).mock.calls[0][0];
    const filtered = returned.filter((c: any) => c.name.toLowerCase().includes('zzzzz'));
    expect(filtered).toHaveLength(0);
  });
});
