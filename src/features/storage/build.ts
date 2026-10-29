declare const __ENTRYLOOP_BUILD_ID__: string;
export const BUILD_ID =
  typeof __ENTRYLOOP_BUILD_ID__ === 'string'
    ? __ENTRYLOOP_BUILD_ID__
    : 'test-build';
