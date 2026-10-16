export const handler = async () => {
  const response = await fetch('https://example.com');
  if (!response.ok) throw new Error(`Status ${response.status}`);
};
