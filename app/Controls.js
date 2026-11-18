'use client';
import {useEffect, useState} from 'react';
import {LIMITS, MILE, RUN_UNITS, BIKE_UNITS, formatIntensity, parseIntensity, estimate, thresholdIntensity} from '../lib/model';

export function Icon({name, size=17}) {
  const paths = {
    run: <><circle cx="16" cy="4" r="1.8"/><path d="m9 9 3-3 4 4 4 1M5 21l6-7 3-5M5 12l4-3m2 5 5 2-1 5"/></>,
    bike: <><circle cx="5.5" cy="16.5" r="4"/><circle cx="18.5" cy="16.5" r="4"/><path d="m5.5 16.5 5-8 4.5 8h-9.5m4-10h3m6 10-3-12h3"/></>,
    sliders: <><path d="M3 6h5m5 0h8M3 12h10m5 0h3M3 18h3m5 0h10"/><circle cx="10" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="8" cy="18" r="2"/></>,
    note: <><path d="M5 4h13a1 1 0 0 1 1 1v14H7a2 2 0 0 1-2-2zm0 12h14M9 8h6m-6 3h5"/></>,
    pin: <><path d="m9 4 10 0-2.2 5 2.2 5H8l2-5zM13 14v7"/></>,
    oxygen: <><path d="M2 13h5l3-8 4 14 3-9 2 3h3"/></>,
    bolt:<path d="M13 2 5 13h6l-1 9 9-13h-6z"/>,
    arrow:<path d="m8 5 7 7-7 7"/>,
    chevron:<path d="m6 9 6 6 6-6"/>,
    close:<path d="m6 6 12 12M6 18 18 6"/>,
    clock:<><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></>
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export function Field({label, value, display, onCommit, suffix, hint, parse=Number, min, max, type='number'}) {
  const shown = display ?? String(value);
  const [draft,setDraft] = useState(shown), [error,setError] = useState('');
  useEffect(()=>{setDraft(shown);setError('');},[shown]);
  function commit() {
    if(draft === shown) {setError('');return;}
    const v = parse(draft);
    if(!draft.trim() || !Number.isFinite(v) || v < min || v > max) {
      setError(hint || ('Use '+min+'–'+max+'.'));return;
    }
    setError('');onCommit(v);
  }
  return <label className="field"><span>{label}</span><span className={'inputbox'+(error?' invalid':'')}>
    <input type={type} step="any" min={type==='number'?min:undefined} max={type==='number'?max:undefined}
      inputMode={type==='number'?'decimal':'text'} value={draft} onChange={e=>setDraft(e.target.value)}
      onBlur={commit} onKeyDown={e=>{if(e.key==='Enter') e.currentTarget.blur();}} aria-invalid={!!error} />
    {suffix && <small>{suffix}</small>}</span>{error && <em role="alert">{error}</em>}</label>;
}

function Threshold({which, sport, profile, weight, update}) {
  const t = profile[which], label = which.toUpperCase(), old = thresholdIntensity(sport,profile,weight,t);
  const unitText = (sport === 'run' ? RUN_UNITS : BIKE_UNITS)[profile.unit];
  function changeMode(mode) {
    const demands = estimate(sport,profile,weight,old);
    let value = mode==='workload'? old : mode==='relative'?demands.relative:demands.percent;
    const [lo,hi] = mode==='workload'?LIMITS[sport]:mode==='relative'?[5,110]:[10,99];
    update({[which]:{mode,value:Math.max(lo,Math.min(hi,Math.round(value*100)/100))}});
  }
  const byLoad=t.mode==='workload';
  return <div className="threshold"><label>{label} input<select value={t.mode} onChange={e=>changeMode(e.target.value)}>
    <option value="percent">% of VO₂max</option><option value="relative">Threshold VO₂</option><option value="workload">{sport==='run'?'Pace / speed':'Power'}</option></select></label>
    <Field label={label+' value'} value={t.value} display={byLoad?formatIntensity(t.value,profile.unit,weight):undefined}
      type={byLoad?'text':'number'} suffix={byLoad?unitText:t.mode==='percent'?'%':'mL/kg/min'} min={byLoad?LIMITS[sport][0]:t.mode==='percent'?10:5}
      max={byLoad?LIMITS[sport][1]:t.mode==='percent'?99:110} parse={byLoad?v=>parseIntensity(v,profile.unit,weight):Number}
      hint={byLoad?'Enter a value within the intensity range.':undefined}
      onCommit={value=>update({[which]:{...t,value}})}/></div>;
}

export function Settings({sport,profile,weight,update,updateWeight,onNotes}) {
  const running=sport==='run';
  const byDistance = running && profile.sessionMode==='distance';
  const miles = running && ['paceMi','mph'].includes(profile.unit);
  return <aside className="settings" aria-label="Session settings">
    <div className="panel-title"><Icon name="sliders"/><h2>Session settings</h2></div>
    <div className="settings-inner"><h3>Athlete</h3>
      <Field label="Body weight" value={weight} min={25} max={250} suffix="kg" onCommit={updateWeight}/>
      <Field label={running?'Running VO₂max':'Cycling VO₂max'} value={profile.max} min={15} max={110} suffix="mL/kg/min" onCommit={max=>update({max})}/>
      <hr/><h3>Session</h3>
      {running && <div className="mini-switch" aria-label="Session basis">{[['time','By time'],['distance','By distance']].map(([key,text])=>
        <button key={key} aria-pressed={profile.sessionMode===key} onClick={()=>update({sessionMode:key})}>{text}</button>)}</div>}
      {byDistance?<Field label="Distance" value={profile.distanceKm} display={String(Number((profile.distanceKm/(miles?MILE:1)).toFixed(3)))}
        min={0.1} max={500} suffix={miles?'mi':'km'} parse={v=>Number(v)*(miles?MILE:1)} hint={miles?'Use 0.063–310.68 mi.':undefined} onCommit={distanceKm=>update({distanceKm})}/>
        :<Field label="Duration" value={profile.minutes} min={1} max={1440} suffix="min" onCommit={minutes=>update({minutes})}/>}
      <details><summary>Thresholds <Icon name="chevron" size={15}/></summary>
        <p>Defaults use 70% and 85% of VO₂max. Enter test values when available.</p>
        <Threshold which="lt1" {...{sport,profile,weight,update}}/><Threshold which="lt2" {...{sport,profile,weight,update}}/>
      </details>
      <details><summary>Advanced settings <Icon name="chevron" size={15}/></summary>
        {running?<Field label="Net running oxygen cost" value={profile.economy} min={120} max={350} suffix="mL/kg/km" onCommit={economy=>update({economy})}/>
        :<Field label="Gross cycling efficiency" value={profile.efficiency} min={12} max={32} suffix="%" onCommit={efficiency=>update({efficiency})}/>}
      </details>
      <button className="notes-link" onClick={onNotes}><Icon name="note" size={16}/> Calculation methods</button>
    </div></aside>;
}
