/**
 * Fetch external documentation and save to _brain/resources/
 * Usage: npx ts-node _brain/scripts/fetch-resource.ts <url> <topic-name>
 * Example: npx ts-node _brain/scripts/fetch-resource.ts https://drizzle.team/docs drizzle-orm-docs
 */

import fs from 'fs';
import path from 'path';

const [, , url, topicName] = process.argv;

if (!url || !topicName) {
  console.error('Usage: fetch-resource.ts <url> <topic-name>');
  process.exit(1);
}

async function fetchAndSave() {
  const res = await fetch(url);
  const html = await res.text();

  // Strip HTML tags for readable markdown storage
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const content = `# ${topicName}\n\nSource: ${url}\nFetched: ${new Date().toISOString()}\n\n---\n\n${text}`;

  const outputPath = path.join('_brain/resources', `${topicName}.md`);
  fs.writeFileSync(outputPath, content);
  console.log(`Saved to ${outputPath}`);

  // Auto-update resources index
  const indexPath = '_brain/maps/resources-index.md';
  const index = fs.readFileSync(indexPath, 'utf-8');
  const updated = index.replace(
    '<!-- entries added automatically by Claude Code when fetching docs -->',
    `- [[resources/${topicName}]] — fetched ${new Date().toLocaleDateString()}\n<!-- entries added automatically by Claude Code when fetching docs -->`
  );
  fs.writeFileSync(indexPath, updated);
}

fetchAndSave().catch(console.error);
