const HASHES: Record<string, string> = {
  youmingyi: "8182d2e0103b49f84c1d53b06a4c48faba40eedc1c5d175656d9e2bfbbdeddb9",
  liuzhiyu: "c0e7637838e421a730197d4008ce689b6f42f3dace0ab8b51f8f5fe6807e206b",
  BuchholzPaul: "24dda22c2f31b8f1fec39cdf1040a0375b962203b288d07f1cac8398d856d047",
};
export async function validUser(username: string, password: string) {
  if (!Object.prototype.hasOwnProperty.call(HASHES, username)) return false;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`qi-admin-v1:${password}`));
  const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  return hash === HASHES[username];
}
