// components/MarkdownRenderer.jsx
import React, { useEffect, useRef } from "react";
import mermaid from "mermaid";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

mermaid.initialize({ startOnLoad: false });

function MarkdownRenderer({ content }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      const mermaidCodeBlocks = ref.current.querySelectorAll("code.language-mermaid");

      mermaidCodeBlocks.forEach((block, index) => {
        const parent = block.parentElement;
        const graphDefinition = block.textContent;
        const id = `mermaid-${index}`;

        const container = document.createElement("div");
        container.id = id;

        mermaid.render(id, graphDefinition, (svgCode) => {
          container.innerHTML = svgCode;
          parent.replaceWith(container);
        });
      });
    }
  }, [content]);

  return (
    <div ref={ref}>
      <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
    </div>
  );
}

export default MarkdownRenderer;
