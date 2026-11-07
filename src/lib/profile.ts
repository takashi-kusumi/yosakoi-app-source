export const MAX_NAME_LENGTH = 30;

/** フルネームの入力を整える（前後の空白を除き、連続する空白は1つにまとめる）。不正ならnull */
export function normalizeFullName(value: FormDataEntryValue | null): string | null {
  const name = String(value ?? "")
    .replace(/[\s　]+/g, " ")
    .trim();
  if (name.length < 2 || name.length > MAX_NAME_LENGTH) return null;
  return name;
}
