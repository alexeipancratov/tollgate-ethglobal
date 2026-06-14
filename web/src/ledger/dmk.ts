// The single Device Management Kit instance (one per app). Created lazily and
// reused. The DMK skills warn against a module singleton *in React render* (double
// instances); this lives outside React's render cycle, held by the singleton
// LedgerSigner, so there is exactly one instance.
import {
  DeviceManagementKitBuilder,
  type DeviceManagementKit,
} from "@ledgerhq/device-management-kit";
import { webHidTransportFactory } from "@ledgerhq/device-transport-kit-web-hid";

let instance: DeviceManagementKit | null = null;

export function getDmk(): DeviceManagementKit {
  if (!instance) {
    instance = new DeviceManagementKitBuilder().addTransport(webHidTransportFactory).build();
  }
  return instance;
}
