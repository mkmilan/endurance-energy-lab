'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { clamp, formatIntensity, LIMITS } from '../lib/model';

function tickStep(max, count) {
  const rough = max / count;
  const base = 10 ** Math.floor(Math.log10(rough));
  const factor = [1, 2, 2.5, 5, 10].find(n => n * base >= rough);
  return base * factor;
}

export default function Plot({ sport, weight, profile, measure, unit, color, thresholds, pinned, onSelect, oxygenMax }) {
  const container = useRef(null);
  const [width, setWidth] = useState(660);
  const id = useId().replaceAll(':','');
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(245, entry.contentRect.width)));
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  const [lo, hi] = LIMITS[sport];
  const left = width < 410 ? 39 : 48, right = width - 15, top = 28, bottom = 141;
  const x = (v) => left + (v - lo) / (hi - lo) * (right - left);
  const maxY = Math.max(measure(hi), measure(lo), 1);
  const step = tickStep(maxY, 4);
  const ceiling = Math.ceil(maxY / step) * step;
  const y = (v) => bottom - v / ceiling * (bottom - top);
  const horizontal = Array.from({length: Math.round(ceiling / step) + 1}, (_,i) => i * step);
  const xTicks = width < 430 ? 3 : 5;
  const xValues = Array.from({length:xTicks},(_,i)=>lo+i/(xTicks-1)*(hi-lo));
  const line = 'M' + x(lo) + ' ' + y(measure(lo)) + ' L' + x(hi) + ' ' + y(measure(hi));
  const active = profile.intensity;
  const select = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const v = lo + ((event.clientX - rect.left) - left) / (right-left) * (hi-lo);
    onSelect(clamp(sport === 'bike' ? Math.round(v) : Math.round(v * 100) / 100,lo,hi));
  };
  const markers = thresholds.filter(t => t.value >= lo && t.value <= hi);
  return <div ref={container} className="plot"><svg viewBox={'0 0 '+width+' 171'} width="100%" height="171" role="img"
    aria-label={unit+' by '+(sport === 'run'?'running pace or speed':'cycling power')+'. Use the intensity slider to adjust.'}
    onPointerDown={e=>{if(e.button!==0)return; e.currentTarget.setPointerCapture(e.pointerId); select(e);}}
    onPointerMove={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))select(e);}}>
    <defs><linearGradient id={'fill'+id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={color} stopOpacity=".15"/><stop offset="100%" stopColor={color} stopOpacity=".025"/>
    </linearGradient></defs>
    {horizontal.map(v=><g key={v}><line x1={left} x2={right} y1={y(v)} y2={y(v)} className="grid"/>
      <text x={left-9} y={y(v)+4} textAnchor="end">{Number(v.toFixed(2)).toLocaleString('en')}</text></g>)}
    <path d={line+' L'+right+' '+bottom+' L'+left+' '+bottom+' Z'} fill={'url(#fill'+id+')'} />
    {oxygenMax > 0 && oxygenMax < ceiling && <line x1={left} x2={right} y1={y(oxygenMax)} y2={y(oxygenMax)} className="max-line"><title>VO₂max</title></line>}
    {markers.map((t,i)=><g key={t.label}><line x1={x(t.value)} x2={x(t.value)} y1={top-5} y2={bottom} className="marker-line"/>
      <text x={x(t.value)} y={i===1 && x(t.value)-x(markers[0].value)<32 ? 24 : 14} textAnchor="middle" className="marker-label">{t.label}</text></g>)}
    <path d={line} stroke={color} strokeWidth="2.8" fill="none" strokeLinecap="round"/>
    {pinned != null && <circle cx={x(pinned)} cy={y(measure(pinned))} r="5" fill="white" stroke={color} strokeWidth="2"/>}
    <line x1={x(active)} x2={x(active)} y1={y(measure(active))} y2={bottom} stroke={color} strokeWidth="1.2"/>
    <circle cx={x(active)} cy={y(measure(active))} r="7" fill="white" stroke={color} strokeWidth="2.2"/>
    <circle cx={x(active)} cy={y(measure(active))} r="3" fill={color}/>
    {xValues.map((v,i)=><text key={v} x={x(v)} y={bottom+21} textAnchor={i===0?'start':i===xValues.length-1?'end':'middle'}>{formatIntensity(v,profile.unit,weight)}</text>)}
  </svg></div>;
}
