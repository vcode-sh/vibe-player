interface AdapterTestResource {
  unmount(): Promise<void>;
}

export function createAdapterTestScope() {
  const resources = new Set<AdapterTestResource>();
  return {
    async cleanup(): Promise<void> {
      const disposals = Array.from(resources, async (resource) =>
        resource.unmount()
      );
      resources.clear();
      await Promise.all(disposals);
    },
    track<Resource extends AdapterTestResource>(resource: Resource): Resource {
      resources.add(resource);
      return resource;
    },
  };
}
