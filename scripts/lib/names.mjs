// Naming helpers: human-readable names derived from Kotlin identifiers.

/** Splits a camel-case identifier into words: "TaskDetailsOpen" -> ["Task", "Details", "Open"]. */
export function words(identifier) {
  return identifier.match(/[A-Z]+(?![a-z])|[A-Z]?[a-z]+|\d+/g) || [identifier];
}

/** "TaskDetailsScreen" -> "Task Details Screen". */
export function prettyName(identifier) {
  return words(identifier).join(' ');
}

/**
 * Labels for the states of one screen, from its preview function names: the words shared by all
 * names and the "Preview" suffix are removed.
 * ["TaskDetailsOpenPreview", "TaskDetailsDonePreview"] -> ["Open", "Done"].
 */
export function stateLabels(functionNames) {
  const split = functionNames.map((f) => words(f.replace(/Preview\d*$/, '')));
  let common = 0;
  if (split.length > 1) {
    while (split.every((w) => w.length > common + 1 && w[common] === split[0][common])) common++;
  }
  return split.map((w) => {
    const rest = w.slice(common).join(' ');
    return split.length === 1 || !rest ? 'Default' : rest;
  });
}
