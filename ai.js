"use strict";
(() => {
  const $ = id => document.getElementById(id);
  let proposal = null;

  const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
  const numberFrom=(text,patterns)=>{
    for(const re of patterns){const m=text.match(re);if(m)return Number(String(m[1]).replace(",","."));}
    return null;
  };

  function parsePrompt(raw){
    const t=raw.toLowerCase().replace(/\s+/g," ").trim();
    if(!t) throw new Error("Kirjoita ensin mitä haluat suunnitella.");

    const current={
      nutAf:Number($("nutAf").value),clearance:Number($("clearance").value),lockAmount:Number($("lockAmount").value),
      lockZ:Number($("lockZ").value),wall:Number($("wall").value),baseHeight:Number($("baseHeight").value),
      totalHeight:Number($("totalHeight").value),tipRadius:Number($("tipRadius").value),material:$("material").value
    };
    const p={...current};
    const found=[];

    const nut=numberFrom(t,[/(\d+(?:[.,]\d+)?)\s*mm\s*(?:mutter|pyöränmutter)/,/(?:mutter|avainkoko)[^\d]{0,12}(\d+(?:[.,]\d+)?)/]);
    if(nut){p.nutAf=clamp(nut,10,80);found.push(`mutteri ${p.nutAf} mm`)}

    const height=numberFrom(t,[/(?:kokonaiskorkeus|korkeus|pitkä|pituus)[^\d]{0,12}(\d+(?:[.,]\d+)?)\s*mm/,/(\d+(?:[.,]\d+)?)\s*mm\s*(?:pitkä|korkea)/]);
    if(height){p.totalHeight=clamp(height,25,160);found.push(`korkeus ${p.totalHeight} mm`)}

    const wall=numberFrom(t,[/(?:seinämä|seinaman|seinämän)[^\d]{0,12}(\d+(?:[.,]\d+)?)\s*mm/]);
    if(wall){p.wall=clamp(wall,1,8);found.push(`seinämä ${p.wall} mm`)}

    const base=numberFrom(t,[/(?:mutteriosan korkeus|mutteriosa)[^\d]{0,12}(\d+(?:[.,]\d+)?)\s*mm/]);
    if(base){p.baseHeight=clamp(base,8,60);found.push(`mutteriosa ${p.baseHeight} mm`)}

    const clear=numberFrom(t,[/(?:välys|valys)[^\d]{0,12}(\d+(?:[.,]\d+)?)\s*mm/]);
    if(clear!==null){p.clearance=clamp(clear,0,2);found.push(`välys ${p.clearance} mm/puoli`)}

    const lock=numberFrom(t,[/(?:puristuslukitus|lukitus)[^\d]{0,12}(\d+(?:[.,]\d+)?)\s*mm/]);
    if(lock!==null){p.lockAmount=clamp(lock,0,1.2);found.push(`lukitus ${p.lockAmount} mm`)}

    if(/napakka|tiukka|pitävä/.test(t) && lock===null){p.lockAmount=.25; p.clearance=.20; found.push("napakka sovitus")}
    if(/helposti irtoava|löysä|loysa/.test(t)){p.lockAmount=.10; p.clearance=.35; found.push("väljempi sovitus")}
    if(/terävä|terava/.test(t)){p.tipRadius=.35;found.push("terävä kärki")}
    if(/pyöristetty kärki|pyoristetty karki|pyöreä kärki|pyorea karki/.test(t)){p.tipRadius=1.5;found.push("pyöristetty kärki")}

    if(/\basa\b/.test(t)) p.material="ASA";
    else if(/\bpetg\b/.test(t)) p.material="PETG";
    else if(/\bpla\b/.test(t)) p.material="PLA";

    if(/ulko|rekka|kuorma-auto|uv|sää|saa/.test(t) && !/\b(pla|petg|asa)\b/.test(t)) p.material="ASA";

    if(p.totalHeight<=p.baseHeight+8) p.totalHeight=p.baseHeight+12;
    if(p.lockZ>p.baseHeight-4) p.lockZ=Math.max(2,p.baseHeight-5);

    const warnings=[];
    if(found.length===0) warnings.push("Pyynnöstä ei löytynyt selviä mittoja; nykyiset arvot säilytettiin.");
    if(p.material==="ASA") warnings.push("ASA sopii ulkokäyttöön, mutta tulosta suljetulla tulostimella ja käytä hyvää ilmanvaihtoa.");
    warnings.push("33 mm avainkoko ei yksin takaa täydellistä istuvuutta — sovitustesti tehdään ennen lopullista kappaletta.");

    return {params:p, found, warnings, raw};
  }

  function showProposal(r){
    const p=r.params;
    $("aiProposal").hidden=false;
    $("aiApproval").hidden=false;
    $("aiProposal").innerHTML=`
      <div class="proposal-title">Ehdotetut asetukset</div>
      <div class="proposal-grid">
        <span>Mutteri <b>${p.nutAf.toFixed(1)} mm</b></span><span>Korkeus <b>${p.totalHeight.toFixed(1)} mm</b></span>
        <span>Seinämä <b>${p.wall.toFixed(2)} mm</b></span><span>Välys <b>${p.clearance.toFixed(2)} mm/puoli</b></span>
        <span>Lukitus <b>${p.lockAmount.toFixed(2)} mm</b></span><span>Mutteriosa <b>${p.baseHeight.toFixed(1)} mm</b></span>
        <span>Kärki <b>${p.tipRadius.toFixed(2)} mm</b></span><span>Materiaali <b>${p.material}</b></span>
      </div>
      ${r.found.length?`<div class="proposal-note">Tulkittu: ${r.found.join(" • ")}</div>`:""}
      <div class="proposal-warn">${r.warnings.map(x=>`⚠ ${x}`).join("<br>")}</div>`;
    $("aiStatus").textContent="Ehdotus valmis. Tarkista mitat ja hyväksy vasta sitten.";
  }

  function applyProposal(){
    if(!proposal) return;
    const p=proposal.params;
    for(const k of ["nutAf","clearance","lockAmount","lockZ","wall","baseHeight","totalHeight","tipRadius"]) $(k).value=p[k];
    $("material").value=p.material;
    $("btnGenerate").click();
    $("aiStatus").textContent="✓ Ehdotus hyväksytty ja 3D-malli luotu.";
    $("aiProposal").hidden=true;$("aiApproval").hidden=true;
    document.querySelector(".preview-panel")?.scrollIntoView({behavior:"smooth",block:"start"});
  }

  $("btnAiAnalyze").addEventListener("click",()=>{
    try{proposal=parsePrompt($("aiPrompt").value);showProposal(proposal)}
    catch(e){$("aiStatus").textContent="Virhe: "+e.message;$("aiProposal").hidden=true;$("aiApproval").hidden=true;proposal=null;}
  });
  $("btnAiExample").addEventListener("click",()=>{$("aiPrompt").value="Tee 33 mm mutterille 90 mm pitkä terävä piikkisuoja ASA:sta. Seinämä 3 mm ja napakka lukitus.";});
  $("btnAiAccept").addEventListener("click",applyProposal);
  $("btnAiReject").addEventListener("click",()=>{proposal=null;$("aiProposal").hidden=true;$("aiApproval").hidden=true;$("aiStatus").textContent="Ehdotus hylätty. Nykyistä mallia ei muutettu.";});
})();