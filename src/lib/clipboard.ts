// Copies the text of a Code block. The Module runs in a sandboxed iframe with an opaque origin, which the Host does not
// grant `clipboard-write`: the asynchronous clipboard API may refuse, so `execCommand("copy")` is tried next. When
// neither copies, the code is selected, so that the User copies it with the keyboard instead of nothing happening.

export type CopyOutcome = "copied" | "selected";

export async function copyCode(text: string, element: HTMLElement): Promise<CopyOutcome> {
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    // Refused by the permissions policy of the iframe: try the older way.
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.append(area);
  area.select();
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    // Unsupported: the code is selected below.
  }
  area.remove();
  if (copied) return "copied";
  const range = document.createRange();
  range.selectNodeContents(element);
  const selection = getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  return "selected";
}
