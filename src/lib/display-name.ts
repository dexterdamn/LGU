export function getAuthorDisplayName(author: {
  nickname?: string | null;
  name: string;
}): string {
  return author.nickname?.trim() || author.name;
}
