/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

declare module "plotly.js-dist-min" {
  const Plotly: {
    react: (
      element: HTMLElement,
      figure: { data: unknown[]; layout: object; config: object },
    ) => Promise<void>;
    purge: (element: HTMLElement) => void;
    downloadImage: (
      element: HTMLElement,
      options: {
        format: "png" | "svg";
        filename: string;
        width?: number;
        height?: number;
        scale?: number;
      },
    ) => Promise<string>;
    relayout: (element: HTMLElement, update: Record<string, unknown>) => Promise<void>;
  };
  export default Plotly;
}
