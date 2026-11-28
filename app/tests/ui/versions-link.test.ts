// The header's "Versions" link: the picker is the parent of a Pages build's
// version prefix, but locally the parent of /sl5/ is the server root (a 404).
import { describe, it, expect } from "vitest";
import { VERSIONS_README, versionsHref } from "../../src/components/layout/versions-link";

describe("the Versions link", () => {
  it("goes to the picker from a versioned Pages build", () => {
    expect(versionsHref("/sl5/v2/")).toBe("/sl5/v2/../");
    expect(versionsHref("/sl5/v1/")).toBe("/sl5/v1/../");
  });

  it("goes to the README's versions section from dev and preview", () => {
    expect(versionsHref("/sl5/")).toBe(VERSIONS_README);
    expect(versionsHref("/")).toBe(VERSIONS_README);
  });
});
