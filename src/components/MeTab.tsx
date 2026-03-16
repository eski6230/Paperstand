import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface MeTabProps {
  topicWeights: Record<string, number>;
  historyCount: number;
  onBubbleClick: (keyword: string) => void;
}

export default function MeTab({ topicWeights, historyCount, onBubbleClick }: MeTabProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    // Filter out items with 0 or negative weight just in case
    const data = Object.entries(topicWeights)
      .filter(([_, value]) => value > 0)
      .map(([id, value]) => ({ id, value: Math.max(1, value) }));

    const width = 600;
    const height = 600;

    // Clear previous render
    d3.select(svgRef.current).selectAll("*").remove();

    if (data.length === 0) {
      d3.select(svgRef.current)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .style("fill", "#94a3b8")
        .text("아직 충분한 데이터가 없습니다. 논문을 더 읽어보세요!");
      return;
    }

    const pack = d3.pack<{ id: string; value: number }>()
      .size([width, height])
      .padding(5);

    const root = d3.hierarchy({ children: data } as any)
      .sum((d: any) => d.value);

    const nodes = pack(root).leaves();

    const svg = d3.select(svgRef.current)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .style("max-width", "100%")
      .style("height", "auto");

    const color = d3.scaleOrdinal(d3.schemeTableau10);

    const node = svg.selectAll("g")
      .data(nodes)
      .join("g")
      .attr("transform", d => `translate(${d.x},${d.y})`)
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        onBubbleClick(d.data.id);
      })
      .on("mouseover", function() {
        d3.select(this).select("circle").attr("fill-opacity", 1).attr("stroke-width", 4);
      })
      .on("mouseout", function() {
        d3.select(this).select("circle").attr("fill-opacity", 0.7).attr("stroke-width", 2);
      });

    node.append("circle")
      .attr("r", d => d.r)
      .attr("fill", (d, i) => color(i.toString()))
      .attr("fill-opacity", 0.7)
      .attr("stroke", (d, i) => color(i.toString()))
      .attr("stroke-width", 2)
      .style("transition", "all 0.3s ease");

    node.append("text")
      .text(d => d.data.id)
      .attr("text-anchor", "middle")
      .attr("dy", ".3em")
      .style("font-size", "14px")
      .style("fill", "#fff")
      .style("font-weight", "bold")
      .style("pointer-events", "none")
      .each(function(d) {
        const textNode = this as SVGTextElement;
        const width = textNode.getComputedTextLength();
        const availableWidth = d.r * 2 - 8;
        if (width > availableWidth && availableWidth > 0) {
          const newSize = Math.max(8, Math.floor(14 * (availableWidth / width)));
          d3.select(this).style("font-size", `${newSize}px`);
        } else {
          d3.select(this).style("font-size", `${Math.min(16, d.r / 2.5)}px`);
        }
      });

  }, [topicWeights]);

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
      <div className="w-full mb-8 bg-indigo-50 dark:bg-indigo-500/10 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-500/20 text-left">
        <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-100 mb-2">
          훌륭합니다! 지금까지 총 {historyCount}편의 논문을 살펴보셨습니다.
        </h3>
        <p className="text-indigo-700 dark:text-indigo-300 text-sm">
          꾸준한 지식 업데이트가 선생님의 진료에 큰 힘이 될 것입니다. 아래는 선생님이 최근 관심을 보인 주제들입니다. 원을 클릭하여 관련 논문을 바로 확인해보세요!
        </p>
      </div>

      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">My Interest Bubble</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          선생님께서 열람하고 추천하신 주제들의 비중을 보여줍니다.
        </p>
      </div>
      <div className="w-full max-w-lg aspect-square">
        <svg ref={svgRef} className="w-full h-full"></svg>
      </div>
    </div>
  );
}
