import type { CSSProperties, ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface PanelProps {
  children: ReactNode;
  style?: CSSProperties;
}

export function Panel({ children, style }: PanelProps) {
  return (
    <Card style={style}>
      <CardContent className="flex flex-col gap-3">{children}</CardContent>
    </Card>
  );
}
