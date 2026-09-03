"use strict";
(()=>{
 const $=id=>document.getElementById(id);
 let timer=0,lastLabel=null;
 function ensureStyle(){
  if($("ai3dMeasureFocusStyle"))return;
  const s=document.createElement("style");s.id="ai3dMeasureFocusStyle";
  s.textContent='.ai3d-measure-focus{outline:2px solid currentColor;outline-offset:4px;border-radius:6px;transition:outline-color .2s ease}.ai3d-measure-focus input,.ai3d-measure-focus select,.ai3d-measure-focus textarea{font-weight:700}';
  document.head.appendChild(s)
 }
 function clear(){clearTimeout(timer);if(lastLabel){lastLabel.classList.remove("ai3d-measure-focus");lastLabel=null}}
 function highlight(input){
  if(!input)return;ensureStyle();clear();
  const label=input.closest("label")||input.parentElement;if(!label)return;
  label.classList.add("ai3d-measure-focus");lastLabel=label;
  const details=input.closest("details");if(details)details.open=true;
  timer=setTimeout(clear,2200)
 }
 function fieldFromMeasure(target){const span=target?.closest?.("#measureOverlay span[data-field]");return span?.dataset?.field||""}
 function init(){
  ensureStyle();
  document.addEventListener("click",e=>{const id=fieldFromMeasure(e.target);if(!id)return;const input=$(id);if(input)setTimeout(()=>highlight(input),0)},true);
  document.addEventListener("focusin",e=>{if(e.target?.matches?.(".controls input,.controls select,.controls textarea"))highlight(e.target)},true);
  $("partType")?.addEventListener("change",clear)
 }
 window.AI3DMeasureFocus={highlight,clear};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
