"use strict";

/**
 * BoxSafe Safety & Routing Agent
 *
 * Evaluates route-safety information and produces
 * a recommended action for the BoxSafe navigation system.
 */

function safetyRoutingAgent({
  truckProfile = {},
  lowBridgeWarnings = [],
  routeWarnings = [],
} = {}) {
  const heightMm = Number(truckProfile.heightMm || 0);

  const dangerousBridges = lowBridgeWarnings.filter((bridge) => {
    const clearanceMm = Number(bridge.bridgeClearanceMm || 0);

    return (
      heightMm > 0 &&
      clearanceMm > 0 &&
      heightMm > clearanceMm
    );
  });

  if (dangerousBridges.length > 0) {
    return {
      status: "DANGER",
      action: "REROUTE",
      message: "Unsafe bridge clearance detected. Rerouting required.",
      dangerousBridges,
    };
  }

  if (routeWarnings.length > 0) {
    return {
      status: "CAUTION",
      action: "REVIEW_ROUTE",
      message: "Route warnings detected. Review route before proceeding.",
      routeWarnings,
    };
  }

  return {
    status: "SAFE",
    action: "CONTINUE",
    message: "No known clearance conflict detected on the evaluated route.",
  };
}

module.exports = {
  safetyRoutingAgent,
};
