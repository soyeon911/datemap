// Error objects can carry whatever their source put in them: a file:// photo path
// from the file system, or row values from a database constraint message. The
// app's security rules keep photo URIs and personal data out of logs, so only
// the fields that identify the kind of failure are kept.
export function describeError(error: unknown) {
  if (typeof error !== 'object' || error === null) {
    return { name: typeof error };
  }

  const { name, code, status, statusCode } = error as Record<string, unknown>;

  return {
    name: typeof name === 'string' ? name : undefined,
    code: typeof code === 'string' || typeof code === 'number' ? code : undefined,
    status: [status, statusCode].find((value) => typeof value === 'number' || typeof value === 'string'),
  };
}

export function logError(label: string, error: unknown) {
  console.error(label, describeError(error));
}
