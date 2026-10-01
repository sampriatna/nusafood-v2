import { describe, expect, it } from "vitest";
import { isTrustedPushEndpoint } from "./web-push.service";

describe("isTrustedPushEndpoint", () => {
  it("accepts official browser push services", () => {
    expect(isTrustedPushEndpoint("https://fcm.googleapis.com/fcm/send/abc")).toBe(true);
    expect(isTrustedPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/x")).toBe(true);
    expect(isTrustedPushEndpoint("https://web.push.apple.com/abc")).toBe(true);
    expect(isTrustedPushEndpoint("https://wns2-par02p.notify.windows.com/w/?token=1")).toBe(true);
  });
  it("rejects arbitrary or look-alike hosts", () => {
    expect(isTrustedPushEndpoint("https://evil.example.com/x")).toBe(false);
    expect(isTrustedPushEndpoint("https://fcm.googleapis.com.evil.com/x")).toBe(false);
    expect(isTrustedPushEndpoint("http://fcm.googleapis.com/x")).toBe(false);
    expect(isTrustedPushEndpoint("not a url")).toBe(false);
  });
});
