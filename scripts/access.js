/**
 * Return whether a user is a Lightkeeper audience member: Assistant or GM.
 * Foundry v14 exposes CONST.USER_ROLES.ASSISTANT (3) and User#hasRole().
 * The fallbacks keep the module inert rather than admitting players if globals
 * are unavailable during an unusual boot or test environment.
 */
export function isLightkeeperUser(user = globalThis.game?.user) {
  if (!user) return false;

  const assistantRole = globalThis.CONST?.USER_ROLES?.ASSISTANT;
  if (Number.isInteger(assistantRole)) {
    if (typeof user.hasRole === "function") return user.hasRole(assistantRole);
    return Number.isFinite(user.role) && user.role >= assistantRole;
  }

  // v14 User#hasRole also accepts the stable role name without CONST.
  if (typeof user.hasRole === "function") return user.hasRole("ASSISTANT");
  return user.isGM === true;
}

/** Return whether a user is exactly a Foundry Game Master, not an Assistant. */
export function isWorldSettingsGM(user = globalThis.game?.user) {
  if (!user) return false;

  const gameMasterRole = globalThis.CONST?.USER_ROLES?.GAMEMASTER;
  if (Number.isInteger(gameMasterRole)) {
    if (typeof user.hasRole === "function") return user.hasRole(gameMasterRole, {exact: true});
    return user.role === gameMasterRole;
  }

  if (typeof user.hasRole === "function") return user.hasRole("GAMEMASTER", {exact: true});
  return false;
}
