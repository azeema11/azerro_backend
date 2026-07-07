import { IBrokerService } from "./types";
import { indmoneyService } from "./indmoney.service";

const services: Record<string, IBrokerService> = {};

/**
 * Resolves and returns the requested broker service instance.
 * Implements a registry/factory pattern using clean functional exports.
 */
export function getBrokerService(broker: string): IBrokerService {
  const b = broker.toLowerCase();
  if (b === "indmoney") {
    if (!services[b]) {
      services[b] = indmoneyService;
    }
    return services[b];
  }
  throw new Error(`Broker '${broker}' is not supported.`);
}
