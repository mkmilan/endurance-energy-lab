'use client';
import { useEffect, useRef, useState } from 'react';
import { BIKE_UNITS, RUN_UNITS, LIMITS, MILE, clamp, estimate, formatIntensity, initialState, nextIntensity, parseIntensity, restore, thresholdIntensity } from '../lib/model';
import { Field, Icon, Settings } from './Controls';
import Plot from './Plot';

const KEY = 'endurance-energy-lab.v1';
const round = (n, digits=0) => n.toLocaleString('en',{maximumFractionDigits:digits,minimumFractionDigits:digits});
const oxygenUnits = { relative:'mL/kg/min', absolute:'L/min', percent:'% VO₂max' };

function ModelNotes({dialog}) {
  return <dialog ref={dialog} onClick={e=>{if(e.target===dialog.current)dialog.current.close();}}>
    <article><header><h2>Calculation methods</h2><button className="icon-button" aria-label="Close calculation methods" onClick={()=>dialog.current.close()}><Icon name="close"/></button></header>
    <h3>Level running</h3><p>Oxygen demand is estimated from speed × net running oxygen cost, plus a resting allowance of 3.5 mL/kg/min. The default cost is 200 mL/kg/km. Hills, wind and terrain can change the actual cost.</p>
    <h3>Steady cycling</h3><p>Metabolic power equals crank power divided by gross efficiency (default 22%). At the same watts and efficiency, body weight changes W/kg and relative oxygen demand. Absolute energy expenditure stays the same.</p>
    <h3>Oxygen and energy</h3><p>The model uses about 5 kcal per litre of oxygen. Body weight converts relative demand to litres per minute. Both sports display gross kcal, including resting expenditure. Session totals assume the selected effort for the whole duration.</p>
    <h3>Thresholds and high intensities</h3><p>LT1 and LT2 start at illustrative fractions of VO₂max. You can enter your own thresholds. Above 100%, the curve represents oxygen-equivalent demand exceeding aerobic capacity. The app estimates steady efforts and does not model interval kinetics or fatigue.</p>
    <h3>References</h3><p className="sources"><a href="https://doi.org/10.1152/jappl.1963.18.2.367" target="_blank" rel="noreferrer">Margaria et al. · Energy cost of running ↗</a>
    <a href="https://pubmed.ncbi.nlm.nih.gov/19229554/" target="_blank" rel="noreferrer">Ettema & Lorås · Efficiency in cycling ↗</a></p></article></dialog>;
}

function ChartCard({title,icon,color,number,suffix,secondary,children,axisUnit,xLabel,tools,legend}) {
  return <section className="chart panel">
    <div className="chart-header"><div className="metric-name"><span className="metric-icon" style={{color}}><Icon name={icon}/></span><h2>{title}</h2></div>{tools}</div>
    <div className="chart-value"><strong>{number}</strong><span>{suffix}</span></div>
    <p className="metric-secondary">{secondary}</p>
    <div className="axis-title">{axisUnit}</div>{children}
    <div className="axis-caption"><span>{legend}</span><span>{xLabel} →</span></div>
  </section>;
}

export default function Page() {
  const [state,setState] = useState(initialState), [ready,setReady]=useState(false);
  const [pins,setPins]=useState({run:null,bike:null});
  const notes=useRef(null), mobileSettings=useRef(null), intensityPanel=useRef(null);
  useEffect(()=>{try {setState(restore(JSON.parse(localStorage.getItem(KEY))));}catch{}setReady(true);},[]);
  useEffect(()=>{if(ready)try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}},[state,ready]);
  const sport=state.sport, run=sport==='run', p=state[sport], weight=state.weight;
  const patch=(v)=>setState(s=>({...s,[sport]:{...s[sport],...v}}));
  const select=(intensity)=>patch({intensity:clamp(intensity,...LIMITS[sport])});
  const data=estimate(sport,p,weight);
  const units=run?RUN_UNITS:BIKE_UNITS, unit=units[p.unit], intensity= p.intensity;
  const view = (v)=>formatIntensity(v,p.unit,weight);
  const thresholds=['lt1','lt2'].map(key=>({label:key.toUpperCase(),value:thresholdIntensity(sport,p,weight,p[key])}));
  const validThresholds=thresholds[0].value>0 && thresholds[0].value<thresholds[1].value;
  const showThresholds=validThresholds?thresholds:[];
  const zone = !validThresholds?'Check threshold order':intensity<thresholds[0].value?'Zone 1 · Below LT1':intensity<=thresholds[1].value?'Zone 2 · LT1 to LT2':'Zone 3 · Above LT2';
  const pin=pins[sport], pinned=pin!=null?estimate(sport,p,weight,pin):null;
  const oxygenValues = {
    relative: round(data.relative,1)+' mL/kg/min',
    absolute: round(data.absolute,2)+' L/min',
    percent: round(data.percent,1)+'% of VO₂max'
  };
  const oxygenDetail = ['percent','relative','absolute'].filter(key=>key!==state.oxygenUnit)
    .map(key=>oxygenValues[key]).join('  ·  ');
  const graphProps={sport,weight,profile:p,thresholds:showThresholds,pinned:pin,onSelect:select};
  const energyMeasure = v=>estimate(sport,p,weight,v).kcalHour;
  const oxygenMeasure = v=>estimate(sport,p,weight,v)[state.oxygenUnit];
  const oxygenMax=state.oxygenUnit==='absolute'?p.max*weight/1000:state.oxygenUnit==='percent'?100:p.max;
  const speedUnit=run?(p.unit==='mph'||p.unit==='paceMi'?'mph':'km/h'):'W/kg';
  const extra=run?formatIntensity(intensity,speedUnit==='mph'?'mph':'kmh',weight)+' '+speedUnit:round(intensity/weight,2)+' W/kg';
  const labelX=run?(['paceKm','paceMi'].includes(p.unit)?'Pace':'Speed'):'Power';
  const changePin=(value)=>setPins(current=>({...current,[sport]:value}));
  return <>
    <header className="mast"><div className="wrap mast-inner"><a className="brand" href="#" aria-label="Endurance Energy Lab home"><img src="/mark.svg" width="35" height="35" alt=""/><span>Endurance <b>Energy Lab</b></span></a>
      <button className="method-btn" onClick={()=>notes.current.showModal()}><Icon name="note"/><span>Model notes</span></button></div></header>
    <main className="wrap"><div className="intro"><div><h1>Effort explorer<span>.</span></h1><p>Explore oxygen demand and energy expenditure across intensities.</p></div>
      <div className="sport-switch" aria-label="Sport">{[['run','Running'],['bike','Cycling']].map(([key,label])=>
        <button key={key} aria-pressed={sport===key} onClick={()=>setState(s=>({...s,sport:key}))}><Icon name={key} size={19}/>{label}</button>)}</div></div>
    <div className="workspace"><div className="sidebar" ref={mobileSettings}><Settings key={sport} sport={sport} profile={p} weight={weight} update={patch} updateWeight={weight=>setState(s=>({...s,weight}))} onNotes={()=>notes.current.showModal()}/>
      <button className="mobile-return" onClick={()=>intensityPanel.current.scrollIntoView({behavior:'smooth'})}>Back to charts ↑</button></div>
    <div className="results">
      <section className="intensity panel" ref={intensityPanel}><div className="intensity-heading"><div className="eyelabel"><i></i>Selected intensity</div>
        <button className="phone-settings" onClick={()=>mobileSettings.current.scrollIntoView({behavior:'smooth'})}><Icon name="sliders" size={14}/> Settings</button>
        <button className="pin-button" onClick={()=>changePin(intensity)}><Icon name="pin" size={15}/>{pin==null?'Pin to compare':'Update pin'}</button></div>
        <div className="intensity-main"><div className="pace-edit" key={sport+p.unit}>
          <Field label={labelX} value={intensity} type="text" display={view(intensity)} min={LIMITS[sport][0]-0.04} max={LIMITS[sport][1]+0.04}
            parse={v=>parseIntensity(v,p.unit,weight)} hint={'Enter '+view(LIMITS[sport][0])+' to '+view(LIMITS[sport][1])+' '+unit+'.'} onCommit={select}/>
          <select aria-label="Intensity unit" value={p.unit} onChange={e=>patch({unit:e.target.value})}>
            {Object.entries(units).map(([key,u])=><option value={key} key={key}>{u}</option>)}</select></div>
          <span className="zone">{zone}</span></div>
        <div className="range-row"><button className="nudge" aria-label="Decrease intensity" disabled={intensity<=LIMITS[sport][0]} onClick={()=>select(nextIntensity(sport,p.unit,intensity,-1,weight))}>−</button>
        <input aria-label="Selected intensity" aria-valuetext={view(intensity)+' '+unit} type="range" min={LIMITS[sport][0]} max={LIMITS[sport][1]} step={run?0.01:1} value={intensity} onChange={e=>select(Number(e.target.value))}
          style={{'--progress':((intensity-LIMITS[sport][0])/(LIMITS[sport][1]-LIMITS[sport][0])*100)+'%'}}/>
        <button className="nudge" aria-label="Increase intensity" disabled={intensity>=LIMITS[sport][1]} onClick={()=>select(nextIntensity(sport,p.unit,intensity,1,weight))}>+</button></div>
        <div className="range-labels"><span>{view(LIMITS[sport][0])} {unit}</span><span>{view(LIMITS[sport][1])} {unit}</span></div>
      </section>
      <div className="charts">
      <ChartCard title="Oxygen demand" icon="oxygen" color="var(--red)" number={round(data[state.oxygenUnit],state.oxygenUnit==='absolute'?2:1)} suffix={oxygenUnits[state.oxygenUnit]}
        secondary={oxygenDetail+(data.percent>100?'  ·  Above aerobic capacity':'')}
        axisUnit={oxygenUnits[state.oxygenUnit]} xLabel={labelX+' ('+unit+')'} legend={<><i className="dash"></i> VO₂max</>}
        tools={<select className="chart-select" aria-label="Oxygen chart unit" value={state.oxygenUnit} onChange={e=>setState(s=>({...s,oxygenUnit:e.target.value}))}><option value="relative">Relative</option><option value="absolute">Absolute</option><option value="percent">% VO₂max</option></select>}>
        <Plot {...graphProps} measure={oxygenMeasure} unit={oxygenUnits[state.oxygenUnit]} color="#d93718" oxygenMax={oxygenMax}/>
      </ChartCard>
      <ChartCard title="Energy expenditure" icon="bolt" color="var(--ink)" number={round(data.kcalHour)} suffix="kcal/h"
        secondary={round(data.kcalHour/60,1)+' kcal/min  ·  '+round(data.kcalHour/weight,1)+' kcal/kg/h'}
        axisUnit="kcal/h" xLabel={labelX+' ('+unit+')'} legend="Gross energy estimate">
        <Plot {...graphProps} measure={energyMeasure} unit="kcal/h" color="#383634" />
      </ChartCard></div>
      <section className="session panel"><div className="session-text"><span className="metric-name"><Icon name="clock"/><h2>Session total</h2></span>
       <p>{round(data.minutes,1).replace(/\.0$/,'')} min{run?' · '+round(data.minutes*intensity/60/(['paceMi','mph'].includes(p.unit)?MILE:1),2)+' '+(['paceMi','mph'].includes(p.unit)?'mi':'km'):''} · {view(intensity)} {unit}</p></div>
       <div className="total"><strong>{round(data.total)}</strong> kcal</div></section>
      {pinned && <section className="comparison panel"><header><h2>Pinned comparison</h2><button onClick={()=>changePin(null)}>Clear pin</button></header>
        <table><thead><tr><th>Intensity</th><th>VO₂max</th><th>kcal/h</th><th>Session kcal</th></tr></thead><tbody>{[[pin,pinned,'Pinned'],[intensity,data,'Current']].map(([v,d,label])=>
        <tr key={label}><th>{view(v)} {unit} <small>{label}</small></th><td>{round(d.percent,1)}%</td><td>{round(d.kcalHour)}</td><td>{round(d.total)}</td></tr>)}</tbody></table></section>}
      <div className="context-line">{weight} kg athlete <b>·</b> {run?'Level running':'Steady cycling'} <b>·</b> {extra}</div>
    </div></div></main><ModelNotes dialog={notes}/></>;
}
