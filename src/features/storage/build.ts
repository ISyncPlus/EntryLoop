declare const __ENTRYLOOP_BUILD_ID__: string;
export const BUILD_ID =
  typeof __ENTRYLOOP_BUILD_ID__ === 'string'
    ? __ENTRYLOOP_BUILD_ID__
    : 'test-build';

declare const __ENTRYLOOP_REVISION__: string;
declare const __ENTRYLOOP_DIRTY__: boolean | null;
export const SOURCE_REVISION =
  typeof __ENTRYLOOP_REVISION__ === 'string'
    ? __ENTRYLOOP_REVISION__
    : 'unavailable';
export const SOURCE_DIRTY =
  typeof __ENTRYLOOP_DIRTY__ === 'undefined' ? null : __ENTRYLOOP_DIRTY__;
