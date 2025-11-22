"use client";

import { useEffect, useRef, useState } from "react";

interface MermaidDiagramProps {
  chart: string;
  id?: string;
}

export function MermaidDiagram({ chart, id }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");

  useEffect(() => {
    let isMounted = true;

    const renderDiagram = async () => {
      if (!containerRef.current) return;

      try {
        const mermaid = (await import("mermaid")).default;
        
        // Initialize mermaid with configuration
        mermaid.initialize({ 
          startOnLoad: false, 
          theme: "default",
          securityLevel: "loose",
        });

        // Generate unique ID for this diagram
        const diagramId = id || `mermaid-${Math.random().toString(36).substring(2, 11)}`;
        
        // Render the diagram
        const { svg: renderedSvg } = await mermaid.render(diagramId, chart);
        
        if (isMounted) {
          setSvg(renderedSvg);
        }
      } catch (error) {
        console.error("Mermaid rendering error:", error);
        if (isMounted && containerRef.current) {
          containerRef.current.innerHTML = `<pre class="text-destructive text-sm">${error}</pre>`;
        }
      }
    };

    renderDiagram();

    return () => {
      isMounted = false;
    };
  }, [chart, id]);

  return (
    <div 
      ref={containerRef}
      className="mermaid-container"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
