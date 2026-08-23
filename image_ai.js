"use strict";
(()=>{
  const $=id=>document.getElementById(id);
  const host=document.querySelector(".controls");
  const textAi=document.querySelector(".ai-box");
  if(!host||!textAi)return;

  const style=document.createElement("style");
  style.textContent=`
  .image-ai-box{margin:14px 0 20px;padding:14px;border:1px solid #7c3aed;border-radius:14px;background:linear-gradient(180deg,#18112c,#0b1220)}
  .image-ai-title{display:flex;justify-content:space-between;align-items:center;color:#ddd6fe;font-weight:900;letter-spacing:.04em}
  .image-ai-grid{display:grid;gap:10px}.image-drop{display:grid;place-items:center;min-height:110px;border:1px dashed #7c3aed;border-radius:12px;background:#0b1220;color:#c4b5fd;text-align:center;padding:14px;cursor:pointer}.image-drop input{display:none}.image-preview{max-width:100%;max-height:240px;border-radius:10px;border:1px solid #334155}.image-actions{display:grid;grid-template-columns:1fr auto;gap:8px}.image-result{margin-top:10px;padding:10px;border-radius:10px;background:#081018;border:1px solid #334155;color:#cbd5e1;font-size:12px;line-height:1.5}.image-questions{display:grid;gap:8px;margin-top:10px}.image-questions label{display:block}.backend-config{margin-top:10px}.backend-config summary{color:#a78bfa}.backend-state{font-size:11px;color:#94a3b8;margin-top:6px}.image-ai-box button.primary2{background:#6d28d9}.image-ai-box button.primary2:hover{background:#7c3aed}@media(max-width:480px){.image-actions{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  const box=document.createElement("div");
  box.className="image-ai-box";
  box.innerHTML=`
    <div class="image-ai-title"><span>📷 KUVA → AI → CAD</span><span class="ai-stage">BETA</span></div>
    <p class="ai-help">Lisää kuva osasta galleriasta, tiedostoista tai ota uusi kuva. AI ei arvaa mittakaavaa kuvasta, vaan kysyy tarvittavat mitat ennen 3D-mallin luontia.</p>
    <div class="image-ai-grid">
      <label class="image-drop" id="imageDrop"><input id="imageFile" type="file" accept="image/*"><span id="imageDropText">NAPAUTA JA VALITSE KUVA GALLERIASTA / KAMERASTA</span><img id="imagePreview" class="image-preview" hidden alt="Valittu osa"></label>
      <textarea id="imageNote" rows="2" placeholder="Valinnainen lisätieto, esim. 'haluan tästä samanlaisen kiinnikkeen'..."></textarea>
      <div class="image-actions"><button id="btnImageAnalyze" class="primary2" disabled>ANALYSOI KUVA</button><button id="btnImageClear" class="ghost">TYHJENNÄ</button></div>
      <div id="imageStatus" class="ai-status">Valitse ensin kuva.</div>
      <div id="imageResult" class="image-result" hidden></div>
      <div id="imageQuestions" class="image-questions"></div>
      <button id="btnImageFinalize" class="primary2" hidden>LUO CAD-EHDOTUS MITOISTA</button>
      <div id="imageCadProposal" class="image-result" hidden></div>
      <button id="btnImageAccept" class="primary" hidden>HYVÄKSY JA LUO 3D-MALLI</button>
      <details class="backend-config"><summary>AI-palvelimen asetus</summary><label>Backend URL<input id="imageApiUrl" type="url" placeholder="https://..." autocomplete="off"></label><div class="backend-state">API-avain tallennetaan vain palvelimelle. Sitä ei syötetä tähän sovellukseen.</div></details>
    </div>`;
  host.insertBefore(box,textAi);

  let imageData=null,analysis=null,cadProposal=null;
  const apiInput=$("imageApiUrl");
  apiInput.value=localStorage.getItem("ai3d:imageApiUrl")||"";
  apiInput.addEventListener("change",()=>localStorage.setItem("ai3d:imageApiUrl",apiInput.value.trim().replace(/\/$/,"")));
  const endpoint=path=>{const base=apiInput.value.trim().replace(/\/$/,"");if(!base)throw Error("AI-backendia ei ole vielä yhdistetty. Lisää Backend URL.");return base+path};

  function readFile(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error("Kuvan lukeminen epäonnistui."));r.readAsDataURL(file)})}
  $("imageFile").addEventListener("change",async e=>{const f=e.target.files?.[0];if(!f)return;if(!f.type.startsWith("image/")){$("imageStatus").textContent="Valitse kuvatiedosto.";return}if(f.size>8*1024*1024){$("imageStatus").textContent="Kuva on liian suuri. Maksimi 8 Mt.";return}imageData=await readFile(f);$("imagePreview").src=imageData;$("imagePreview").hidden=false;$("imageDropText").hidden=true;$("btnImageAnalyze").disabled=false;$("imageStatus").textContent="Kuva valmis analysoitavaksi.";analysis=null;cadProposal=null;$("imageResult").hidden=true;$("imageQuestions").innerHTML="";$("btnImageFinalize").hidden=true;$("imageCadProposal").hidden=true;$("btnImageAccept").hidden=true});

  async function post(path,payload){const res=await fetch(endpoint(path),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});const data=await res.json().catch(()=>({}));if(!res.ok)throw Error(data.error||`Palvelinvirhe ${res.status}`);return data}

  $("btnImageAnalyze").onclick=async()=>{if(!imageData)return;try{$("btnImageAnalyze").disabled=true;$("imageStatus").textContent="AI analysoi kuvaa…";analysis=await post("/api/image/analyze",{image:imageData,note:$("imageNote").value.trim()});$("imageResult").hidden=false;$("imageResult").innerHTML=`<b>Tunnistus:</b> ${analysis.summary||"–"}<br><b>Osatyyppi:</b> ${analysis.partType||"tuntematon"}${analysis.confidence?` • varmuus ${Math.round(analysis.confidence*100)} %`:""}${analysis.warnings?.length?`<br><br>⚠ ${analysis.warnings.join("<br>⚠ ")}`:""}`;const qs=Array.isArray(analysis.questions)?analysis.questions:[];$("imageQuestions").innerHTML=qs.map((q,i)=>`<label>${q.label||q.question||`Mitta ${i+1}`}<input class="image-answer" data-key="${q.key||`q${i}`}" type="text" inputmode="decimal" placeholder="${q.example||"esim. 20 mm"}"></label>`).join("");$("btnImageFinalize").textContent=qs.length?"LUO CAD-EHDOTUS MITOISTA":"LUO CAD-EHDOTUS";$("btnImageFinalize").hidden=false;$("imageStatus").textContent=qs.length?"AI tarvitsee vielä alla olevat mitat.":"Kuva tunnistettu. Voit muodostaa CAD-ehdotuksen."}catch(e){$("imageStatus").textContent="Virhe: "+e.message}finally{$("btnImageAnalyze").disabled=false}};

  $("btnImageFinalize").onclick=async()=>{if(!analysis)return;try{const answers={};document.querySelectorAll(".image-answer").forEach(x=>{if(x.value.trim())answers[x.dataset.key]=x.value.trim()});$("imageStatus").textContent="AI muodostaa CAD-parametreja…";cadProposal=await post("/api/image/finalize",{analysis,answers,note:$("imageNote").value.trim()});if(!cadProposal?.partType||!cadProposal?.values)throw Error("AI ei palauttanut käyttökelpoisia CAD-parametreja.");$("imageCadProposal").hidden=false;$("imageCadProposal").innerHTML=`<b>CAD-ehdotus:</b> ${cadProposal.explanation||cadProposal.partType}<br>${Object.entries(cadProposal.values).map(([k,v])=>`${k}: <b>${v}</b>`).join(" • ")}${cadProposal.warnings?.length?`<br><br>⚠ ${cadProposal.warnings.join("<br>⚠ ")}`:""}`;$("btnImageAccept").hidden=false;$("imageStatus").textContent="Tarkista ehdotus. Mallia ei muuteta ennen hyväksyntää."}catch(e){$("imageStatus").textContent="Virhe: "+e.message}};

  $("btnImageAccept").onclick=()=>{if(!cadProposal)return;try{if(cadProposal.material&&$("material"))$("material").value=cadProposal.material;window.AI3D.setPart(cadProposal.partType,cadProposal.values);$("imageStatus").textContent="✓ Kuva-AI:n CAD-ehdotus hyväksytty ja 3D-malli luotu.";document.querySelector(".preview-panel")?.scrollIntoView({behavior:"smooth",block:"start"})}catch(e){$("imageStatus").textContent="Virhe CAD-mallissa: "+e.message}};

  $("btnImageClear").onclick=()=>{$("imageFile").value="";imageData=analysis=cadProposal=null;$("imagePreview").hidden=true;$("imagePreview").removeAttribute("src");$("imageDropText").hidden=false;$("btnImageAnalyze").disabled=true;$("imageResult").hidden=true;$("imageQuestions").innerHTML="";$("btnImageFinalize").hidden=true;$("imageCadProposal").hidden=true;$("btnImageAccept").hidden=true;$("imageStatus").textContent="Valitse ensin kuva."};
})();