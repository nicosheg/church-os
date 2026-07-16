import Fuse from 'fuse.js';

export function matchNamesToMembers(extractedNames, members, threshold = 0.6) {
  // members is array of { id, first_name, last_name }
  const fuse = new Fuse(members, {
    keys: ['first_name', 'last_name'],
    includeScore: true,
    threshold: 0.6,
  });

  const presentIds = new Set();
  const unmatched = [];

  for (const name of extractedNames) {
    const fullName = `${name.first_name} ${name.last_name}`.trim();
    if (!fullName) continue;
    const result = fuse.search(fullName);
    if (result.length > 0 && result[0].score <= threshold) {
      presentIds.add(result[0].item.id);
    } else {
      unmatched.push(fullName);
    }
  }
  return { presentIds: [...presentIds], unmatched };
}
