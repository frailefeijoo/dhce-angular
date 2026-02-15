export type VsCodeApi = {
  postMessage: (message: unknown) => void;
};

export function acquireVsCodeApi(win: Window = window): VsCodeApi | null {
  const apiFactory = (win as Window & { acquireVsCodeApi?: () => VsCodeApi }).acquireVsCodeApi;
  if (typeof apiFactory !== 'function') {
    return null;
  }

  try {
    return apiFactory();
  } catch {
    return null;
  }
}
