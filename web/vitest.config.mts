import svgr from "vite-plugin-svgr";
import { defineConfig } from "vitest/config";
import { svgoConfig } from "./next.config";

export default defineConfig({
  plugins: [
    // 번들러(next.config.ts)와 동일한 SVGR 변환을 테스트에서도 사용.
    // vite-plugin-svgr는 plugins를 명시해야 svgo가 실행된다
    svgr({
      include: "**/*.svg",
      svgrOptions: {
        plugins: ["@svgr/plugin-svgo", "@svgr/plugin-jsx"],
        svgoConfig: svgoConfig as import("svgo").Config,
      },
    }),
  ],
});
