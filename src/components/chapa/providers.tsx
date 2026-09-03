"use client";

import { App as AntApp, ConfigProvider, theme } from "antd";
import type { PropsWithChildren } from "react";

export function ChapaProviders({ children }: PropsWithChildren) {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: "#c7ff4a",
          colorInfo: "#7dd3fc",
          colorBgBase: "#080b0c",
          colorBgContainer: "#111718",
          colorBorder: "#263233",
          colorText: "#f4f7f5",
          colorTextSecondary: "#96a3a0",
          borderRadius: 14,
          borderRadiusLG: 20,
          fontFamily: "var(--font-sans)",
          controlHeight: 42,
        },
        components: {
          Button: { fontWeight: 700, primaryColor: "#09100b" },
          Card: { headerBg: "transparent" },
          Menu: { itemBg: "transparent", subMenuItemBg: "transparent" },
        },
      }}
    >
      <AntApp>{children}</AntApp>
    </ConfigProvider>
  );
}
