import test from 'node:test';
import assert from 'node:assert/strict';
import { estimate, initialState, formatIntensity, parseIntensity, thresholdIntensity, restore, MILE } from '../lib/model.js';
const initial=initialState();
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,actual+' vs '+expected);
test('running gross energy includes rest and scales with weight',()=>{
 const r=estimate('run',initial.run,70,12);
 near(r.relative,43.5);near(r.absolute,3.045);near(r.kcalHour,913.5);near(r.total,913.5);
 near(estimate('run',initial.run,80,12).relative,r.relative);
});
test('200 watts for one hour at 22% has the same kcal at different body weights',()=>{
 const a=estimate('bike',initial.bike,60);const b=estimate('bike',initial.bike,85);
 near(a.kcalHour,720000/(4184*.22));near(a.total,b.total);assert.ok(a.relative>b.relative);
 near(estimate('bike',{...initial.bike,minutes:90},60).total,a.total*1.5);
});
test('distance uses time at the selected running speed and includes gross cost',()=>{
 const p={...initial.run,sessionMode:'distance',distanceKm:10};
 near(estimate('run',p,70,12).minutes,50);near(estimate('run',p,70,12).total,761.25);
});
test('relative VO2, percent and workload markers invert the sport model',()=>{
 for(const sport of ['run','bike']){
  const p=initial[sport], v=p.intensity, data=estimate(sport,p,70,v);
  for(const [mode,value] of [['workload',v],['relative',data.relative],['percent',data.percent]]) near(thresholdIntensity(sport,p,70,{mode,value}),v);
 }
});
test('pace, speed and W/kg conversions are reversible',()=>{
 near(parseIntensity('5:00','paceKm',70),12);
 near(parseIntensity('8:00','paceMi',70),7.5*MILE);
 near(parseIntensity('3.5','wattsKg',70),245);
 assert.equal(formatIntensity(12,'paceKm',70),'5:00');
 assert.equal(formatIntensity(12,'paceMi',70),'8:03');
 assert.ok(Number.isNaN(parseIntensity('5:70','paceKm',70)));
});
test('restore rejects corrupt input and keeps sport-specific settings',()=>{
 const valid={...initial,weight:74,bike:{...initial.bike,efficiency:25},sport:'bike'};
 assert.deepEqual(restore(valid),valid);
 assert.deepEqual(restore({weight:0,run:{intensity:-2,lt1:{mode:'workload',value:-4}}}),initial);
});
