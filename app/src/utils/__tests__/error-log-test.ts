import { describeError, logError } from '@/utils/error-log';

describe('describeError', () => {
  it('keeps the code and drops a message that can carry personal data', () => {
    const error = Object.assign(new Error('duplicate key (user_id, id)=(abc, place_1)'), {
      code: '23505',
      details: 'Key (id)=(place_1) already exists.',
    });

    expect(describeError(error)).toEqual({ name: 'Error', code: '23505', status: undefined });
  });

  it('drops a file path from a file system error', () => {
    const error = new Error('File file:///private/var/mobile/photo_1.jpg is not readable');

    expect(JSON.stringify(describeError(error))).not.toContain('photo_1');
  });

  it('keeps the status of a Supabase or HTTP error', () => {
    expect(describeError({ name: 'StorageApiError', statusCode: '403', message: 'secret path' })).toEqual({
      name: 'StorageApiError',
      code: undefined,
      status: '403',
    });
  });

  it('handles values that are not objects', () => {
    expect(describeError('offline')).toEqual({ name: 'string' });
    expect(describeError(null)).toEqual({ name: 'object' });
  });
});

describe('logError', () => {
  it('writes only the described fields', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    logError('[test] failed:', Object.assign(new Error('memo text'), { code: 'PGRST303' }));

    expect(consoleError).toHaveBeenCalledWith('[test] failed:', { name: 'Error', code: 'PGRST303', status: undefined });
    consoleError.mockRestore();
  });
});
