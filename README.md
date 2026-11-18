# Endurance Energy Lab

An interactive, browser-local running and cycling model for oxygen demand and gross energy expenditure. Built with Next.js static export, React, JavaScript, CSS and responsive SVG charts.

## Run

Use Node 22.13+ or Node 24. Run `npm ci`, then `npm run dev`. Run `npm test` to check the physiology model and `npm run build` to export the site to `out/`.

## Model

Running relative oxygen demand = 3.5 + net oxygen cost × speed in km/h ÷ 60. Default net cost is 200 mL/kg/km. For cycling, metabolic kcal/h = crank watts × 3,600 ÷ (4,184 × gross efficiency as a fraction). The default gross efficiency is 22%. Both use approximately 5 kcal/L O₂. The graphs show estimated oxygen-equivalent demand, including above VO₂max. Session totals are steady-intensity scenarios.

The athlete can enter thresholds by fraction of VO₂max, relative VO₂, or pace/power, compare two intensities and choose metric or imperial running units. Profile and session settings are saved in the browser. The app uses no external services at runtime.
