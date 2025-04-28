/**
 * Creates a delay/timeout that works with the FiveM environment
 * @param {number} ms - The number of milliseconds to delay
 * @returns {Promise<void>}
 */
export function Delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
