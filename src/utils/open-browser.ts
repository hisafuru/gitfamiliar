export async function openBrowser(filePath: string): Promise<void> {
  try {
    const open = await import('open');
    await open.default(filePath);
  } catch {
    console.log(`Could not open browser automatically. Open this file manually:`);
    console.log(`  ${filePath}`);
  }
}
