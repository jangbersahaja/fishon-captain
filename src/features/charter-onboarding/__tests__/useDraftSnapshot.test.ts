import { renderHook, act } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDraftSnapshot } from '@features/charter-onboarding/hooks/useDraftSnapshot';
import { charterFormSchema, type CharterFormValues } from '@features/charter-onboarding/charterForm.schema';
import { zodResolver } from '@hookform/resolvers/zod';

// Minimal form defaults replicating other tests (subset ok)
const makeDefaults = (): CharterFormValues => ({
  operator: {
    displayName: 'Cap',
    experienceYears: 1,
    bio: 'Long enough biography that passes validation with more than forty chars.',
    phone: '+6000000000',
    avatar: undefined,
  },
  charterType: 'shared',
  charterName: 'Boat',
  state: 'Selangor',
  city: 'Shah Alam',
  startingPoint: 'Dock',
  postcode: '40000',
  latitude: 1,
  longitude: 1,
  description: 'Description that is certainly over forty characters long for schema.',
  generatedDescription: undefined,
  tone: 'friendly',
  boat: { name: 'Boat', type: 'Center', lengthFeet: 25, capacity: 4, features: ['GPS'] },
  amenities: ['Rods'],
  policies: {
    licenseProvided: true,
    catchAndKeep: true,
    catchAndRelease: true,
    childFriendly: true,
    liveBaitProvided: true,
    alcoholNotAllowed: true,
    smokingNotAllowed: true,
  },
  pickup: { available: false, fee: null, areas: [], notes: '' },
  trips: [
    { name: 'Half Day', tripType: 'inshore', price: 300, durationHours: 4, startTimes: ['07:00'], maxAnglers: 4, charterStyle: 'private', description: 'Trip', species: [], techniques: [] }
  ],
  photos: [],
  videos: [],
});

describe('useDraftSnapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setup = (opts: { isEditing: boolean; draftId: string | null; version: number | null; step?: number }) => {
    const form = renderHook(() => useForm<CharterFormValues>({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resolver: zodResolver(charterFormSchema) as any,
      defaultValues: makeDefaults(),
      mode: 'onBlur'
    })).result.current;

    const setServerVersion = vi.fn();
    const setLastSavedAt = vi.fn();
    const setServerSaving = vi.fn();

    return {
      form,
      hook: renderHook(() => useDraftSnapshot({
        form: form as unknown as ReturnType<typeof useForm<CharterFormValues>>,
        isEditing: opts.isEditing,
        serverDraftId: opts.draftId,
        serverVersion: opts.version,
        currentStep: opts.step ?? 0,
        setServerVersion,
        setLastSavedAt,
        setServerSaving,
      })),
      setServerVersion,
      setLastSavedAt,
      setServerSaving
    };
  };

  it('returns null and does not call fetch when editing', async () => {
    global.fetch = vi.fn();
    const { hook } = setup({ isEditing: true, draftId: 'd1', version: 3 });
    const result = await act(async () => await hook.result.current.saveServerDraftSnapshot());
    expect(result).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns null and does not call fetch when draft id missing', async () => {
    global.fetch = vi.fn();
    const { hook } = setup({ isEditing: false, draftId: null, version: 2 });
    const result = await act(async () => await hook.result.current.saveServerDraftSnapshot());
    expect(result).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('PATCHes and updates version + timestamps on success', async () => {
    const newVersion = 7;
    global.fetch = vi.fn(async () => new Response(JSON.stringify({ draft: { id: 'd1', version: newVersion } }), { status: 200, headers: { 'Content-Type': 'application/json' } })) as unknown as typeof fetch;
    const { hook, setServerVersion, setLastSavedAt, setServerSaving } = setup({ isEditing: false, draftId: 'd1', version: 6, step: 2 });
    const result = await act(async () => await hook.result.current.saveServerDraftSnapshot());
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/charter-drafts\/d1$/),
      expect.objectContaining({ method: 'PATCH' })
    );
    expect(result).toBe(newVersion);
    expect(setServerVersion).toHaveBeenCalledWith(newVersion);
    expect(setLastSavedAt).toHaveBeenCalledWith(expect.any(String));
    // setServerSaving should be true then false; we just assert it was invoked
    expect(setServerSaving).toHaveBeenCalled();
  });

  it('gracefully returns null on fetch failure', async () => {
    global.fetch = vi.fn(async () => { throw new Error('net'); }) as unknown as typeof fetch;
    const { hook } = setup({ isEditing: false, draftId: 'd1', version: 3 });
    const result = await act(async () => await hook.result.current.saveServerDraftSnapshot());
    expect(result).toBeNull();
  });
});
