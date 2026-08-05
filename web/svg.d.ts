// tsconfig include에서 next-env.d.ts보다 앞에 와야
// next/image-types의 `*.svg: any` 선언을 이긴다
declare module "*.svg" {
  import type { FC, SVGProps } from "react";
  const ReactComponent: FC<SVGProps<SVGSVGElement>>;
  export default ReactComponent;
}
