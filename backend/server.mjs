import express from "express";
import cors from "cors";

const app=express();
const PORT=Number(process.env.PORT||8787);
const OPENAI_API_KEY=process.env.OPENAI_API_KEY;
const MODEL=process.env.OPENAI_MODEL||"gpt-5.6-terra";
const ALLOWED_ORIGIN=process.env.ALLOWED_ORIGIN||"https://vilmusenahojuha-stack.github.io";

app.use(cors({origin(origin,cb){if(!origin||origin===ALLOWED_ORIGIN||origin.startsWith("http://localhost:")||origin.startsWith("http://127.0.0.1:"))return cb(null,true);cb(new Error("Origin not allowed"));}}));
app.use(express.json({limit:"12mb"}));

function requireKey(req,res,next){if(!OPENAI_API_KEY)return res.status(503).json({error:"OPENAI_API_KEY puuttuu palvelimelta."});next()}
function cleanJson(text){const s=String(text||"").trim().replace(/^```json\s*/i,"").replace(/^```\s*/,"").replace(/```$/," ").trim();return JSON.parse(s)}
async function openai(input){
  const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${OPENAI_API_KEY}`},body:JSON.stringify({model:MODEL,input})});
  const data=await r.json();
  if(!r.ok)throw new Error(data?.error?.message||`OpenAI API ${r.status}`);
  const text=data.output_text||data.output?.flatMap(x=>x.content||[]).map(x=>x.text).filter(Boolean).join("\n")||"";
  return cleanJson(text);
}

app.get("/health",(req,res)=>res.json({ok:true,model:MODEL,keyConfigured:Boolean(OPENAI_API_KEY)}));

app.post("/api/image/analyze",requireKey,async(req,res)=>{
  try{
    const {image,note=""}=req.body||{};
    if(typeof image!=="string"||!image.startsWith("data:image/"))return res.status(400).json({error:"Kuva puuttuu tai formaatti ei kelpaa."});
    const prompt=`Olet mekaanisen 3D-tulostuksen CAD-avustaja. Analysoi käyttäjän kuva vain geometrisen suunnittelun kannalta. Älä arvaa mittakaavaa kuvasta. Tunnista lähin tuettu osatyyppi: spike (piikkimutterinsuojus), plug (suorakaideputken päätytulppa), sleeve (holkki/soviterengas), plate (levy/kiinnike). Jos mikään ei sovi, partType voi olla unknown. Kysy vain ne fyysiset mitat, joita tarvitaan mallin muodostamiseen. Jokaisella kysymyksellä on lyhyt key, suomalainen label ja esimerkki. Palauta VAIN JSON tässä muodossa: {"summary":"...","partType":"spike|plug|sleeve|plate|unknown","confidence":0.0,"questions":[{"key":"...","label":"...","example":"..."}],"visibleFeatures":["..."],"warnings":["..."]}. Käyttäjän lisätieto: ${note||"ei lisätietoa"}`;
    const result=await openai([{role:"user",content:[{type:"input_text",text:prompt},{type:"input_image",image_url:image}]}]);
    res.json(result);
  }catch(e){res.status(500).json({error:e.message})}
});

app.post("/api/image/finalize",requireKey,async(req,res)=>{
  try{
    const {analysis,answers={},note=""}=req.body||{};
    if(!analysis||typeof analysis!=="object")return res.status(400).json({error:"Kuva-analyysi puuttuu."});
    const prompt=`Muunna seuraava kuva-analyysi ja käyttäjän mitat AI 3D Studio -sovelluksen CAD-parametreiksi. Älä keksi kriittisiä mittoja. Jos arvoa ei voi turvallisesti päätellä, lisää se missing-listaan. Tuetut parametrit:
spike: nutAf, clearance, lockAmount, lockZ, wall, baseHeight, totalHeight, tipRadius.
plug: tubeW, tubeH, tubeWall, plugClear, insertDepth, capThickness, capOverhang.
sleeve: sleeveID, sleeveWall, sleeveLength.
plate: plateL, plateW, plateT, plateHolePattern (none|center|four), plateHoleD, plateHoleEdge, plateCornerStyle (square|round|chamfer), plateCornerSize.
Materiaali voi olla PLA, PETG tai ASA. Palauta VAIN JSON: {"partType":"spike|plug|sleeve|plate","values":{},"material":"PLA|PETG|ASA","missing":[],"explanation":"...","warnings":[]}.
Analyysi: ${JSON.stringify(analysis)}
Käyttäjän vastaukset: ${JSON.stringify(answers)}
Lisätieto: ${note||"ei lisätietoa"}`;
    const result=await openai(prompt);
    if(Array.isArray(result.missing)&&result.missing.length)return res.status(422).json({error:`Tarvitaan vielä: ${result.missing.join(", ")}`,result});
    res.json(result);
  }catch(e){res.status(500).json({error:e.message})}
});

app.use((err,req,res,next)=>res.status(403).json({error:err.message||"Pyyntö estettiin."}));
app.listen(PORT,()=>console.log(`AI 3D Studio backend listening on ${PORT}`));
