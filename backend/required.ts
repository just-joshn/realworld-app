export const required = <T>(value: T | undefined | null, name: string): T => {
  if (value === undefined || value === null) {
    throw new Error(`Missing ${name}`);
  }
  return value;
};
