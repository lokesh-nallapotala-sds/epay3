/**
 * Type declarations for PayMetric XIPlugin and XIFrame libraries
 * XIPlugin: Used for stored card 3DS verification
 * XIFrame: Used for iframe tokenization (PCI-compliant card entry)
 */

declare global {
  interface XIPluginField {
    name: string;
    tokenize: boolean;
    value: string | number;
  }

  interface XIPluginRequestPacket {
    addField: (field: XIPluginField) => void;
  }

  interface XIPlugin {
    createJSRequestPacket: (
      merchantId: string,
      accessToken: string,
    ) => XIPluginRequestPacket;
    createField: (
      name: string,
      tokenize: boolean,
      value: string | number,
    ) => XIPluginField;
    ajax: (options: {
      url: string;
      type?: 'GET' | 'POST' | string;
      data: XIPluginRequestPacket;
      success: (response: unknown) => void;
      error: (error: unknown, textStatus?: unknown) => void;
      beforeSend?: (request: unknown) => void;
      complete?: (response: unknown) => void;
      validation?: (request: unknown) => boolean;
      threeDSVersion?: string;
    }) => void;
  }

  interface XIFrameSubmitResponse {
    success: boolean;
    message?: string;
    data?: unknown;
  }

  interface XIFrameOnloadOptions {
    iFrameId: string;
    targetUrl: string;
    autosizewidth?: boolean;
    autosizeheight?: boolean;
    onSuccess?: (e?: unknown) => void;
    onError?: (e?: unknown) => void;
  }

  interface XIFrameSubmitOptions {
    iFrameId: string;
    targetUrl: string;
    onSuccess?: (response: XIFrameSubmitResponse) => void;
    onError?: (error?: unknown) => void;
    threeDSVersion?: string;
  }

  interface XIFrame {
    onload: (options: XIFrameOnloadOptions) => void;
    submit: (options: XIFrameSubmitOptions) => void;
    resize?: (iframeId: string) => void;
  }

  interface Window {
    $XIPlugin: XIPlugin;
    $XIFrame: XIFrame;
  }
}

export {};
