/**
 * Shared header-button style: a bordered chip so header controls clearly read as
 * buttons. Lives in its own module (not Header.tsx) so exporting it alongside a
 * component doesn't disable React Fast Refresh for that component.
 */
export const HEADER_BTN =
  "flex items-center gap-1 text-xs text-gray-300 border border-gray-700 bg-gray-900 hover:bg-gray-800 hover:text-white hover:border-gray-600 px-2.5 py-1 rounded-md transition-colors";
