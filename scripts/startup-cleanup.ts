export async function closeOnStartupFailure<T>(resource: { close(): Promise<void> }, initialize: () => Promise<T>): Promise<T> {
  try { return await initialize(); }
  catch (error) { await resource.close(); throw error; }
}