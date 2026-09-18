// Synthetic identities for isolated tests only; never load the developer's .env.
export async function seedTestUsers(database, issuer) {
  const users = [];
  for (const subject of ['auth0|demo-reader-a', 'auth0|demo-reader-b']) {
    users.push(await database.user.upsert({
      where: { issuer_subject: { issuer, subject } }, create: { issuer, subject }, update: {},
    }));
  }
  return users;
}
