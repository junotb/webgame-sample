import type { NextConfig } from "next";

// fill/stroke 하드코딩 색을 currentColor로 치환 — 아이콘 색은 CSS color로 제어한다.
// Turbopack 로더 옵션은 JSON 직렬화 가능해야 해서 svgo의 Config 타입 대신 JSON 형태로 선언
type JsonParam = boolean | { [key: string]: JsonParam };
type SvgoPlugin = { name: string; params: { [key: string]: JsonParam } };
export const svgoConfig: { plugins: SvgoPlugin[] } = {
  plugins: [
    {
      name: "preset-default",
      params: {
        overrides: {
          removeViewBox: false,
          // removeUnknownsAndDefaults가 기본색 fill을 지우기 전에 치환해야 한다
          convertColors: { currentColor: true },
        },
      },
    },
  ],
};

const svgrLoader = {
  loader: "@svgr/webpack",
  options: { svgoConfig },
};

const nextConfig: NextConfig = {
  // D2: 정적 사이트 (서버 비용 0원)
  output: "export",
  turbopack: {
    rules: {
      "*.svg": { loaders: [svgrLoader], as: "*.js" },
    },
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      use: [svgrLoader],
    });
    return config;
  },
};

export default nextConfig;
