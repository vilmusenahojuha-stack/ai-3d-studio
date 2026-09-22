"use strict";
const assert=require("assert");
const fs=require("fs");

const source=fs.readFileSync("centauri.js","utf8");

assert.match(source,/build:\[256,256,256\],buildPlate:\[260,260\]/,
  "Centauri Carbon 2 Combo build volume and physical platform must stay aligned with official specs");
assert.match(source,/nozzle:0\.4,nozzleMax:350,bedMax:110,filament:1\.75/,
  "Centauri nozzle, thermal limits and filament diameter must stay aligned with official specs");
assert.match(source,/recommendedLayer:0\.2,layerRange:\[0\.1,0\.4\],recommendedSpeed:250,maxSpeed:500,defaultAcceleration:10000,maxAcceleration:20000,maxFlow:32,accuracy:0\.1,autoLevelPoints:121,multicolor:4/,
  "Centauri layer, speed, acceleration, flow, accuracy, leveling and CANVAS profile must stay explicit and regression-protected");
assert.match(source,/Alustan enimmäislämpö: \$\{PROFILE\.bedMax\} °C/,
  "downloaded Centauri guide must include the official bed temperature limit");
assert.match(source,/Kerrosalue: \$\{PROFILE\.layerRange\.join\("–"\)\} mm \(suositus \$\{PROFILE\.recommendedLayer\} mm\)/,
  "downloaded Centauri guide must expose the official layer range and recommended layer height");
assert.match(source,/Tulostusnopeus: suositus \$\{PROFILE\.recommendedSpeed\} mm\/s, enintään \$\{PROFILE\.maxSpeed\} mm\/s/,
  "downloaded Centauri guide must distinguish recommended and maximum print speed");
assert.match(source,/Kiihtyvyys: oletus \$\{PROFILE\.defaultAcceleration\} mm\/s², enintään \$\{PROFILE\.maxAcceleration\} mm\/s²/,
  "downloaded Centauri guide must expose official default and maximum acceleration as informational limits");
assert.match(source,/Enimmäisvirtaama: \$\{PROFILE\.maxFlow\} mm³\/s/,
  "downloaded Centauri guide must expose official maximum flow as an informational limit");
assert.match(source,/Moniväri: \$\{PROFILE\.multicolor\} väriä CANVAS-järjestelmällä/,
  "downloaded Centauri guide must preserve Centauri Carbon 2 Combo CANVAS capability");

console.log("Centauri official profile regression: OK");
