"use strict";
(()=>{
 const KEY="ai3d:centauri-fit:v1",$=id=>document.getElementById(id),MATERIALS=new Set(["PLA","PETG","ASA"]),NOZZLE=.4;
 let state={version:1,printer:"Elegoo Centauri Carbon 2 Combo",nozzle:NOZZLE,corrections:{}};
 function validCorrection(x){return Number.isFinite(Number(x))&&Number(x)>=-1&&Number(x)<=1}
 function read(){
  try{
   const raw=localStorage.getItem(KEY);if(!raw)return;
   const v=JSON.parse(raw);if(!v||v.version!==1||v.printer!==state.printer||Number(v.nozzle)!==NOZZLE||!v.corrections||typeof v.corrections!=="object"||Array.isArray(v.corrections))throw Error("Tuntematon kalibrointidata");
   const next={};for(const [mat,item] of Object.entries(v.corrections)){if(!MATERIALS.has(mat)||!item||!validCorrection(item.correction))continue;next[mat]={correction:Number(item.correction),updatedAt:Number(item.updatedAt)||0}}
   state={...state,corrections:next}
  }catch{state={version:1,printer:state.printer,nozzle:NOZZLE,corrections:{}}}
 }
 function write(){const raw=JSON.stringify(state);localStorage.setItem(KEY,raw);if(localStorage.getItem(KEY)!==raw)throw Error("Kalibroinnin tallennuksen varmennus epäonnistui.")}
 function material(){const m=$("material")?.value;return MATERIALS.has(m)?m:"PETG"}
 function clearance(){const e=$("clearance");return e&&Number.isFinite(e.valueAsNumber)?e.valueAsNumber:NaN}
 function correctionFor(mat){return MATERIALS.has(mat)?state.corrections[mat]?.correction:undefined}
 function suggestionFor(mat,value){const k=correctionFor(mat),c=Number(value);return Number.isFinite(c)&&Number.isFinite(k)?c+k:NaN}
 function correction(){return correctionFor(material())}
 function suggestion(){return suggestionFor(material(),clearance())}
 function changed(){document.dispatchEvent(new CustomEvent("ai3d:fit-calibration-changed"))}
 function inject(){
  if($("fitCalibrationPanel"))return;const preview=document.querySelector(".preview-panel");if(!preview)return;
  const box=document.createElement("div");box.id="fitCalibrationPanel";box.className="centauri-panel";box.innerHTML=`<div class="section-title">Minun Centaurini – sovitus</div><div id="fitCalibrationState" class="printer-status"></div><div class="grid"><label>Sovituksen korjaus / puoli (mm)<input id="fitCorrection" type="number" min="-1" max="1" step="0.05" inputmode="decimal" placeholder="esim. 0.10"></label></div><div class="centauri-actions"><button id="btnSaveFitCalibration" class="tool" type="button">TALLENNA KALIBROINTI</button><button id="btnClearFitCalibration" class="ghost" type="button">POISTA KALIBROINTI</button></div><small class="centauri-note">Syötä arvo vasta tulostetun sovitustestin perusteella. Positiivinen arvo lisää välystä, negatiivinen pienentää sitä. Studio ei arvaa eikä muuta mallin välystä automaattisesti.</small>`;
  preview.appendChild(box);$("btnSaveFitCalibration").addEventListener("click",saveCurrent);$("btnClearFitCalibration").addEventListener("click",clearCurrent)
 }
 function render(){
  inject();const panel=$("fitCalibrationPanel"),root=$("fitCalibrationState"),input=$("fitCorrection");if(!panel||!root||!input)return;
  const spike=$("partType")?.value==="spike";panel.hidden=!spike;if(!spike)return;
  const mat=material(),saved=correction(),c=clearance(),s=suggestion();input.value=Number.isFinite(saved)?String(saved):"";
  if(!Number.isFinite(saved)){root.className="printer-status";root.innerHTML=`<b>${mat}: ei kalibrointia</b><span>Tulosta ensin SOVITUSTESTI STL nykyisellä materiaalilla. Syötä sen jälkeen itse hyväksi todettu korjaus.</span><span>Nykyinen mallin välys: ${Number.isFinite(c)?c.toFixed(2)+" mm / puoli":"–"}</span>`;return}
  const stamp=state.corrections[mat]?.updatedAt,when=stamp?new Date(stamp).toLocaleDateString("fi-FI"):"";
  root.className="printer-status ok";root.innerHTML=`<b>${mat}: käyttäjän kalibrointi tallennettu</b><span>Korjaus ${saved>=0?"+":""}${saved.toFixed(2)} mm / puoli • suutin ${NOZZLE.toFixed(1)} mm${when?` • ${when}`:""}</span><span>${Number.isFinite(s)?`Nykyinen välys ${c.toFixed(2)} mm → ehdotus ${s.toFixed(2)} mm / puoli.`:"Muuta piikkimutterin välystä nähdäksesi ehdotuksen."}</span><span>Ehdotus on muistutus käyttäjän omasta testituloksesta. Arvoa ei sovelleta automaattisesti.</span>`
 }
 function saveCurrent(){
  const input=$("fitCorrection"),root=$("fitCalibrationState"),x=Number(input?.value);if(!input||!root)return;
  if(input.value.trim()===""||!validCorrection(x)){root.className="printer-status fail";root.innerHTML="<b>Kalibrointia ei tallennettu.</b><span>Syötä itse testattu korjaus väliltä −1,00…+1,00 mm / puoli.</span>";return}
  const mat=material(),prev=state.corrections[mat];state.corrections[mat]={correction:x,updatedAt:Date.now()};try{write();render();changed()}catch(e){if(prev)state.corrections[mat]=prev;else delete state.corrections[mat];root.className="printer-status fail";root.innerHTML=`<b>Kalibrointia ei tallennettu.</b><span>${e?.message||"Paikallinen tallennus epäonnistui."}</span>`}
 }
 function clearCurrent(){const mat=material(),root=$("fitCalibrationState"),prev=state.corrections[mat];delete state.corrections[mat];try{write();render();changed()}catch(e){if(prev)state.corrections[mat]=prev;if(root){root.className="printer-status fail";root.innerHTML=`<b>Kalibrointia ei poistettu.</b><span>${e?.message||"Paikallinen tallennus epäonnistui."}</span>`}}}
 function init(){read();inject();render();$("partType")?.addEventListener("change",render);$("material")?.addEventListener("change",render);$("clearance")?.addEventListener("input",()=>{const input=$("fitCorrection"),active=document.activeElement===input;if(!active)render()});document.addEventListener("visibilitychange",()=>{if(!document.hidden){read();render();changed()}})}
 window.AI3DFitCalibration={render,getCorrection:correctionFor,getSuggestion:()=>suggestion(),getSuggestionFor:suggestionFor};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
