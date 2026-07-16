import Fuse from 'fuse.js';

export function matchNamesToMembers(extractedNames, members, threshold = 0.6) {
  const fuse = new Fuse(members, {
    keys: ['first_name', 'last_name'],
    threshold,
    distance: 100,
  });

  const presentIds = new Set();
  const unmatched = [];

  for (const name of extractedNames) {
    const full = `${name.first_name} ${name.last_name}`.trim();
    if (!full) continue;
    const results = fuse.search(full);
    if (results.length > 0 && results[0].score <= threshold) {
      presentIds.add(results[0].item.id);
    } else {
      unmatched.push(full);
    }
  }

  return { presentIds: [...presentIds], unmatched };
                     }
