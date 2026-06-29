import { useState, useEffect, useCallback } from "react";

// ─── SUPABASE CONFIG ────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://pdzdjfmkwvvaufxrolbo.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkemRqZm1rd3Z2YXVmeHJvbGJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3MzQ4MDEsImV4cCI6MjA5ODMxMDgwMX0.XJgkPSDn053T9vQLBpIC8TdOJnGTsHmfTcPXv-IW0eE";
const HEADERS = { "Content-Type": "application/json", "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Prefer": "return=representation" };

async function dbGet(table, params = "") {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, { headers: HEADERS });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
async function dbInsert(table, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, { method: "POST", headers: HEADERS, body: JSON.stringify(data) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
async function dbUpdate(table, id, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, { method: "PATCH", headers: HEADERS, body: JSON.stringify(data) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
async function dbDelete(table, id) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, { method: "DELETE", headers: HEADERS });
  if (!res.ok) throw new Error(await res.text());
}
async function dbGetBloqueos() { return dbGet("bloqueos","order=fecha_desde"); }
function estaBloquado(bloqueos, medicoId, fecha, hora) {
  return bloqueos.some(b => {
    if(b.medico_id && b.medico_id !== medicoId) return false;
    if(fecha < b.fecha_desde || fecha > b.fecha_hasta) return false;
    if(b.tipo === "dia_completo") return true;
    if(b.hora_desde && b.hora_hasta && hora) return hora >= b.hora_desde && hora <= b.hora_hasta;
    return false;
  });
}

// ─── DATOS INICIALES (se usan solo si la BD está vacía) ─────────────────────────
const ESTUDIOS_SEED = [
  { id:"consulta",   label:"Consulta clínica",      duracion:30, color:"#2563EB", icon:"🫀", orden:1 },
  { id:"eco",        label:"Ecocardiograma",         duracion:45, color:"#7C3AED", icon:"📡", orden:2 },
  { id:"holter",     label:"Holter de ritmo (24hs)", duracion:20, color:"#0891B2", icon:"📟", orden:3 },
  { id:"ergometria", label:"Ergometría",             duracion:60, color:"#D97706", icon:"🏃", orden:4 },
  { id:"mapa",       label:"MAPA (presión 24hs)",    duracion:20, color:"#059669", icon:"💊", orden:5 },
  { id:"ecg",        label:"Electrocardiograma",     duracion:15, color:"#DC2626", icon:"📈", orden:6 },
];
const MEDICOS_SEED = [
  { id:"m1", nombre:"Dr. Alejandro Soria",     matricula:"MP 45.231", especialidad:"Cardiología Clínica",          avatar:"AS", estudios:["consulta","ecg","holter"],            horario:{1:["08:00","08:30","09:00","09:30","10:00","10:30","11:00"],3:["08:00","08:30","09:00","09:30","10:00","10:30","11:00"],5:["08:00","08:30","09:00","09:30"]} },
  { id:"m2", nombre:"Dra. Valeria Russo",      matricula:"MP 52.108", especialidad:"Ecocardiografía",              avatar:"VR", estudios:["eco","consulta","ecg"],                horario:{2:["09:00","09:30","10:00","10:30","11:00","11:30","14:00","14:30"],4:["09:00","09:30","10:00","10:30","11:00","11:30"]} },
  { id:"m3", nombre:"Dr. Martín Ferreyra",     matricula:"MP 38.770", especialidad:"Cardiología del Ejercicio",    avatar:"MF", estudios:["ergometria","ecg","consulta"],         horario:{1:["14:00","14:30","15:00","15:30","16:00","16:30"],3:["14:00","14:30","15:00","15:30","16:00","16:30"],5:["14:00","14:30","15:00","15:30"]} },
  { id:"m4", nombre:"Dra. Claudia Nievas",     matricula:"MP 61.445", especialidad:"Hipertensión Arterial",        avatar:"CN", estudios:["mapa","consulta","ecg","holter"],      horario:{2:["08:00","08:30","09:00","09:30","10:00"],4:["08:00","08:30","09:00","09:30","10:00","14:00","14:30"]} },
  { id:"m5", nombre:"Dr. Pablo Ledesma",       matricula:"MP 49.002", especialidad:"Cardiología Intervencionista", avatar:"PL", estudios:["consulta","eco","ecg"],                horario:{1:["10:00","10:30","11:00","11:30"],2:["10:00","10:30","11:00","11:30"],3:["10:00","10:30","11:00","11:30"],4:["10:00","10:30","11:00","11:30"],5:["10:00","10:30","11:00","11:30"]} },
];

// ─── CONSTANTES ──────────────────────────────────────────────────────────────────
const PASSWORD_CONSULTORIO = import.meta.env.VITE_PASSWORD_CONSULTORIO || "puntomed2024";
const DIRECCION = "San Martín 2281, Piso 6 · Posadas, Misiones";
const MAPS_URL  = "https://maps.app.goo.gl/bveLkd2FEm6fWBLbA";
const MONTH_NAMES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DAY_LABELS  = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
const DAY_NAMES   = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
const COLORS_PRESET = ["#2563EB","#7C3AED","#0891B2","#D97706","#059669","#DC2626","#0F766E","#9333EA","#C2410C","#0369A1"];
const ICONS_PRESET  = ["🫀","📡","📟","🏃","💊","📈","🩺","🔬","🧬","💉","🩻","⚕️"];

// ─── HELPERS ─────────────────────────────────────────────────────────────────────
function isoDate(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function todayIso() { return isoDate(new Date()); }
function addDays(d,n) { const r=new Date(d); r.setDate(r.getDate()+n); return r; }
function dayOfWeek(iso) { return new Date(iso+"T12:00:00").getDay(); }
function formatDate(iso) { const [,m,d]=iso.split("-"); return `${d}/${m}`; }
function initials(n="") { return n.split(" ").filter(w=>w.length>2).slice(0,2).map(w=>w[0].toUpperCase()).join(""); }
function genId(p) { return p+Date.now()+Math.random().toString(36).slice(2,5); }
function generateSlots(desde, hasta, intervalo) {
  const slots=[]; let [h,m]=desde.split(":").map(Number); const [hf,mf]=hasta.split(":").map(Number);
  while(h<hf||(h===hf&&m<mf)){slots.push(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`);m+=intervalo;if(m>=60){h+=Math.floor(m/60);m=m%60;}}
  return slots;
}

// ─── TOKENS ──────────────────────────────────────────────────────────────────────
const C={navy:"#0F172A",navyMid:"#1E3A5F",blue:"#1D4ED8",bluePale:"#EFF6FF",slate:"#475569",mist:"#F1F5F9",border:"#E2E8F0",white:"#FFFFFF",success:"#16A34A",successPale:"#F0FDF4",warn:"#D97706",warnPale:"#FFFBEB",danger:"#DC2626",dangerPale:"#FEF2F2"};

// ─── UI ATOMS ─────────────────────────────────────────────────────────────────────
function Av({ini,color="#1D4ED8",size=36}){return <div style={{width:size,height:size,borderRadius:"50%",background:color+"22",border:`2px solid ${color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.33,fontWeight:800,color,flexShrink:0,fontFamily:"monospace"}}>{ini}</div>;}
function Chip({children,color=C.blue,active,onClick}){return <button onClick={onClick} style={{padding:"6px 14px",borderRadius:"99px",border:"1.5px solid",borderColor:active?color:C.border,background:active?color+"18":C.white,color:active?color:C.slate,fontWeight:active?700:500,fontSize:"13px",cursor:"pointer",whiteSpace:"nowrap",transition:"all .15s"}}>{children}</button>;}

function Btn({children,onClick,variant="primary",sm,disabled,full,style:extraStyle={}}){
  const v={primary:{background:C.blue,color:"#fff",border:"none"},secondary:{background:C.mist,color:C.navy,border:"none"},outline:{background:"transparent",color:C.blue,border:`1.5px solid ${C.blue}`},danger:{background:"transparent",color:C.danger,border:`1.5px solid ${C.danger}`},success:{background:C.success,color:"#fff",border:"none"},ghost:{background:"transparent",color:C.slate,border:`1.5px solid ${C.border}`}};
  return <button onClick={disabled?undefined:onClick} style={{...v[variant],borderRadius:"10px",cursor:disabled?"not-allowed":"pointer",fontWeight:600,fontSize:sm?"13px":"15px",padding:sm?"6px 14px":"11px 22px",opacity:disabled?.45:1,width:full?"100%":"auto",transition:"all .15s",...extraStyle}}>{children}</button>;
}

function Card({children,style={}}){return <div style={{background:C.white,borderRadius:"14px",border:`1px solid ${C.border}`,padding:"20px",...style}}>{children}</div>;}
function Fld({label,value,onChange,type="text",placeholder,required,min,max}){return <div style={{marginBottom:"14px"}}><label style={{display:"block",fontSize:"12px",fontWeight:700,color:C.slate,marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.5px"}}>{label}{required&&<span style={{color:C.danger}}> *</span>}</label><input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} min={min} max={max} style={{width:"100%",padding:"10px 13px",borderRadius:"9px",border:`1.5px solid ${C.border}`,fontSize:"15px",color:C.navy,outline:"none",boxSizing:"border-box",background:C.white}}/></div>;}
function Toast({msg,type="success",onClose}){useEffect(()=>{const t=setTimeout(onClose,3800);return()=>clearTimeout(t);},[]);const map={success:[C.success,C.successPale],warn:[C.warn,C.warnPale],danger:[C.danger,C.dangerPale]};const[c,bg]=map[type]||map.success;return <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:bg,border:`1.5px solid ${c}`,color:c,borderRadius:"12px",padding:"13px 26px",fontWeight:600,fontSize:"15px",zIndex:9999,boxShadow:"0 4px 24px rgba(0,0,0,0.12)",maxWidth:"90vw",textAlign:"center"}}>{msg}</div>;}
function Modal({title,children,onClose}){return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}}><div style={{background:C.white,borderRadius:"16px",width:"100%",maxWidth:520,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 8px 40px rgba(0,0,0,0.2)"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"18px 20px",borderBottom:`1px solid ${C.border}`}}><div style={{fontWeight:800,fontSize:"17px",color:C.navy}}>{title}</div><button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:"22px",color:C.slate,lineHeight:1}}>×</button></div><div style={{padding:"20px"}}>{children}</div></div></div>;}
function Rw({label,val,last}){return <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",paddingBottom:last?"0":"8px",marginBottom:last?"0":"8px",borderBottom:last?"none":`1px solid ${C.border}`}}><span style={{fontSize:"12px",fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:"0.4px"}}>{label}</span><span style={{fontSize:"14px",fontWeight:600,color:C.navy,textAlign:"right",maxWidth:"60%"}}>{val}</span></div>;}
function BtnBack({onClick}){return <button onClick={onClick} style={{background:"none",border:"none",cursor:"pointer",color:C.blue,fontWeight:600,fontSize:"14px",padding:"0",marginBottom:"16px",display:"flex",alignItems:"center",gap:"4px"}}>← Volver</button>;}
function StepTitle({n,total,label}){return <div style={{marginBottom:"16px"}}><div style={{fontSize:"11px",fontWeight:700,color:C.slate,letterSpacing:"1px",textTransform:"uppercase",marginBottom:"4px"}}>Paso {n} de {total}</div><div style={{fontWeight:800,color:C.navy,fontSize:"18px"}}>{label}</div></div>;}

function Spinner(){return <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"48px"}}><div style={{width:36,height:36,border:`3px solid ${C.border}`,borderTop:`3px solid ${C.blue}`,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;}

// ─── MINI CALENDAR ────────────────────────────────────────────────────────────────
function MiniCalendar({selected,onSelect,turnos,medicoId,adminMode,bloqueos=[]}){
  const[cursor,setCursor]=useState(()=>{const d=new Date();d.setDate(1);return d;});
  const hoy=todayIso();
  const firstDay=new Date(cursor.getFullYear(),cursor.getMonth(),1).getDay();
  const dim=new Date(cursor.getFullYear(),cursor.getMonth()+1,0).getDate();
  const cells=[];for(let i=0;i<firstDay;i++)cells.push(null);for(let d=1;d<=dim;d++)cells.push(d);
  function iso(d){return `${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;}
  function hasTurno(d){return turnos.some(t=>t.fecha===iso(d)&&t.estado!=="cancelado"&&(!medicoId||t.medico_id===medicoId));}
  function isDis(d){if(adminMode)return false;const i=iso(d);const dow=new Date(i+"T12:00:00").getDay();if(dow===0||dow===6||i<hoy)return true;if(medicoId&&bloqueos)return estaBloquado(bloqueos,medicoId,i,null)&&bloqueos.some(b=>b.tipo==="dia_completo"&&(!b.medico_id||b.medico_id===medicoId)&&i>=b.fecha_desde&&i<=b.fecha_hasta);return false;}
  return(<div>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"10px"}}>
      <button onClick={()=>setCursor(c=>new Date(c.getFullYear(),c.getMonth()-1,1))} style={{background:"none",border:"none",cursor:"pointer",fontSize:"20px",color:C.slate,padding:"4px 8px"}}>‹</button>
      <span style={{fontWeight:700,color:C.navy,fontSize:"14px"}}>{MONTH_NAMES[cursor.getMonth()]} {cursor.getFullYear()}</span>
      <button onClick={()=>setCursor(c=>new Date(c.getFullYear(),c.getMonth()+1,1))} style={{background:"none",border:"none",cursor:"pointer",fontSize:"20px",color:C.slate,padding:"4px 8px"}}>›</button>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"2px",textAlign:"center"}}>
      {DAY_LABELS.map(d=><div key={d} style={{fontSize:"11px",fontWeight:700,color:C.slate,padding:"3px 0"}}>{d}</div>)}
      {cells.map((d,i)=>{
        if(!d)return<div key={`e${i}`}/>;
        const isoD=iso(d);const sel=isoD===selected;const dis=isDis(d);const dot=hasTurno(d);
        return<div key={d} onClick={()=>!dis&&onSelect(isoD)} style={{padding:"5px 2px",borderRadius:"8px",cursor:dis?"default":"pointer",background:sel?C.blue:"transparent",color:sel?"#fff":dis?"#CBD5E1":C.navy,fontWeight:sel?700:400,fontSize:"13px",opacity:dis&&!sel?.4:1,position:"relative"}}>
          {d}{dot&&!sel&&<span style={{display:"block",width:"4px",height:"4px",borderRadius:"50%",background:C.blue,margin:"1px auto 0"}}/>}
        </div>;
      })}
    </div>
  </div>);
}

// ─── MEDICO CARD ──────────────────────────────────────────────────────────────────
function MedicoCard({medico,selected,onClick,turnos,fecha,estudios}){
  const eMap=Object.fromEntries(estudios.map(e=>[e.id,e]));
  const ocu=fecha?turnos.filter(t=>t.medico_id===medico.id&&t.fecha===fecha&&t.estado!=="cancelado").map(t=>t.hora):[];
  const dow=fecha?dayOfWeek(fecha):null;
  const slots=dow?(medico.horario[dow]||[]):[];
  const libres=slots.filter(s=>!ocu.includes(s)).length;
  return(
    <button onClick={onClick} style={{width:"100%",textAlign:"left",background:selected?C.bluePale:C.white,border:`1.5px solid ${selected?C.blue:C.border}`,borderRadius:"12px",padding:"14px",cursor:"pointer",transition:"all .15s"}}>
      <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
        <Av ini={medico.avatar||initials(medico.nombre)} color={selected?C.blue:"#475569"} size={40}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:700,color:C.navy,fontSize:"15px"}}>{medico.nombre}</div>
          <div style={{fontSize:"12px",color:C.slate}}>{medico.especialidad}</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:"4px",marginTop:"6px"}}>
            {(medico.estudios||[]).map(eid=>{const e=eMap[eid];return e?<span key={eid} style={{fontSize:"11px",padding:"2px 7px",borderRadius:"99px",background:e.color+"18",color:e.color,fontWeight:600}}>{e.icon} {e.label}</span>:null;})}
          </div>
        </div>
        {fecha&&<div style={{textAlign:"center",flexShrink:0}}><div style={{fontSize:"18px",fontWeight:800,color:libres>0?C.blue:C.slate}}>{libres}</div><div style={{fontSize:"10px",color:C.slate,fontWeight:600}}>libres</div></div>}
      </div>
    </button>
  );
}

// ─── STEP FECHA/HORA ──────────────────────────────────────────────────────────────
function StepFechaHora({medicoId,estudioId,selFecha,setSelFecha,selHora,setSelHora,turnos,medicos,estudios,bloqueos=[],onNext,onBack,stepN,totalSteps}){
  const mMap=Object.fromEntries(medicos.map(m=>[m.id,m]));const eMap=Object.fromEntries(estudios.map(e=>[e.id,e]));const m=mMap[medicoId];
  const libres=selFecha?(()=>{const dow=dayOfWeek(selFecha);const todos=m?.horario[dow]||[];const ocu=turnos.filter(t=>t.medico_id===medicoId&&t.fecha===selFecha&&t.estado!=="cancelado").map(t=>t.hora);return todos.map(h=>({h,libre:!ocu.includes(h)&&!estaBloquado(bloqueos||[],medicoId,selFecha,h)}));})():[];
  return(<div>
    <BtnBack onClick={onBack}/>
    <StepTitle n={stepN} total={totalSteps} label="Elegí fecha y horario"/>
    <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"16px",padding:"10px 12px",borderRadius:"10px",background:C.mist}}>
      <Av ini={m?.avatar||initials(m?.nombre||"")} size={32}/>
      <div style={{flex:1,fontSize:"13px"}}><span style={{fontWeight:700,color:C.navy}}>{m?.nombre}</span><span style={{color:C.slate}}> · {eMap[estudioId]?.icon} {eMap[estudioId]?.label}</span></div>
    </div>
    <Card style={{marginBottom:"14px"}}><MiniCalendar selected={selFecha} onSelect={setSelFecha} turnos={turnos} medicoId={medicoId} bloqueos={bloqueos}/></Card>
    {selFecha&&<Card style={{marginBottom:"14px"}}>
      <div style={{fontWeight:700,color:C.navy,marginBottom:"10px",fontSize:"14px"}}>Horarios — {formatDate(selFecha)}</div>
      {libres.length===0?<p style={{color:C.slate,fontSize:"14px",margin:0}}>El médico no atiende este día.</p>
        :<div style={{display:"flex",flexWrap:"wrap",gap:"8px"}}>{libres.map(({h,libre})=><button key={h} onClick={()=>libre&&setSelHora(h)} style={{padding:"8px 14px",borderRadius:"9px",border:"1.5px solid",borderColor:selHora===h?C.blue:libre?"#CBD5E1":"#F0F0F0",background:selHora===h?C.blue:libre?C.white:"#FAFAFA",color:selHora===h?"#fff":libre?C.navy:"#C0C0C0",fontWeight:selHora===h?700:400,fontSize:"14px",cursor:libre?"pointer":"not-allowed",textDecoration:libre?"none":"line-through"}}>{h}</button>)}</div>}
    </Card>}
    <Btn full disabled={!selFecha||!selHora} onClick={onNext}>Continuar →</Btn>
  </div>);
}

// ─── STEP DATOS ───────────────────────────────────────────────────────────────────
function StepDatos({form,setForm,onBack,onConfirm,resumen,stepN,totalSteps,saving}){
  const{medico,estudio,fecha,hora}=resumen;const ok=form.nombre&&form.dni&&form.telefono&&form.email;
  return(<div>
    <BtnBack onClick={onBack}/>
    <StepTitle n={stepN} total={totalSteps} label="Tus datos"/>
    <Card style={{marginBottom:"14px",background:C.bluePale,border:`1px solid ${C.blue}33`}}>
      <Rw label="Médico" val={medico?.nombre}/><Rw label="Estudio" val={`${estudio?.icon} ${estudio?.label}`}/><Rw label="Fecha" val={`${formatDate(fecha)} · ${hora}`} last/>
    </Card>
    <Card style={{marginBottom:"14px"}}>
      <Fld label="Nombre y apellido" value={form.nombre} onChange={v=>setForm(f=>({...f,nombre:v}))} required placeholder="Ej: María García"/>
      <Fld label="DNI" value={form.dni} onChange={v=>setForm(f=>({...f,dni:v}))} required placeholder="Ej: 32145678"/>
      <Fld label="Teléfono / WhatsApp" value={form.telefono} onChange={v=>setForm(f=>({...f,telefono:v}))} required placeholder="Ej: 11-1234-5678"/>
      <Fld label="Email" type="email" value={form.email} onChange={v=>setForm(f=>({...f,email:v}))} placeholder="Ej: maria@email.com"/>
    </Card>
    <Btn full disabled={!ok||saving} onClick={onConfirm}>{saving?"Guardando...":"Confirmar turno ✓"}</Btn>
  </div>);
}

// ─── VISTA PACIENTE ───────────────────────────────────────────────────────────────
function PatientView({turnos,medicos,estudios,bloqueos=[],onBook,onCancel}){
  const[modo,setModo]=useState(null);const[step,setStep]=useState(1);
  const[selMedico,setSelMedico]=useState(null);const[selEstudio,setSelEstudio]=useState(null);
  const[selFecha,setSelFecha]=useState(null);const[selHora,setSelHora]=useState(null);
  const[form,setForm]=useState({nombre:"",dni:"",telefono:"",email:""});
  const[done,setDone]=useState(null);const[dniSearch,setDniSearch]=useState("");const[misRes,setMisRes]=useState([]);
  const[saving,setSaving]=useState(false);
  const eMap=Object.fromEntries(estudios.map(e=>[e.id,e]));const mMap=Object.fromEntries(medicos.map(m=>[m.id,m]));
  const medCon=selEstudio?medicos.filter(m=>(m.estudios||[]).includes(selEstudio)):medicos;
  function reset(){setModo(null);setStep(1);setSelMedico(null);setSelEstudio(null);setSelFecha(null);setSelHora(null);setForm({nombre:"",dni:"",telefono:"",email:""});setDone(null);}
  async function confirmar(){
    setSaving(true);
    try{
      const n={id:genId("t"),medico_id:selMedico,estudio_id:selEstudio,fecha:selFecha,hora:selHora,estado:"confirmado",...form};
      await onBook(n);setDone(n);
    }catch(e){alert("Error al guardar el turno. Intentá de nuevo.");}
    setSaving(false);
  }

  if(done){const m=mMap[done.medico_id];const e=eMap[done.estudio_id];return(
    <div style={{textAlign:"center",padding:"32px 0"}}>
      <div style={{fontSize:"52px",marginBottom:"12px"}}>✅</div>
      <h2 style={{color:C.success,margin:"0 0 6px",fontSize:"22px"}}>¡Turno confirmado!</h2>
      <p style={{color:C.slate,marginBottom:"20px",fontSize:"15px"}}>Te esperamos el <b>{formatDate(done.fecha)}</b> a las <b>{done.hora}</b></p>
      <Card style={{maxWidth:380,margin:"0 auto 24px",textAlign:"left"}}>
        <Rw label="Paciente" val={done.nombre}/><Rw label="Médico" val={m?.nombre}/><Rw label="Estudio" val={`${e?.icon} ${e?.label}`}/><Rw label="Fecha" val={`${formatDate(done.fecha)} · ${done.hora}`}/><Rw label="Consultorio" val={<a href={MAPS_URL} target="_blank" rel="noreferrer" style={{color:C.blue,textDecoration:"none"}}>{DIRECCION}</a>} last/>
      </Card>
      <p style={{color:C.slate,fontSize:"13px",marginBottom:"20px"}}>Recibirás un recordatorio por WhatsApp.</p>
      <Btn onClick={reset}>Sacar otro turno</Btn>
    </div>
  );}

  if(modo==="misturno")return(<div>
    <BtnBack onClick={reset}/>
    <h3 style={{margin:"0 0 16px",color:C.navy}}>Mis turnos</h3>
    <div style={{display:"flex",gap:"8px",marginBottom:"16px"}}>
      <input value={dniSearch} onChange={e=>setDniSearch(e.target.value)} placeholder="Ingresá tu DNI" style={{flex:1,padding:"10px 13px",borderRadius:"9px",border:`1.5px solid ${C.border}`,fontSize:"15px"}}/>
      <Btn sm onClick={()=>setMisRes(turnos.filter(t=>t.dni===dniSearch&&t.estado!=="cancelado"))}>Buscar</Btn>
    </div>
    {dniSearch&&misRes.length===0&&<p style={{color:C.slate,textAlign:"center"}}>No se encontraron turnos.</p>}
    {misRes.map(t=>{const m=mMap[t.medico_id];const e=eMap[t.estudio_id];return(
      <Card key={t.id} style={{marginBottom:"10px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"12px"}}>
          <div><div style={{fontWeight:700,color:C.navy}}>{formatDate(t.fecha)} · {t.hora}</div><div style={{fontSize:"13px",color:C.slate,marginTop:"2px"}}>{m?.nombre}</div><span style={{fontSize:"12px",padding:"2px 8px",borderRadius:"99px",background:(e?.color||"#888")+"18",color:e?.color||"#888",fontWeight:600}}>{e?.icon} {e?.label}</span></div>
          <Btn variant="danger" sm onClick={()=>{onCancel(t.id);setMisRes(p=>p.filter(x=>x.id!==t.id));}}>Cancelar</Btn>
        </div>
      </Card>
    );})}
  </div>);

  if(!modo)return(<div>
    <div style={{textAlign:"center",padding:"8px 0 24px"}}><div style={{fontWeight:800,fontSize:"22px",color:C.navy,marginBottom:"4px"}}>¿Cómo querés buscar turno?</div><p style={{color:C.slate,margin:0,fontSize:"14px"}}>Punto Med · Cardiología</p></div>
    <div style={{display:"flex",flexDirection:"column",gap:"12px",marginBottom:"24px"}}>
      {[["medico","👨‍⚕️","Elegir médico","Seleccionás al profesional y luego el tipo de estudio"],["estudio","🔬","Elegir estudio o consulta","Seleccionás el estudio y la app te muestra los médicos disponibles"]].map(([m,ic,ti,de])=>(
        <button key={m} onClick={()=>{setModo(m);setStep(1);}} style={{padding:"20px",borderRadius:"14px",border:`1.5px solid ${C.border}`,background:C.white,cursor:"pointer",textAlign:"left",transition:"all .15s"}}>
          <div style={{fontSize:"28px",marginBottom:"6px"}}>{ic}</div><div style={{fontWeight:700,color:C.navy,fontSize:"16px"}}>{ti}</div><div style={{fontSize:"13px",color:C.slate,marginTop:"2px"}}>{de}</div>
        </button>
      ))}
    </div>
    <button onClick={()=>setModo("misturno")} style={{width:"100%",padding:"12px",borderRadius:"10px",border:`1.5px solid ${C.border}`,background:"transparent",cursor:"pointer",color:C.slate,fontWeight:600,fontSize:"14px"}}>Ver / cancelar mis turnos →</button>
    <a href={MAPS_URL} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",gap:"10px",marginTop:"12px",padding:"14px",borderRadius:"12px",border:`1.5px solid ${C.border}`,background:C.white,textDecoration:"none"}}>
      <span style={{fontSize:"22px"}}>📍</span>
      <div style={{flex:1}}>
        <div style={{fontWeight:600,color:C.navy,fontSize:"14px"}}>{DIRECCION}</div>
        <div style={{fontSize:"12px",color:C.blue,marginTop:"2px"}}>Ver en Google Maps →</div>
      </div>
    </a>
  </div>);

  if(modo==="medico"){
    if(step===1)return(<div><BtnBack onClick={reset}/><StepTitle n={1} total={4} label="Elegí un médico"/><div style={{display:"flex",flexDirection:"column",gap:"10px"}}>{medicos.map(m=><MedicoCard key={m.id} medico={m} selected={selMedico===m.id} estudios={estudios} onClick={()=>{setSelMedico(m.id);setSelEstudio(null);setSelFecha(null);setSelHora(null);setStep(2);}} turnos={turnos}/>)}</div></div>);
    if(step===2){const m=mMap[selMedico];return(<div><BtnBack onClick={()=>setStep(1)}/><StepTitle n={2} total={4} label="Tipo de consulta o estudio"/><div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"16px",padding:"12px",borderRadius:"10px",background:C.mist}}><Av ini={m?.avatar||initials(m?.nombre||"")} size={36}/><div><div style={{fontWeight:700,color:C.navy,fontSize:"14px"}}>{m?.nombre}</div><div style={{fontSize:"12px",color:C.slate}}>{m?.especialidad}</div></div></div><div style={{display:"flex",flexDirection:"column",gap:"8px"}}>{(m?.estudios||[]).map(eid=>{const e=eMap[eid];return e?<button key={eid} onClick={()=>{setSelEstudio(eid);setSelFecha(null);setSelHora(null);setStep(3);}} style={{display:"flex",alignItems:"center",gap:"14px",padding:"14px",borderRadius:"12px",border:`1.5px solid ${selEstudio===eid?e.color:C.border}`,background:selEstudio===eid?e.color+"12":C.white,cursor:"pointer",textAlign:"left"}}><span style={{fontSize:"24px"}}>{e.icon}</span><div><div style={{fontWeight:600,color:C.navy,fontSize:"14px"}}>{e.label}</div><div style={{fontSize:"12px",color:C.slate}}>{e.duracion} min</div></div></button>:null;})}</div></div>);}
    if(step===3)return<StepFechaHora medicoId={selMedico} estudioId={selEstudio} selFecha={selFecha} setSelFecha={v=>{setSelFecha(v);setSelHora(null);}} selHora={selHora} setSelHora={setSelHora} turnos={turnos} medicos={medicos} estudios={estudios} bloqueos={bloqueos} onNext={()=>setStep(4)} onBack={()=>setStep(2)} stepN={3} totalSteps={4}/>;
    if(step===4)return<StepDatos form={form} setForm={setForm} onBack={()=>setStep(3)} onConfirm={confirmar} resumen={{medico:mMap[selMedico],estudio:eMap[selEstudio],fecha:selFecha,hora:selHora}} stepN={4} totalSteps={4} saving={saving}/>;
  }
  if(modo==="estudio"){
    if(step===1)return(<div><BtnBack onClick={reset}/><StepTitle n={1} total={4} label="¿Qué estudio o consulta necesitás?"/><div style={{display:"flex",flexDirection:"column",gap:"8px"}}>{estudios.map(e=><button key={e.id} onClick={()=>{setSelEstudio(e.id);setSelMedico(null);setSelFecha(null);setSelHora(null);setStep(2);}} style={{display:"flex",alignItems:"center",gap:"14px",padding:"14px",borderRadius:"12px",border:`1.5px solid ${selEstudio===e.id?e.color:C.border}`,background:selEstudio===e.id?e.color+"12":C.white,cursor:"pointer",textAlign:"left"}}><span style={{fontSize:"26px"}}>{e.icon}</span><div><div style={{fontWeight:600,color:C.navy,fontSize:"14px"}}>{e.label}</div><div style={{fontSize:"12px",color:C.slate}}>{e.duracion} min · {medicos.filter(m=>(m.estudios||[]).includes(e.id)).length} médicos</div></div></button>)}</div></div>);
    if(step===2)return(<div><BtnBack onClick={()=>setStep(1)}/><StepTitle n={2} total={4} label="Elegí un médico"/><div style={{fontSize:"13px",color:C.slate,marginBottom:"12px",padding:"8px 12px",background:C.bluePale,borderRadius:"8px"}}>{eMap[selEstudio]?.icon} Médicos que realizan <b>{eMap[selEstudio]?.label}</b></div><div style={{display:"flex",flexDirection:"column",gap:"10px"}}>{medCon.map(m=><MedicoCard key={m.id} medico={m} selected={selMedico===m.id} estudios={estudios} onClick={()=>{setSelMedico(m.id);setSelFecha(null);setSelHora(null);setStep(3);}} turnos={turnos}/>)}</div></div>);
    if(step===3)return<StepFechaHora medicoId={selMedico} estudioId={selEstudio} selFecha={selFecha} setSelFecha={v=>{setSelFecha(v);setSelHora(null);}} selHora={selHora} setSelHora={setSelHora} turnos={turnos} medicos={medicos} estudios={estudios} bloqueos={bloqueos} onNext={()=>setStep(4)} onBack={()=>setStep(2)} stepN={3} totalSteps={4}/>;
    if(step===4)return<StepDatos form={form} setForm={setForm} onBack={()=>setStep(3)} onConfirm={confirmar} resumen={{medico:mMap[selMedico],estudio:eMap[selEstudio],fecha:selFecha,hora:selHora}} stepN={4} totalSteps={4} saving={saving}/>;
  }
  return null;
}

// ─── TURNO CARD ───────────────────────────────────────────────────────────────────
function TurnoCard({turno,onCancel,eMap,mMap,showFecha}){
  const e=eMap[turno.estudio_id];const m=mMap[turno.medico_id];const cancelado=turno.estado==="cancelado";
  return(<Card style={{marginBottom:"10px",opacity:cancelado?.55:1}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"10px",flexWrap:"wrap"}}>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap",marginBottom:"4px"}}>
          <span style={{fontWeight:800,fontSize:"16px",color:C.navy}}>{showFecha&&<span style={{fontWeight:400,color:C.slate,fontSize:"13px"}}>{formatDate(turno.fecha)} · </span>}{turno.hora}</span>
          {e&&<span style={{fontSize:"12px",padding:"2px 8px",borderRadius:"99px",background:e.color+"18",color:e.color,fontWeight:600}}>{e.icon} {e.label}</span>}
          {cancelado&&<span style={{fontSize:"12px",padding:"2px 8px",borderRadius:"99px",background:C.mist,color:C.slate,fontWeight:600}}>Cancelado</span>}
        </div>
        <div style={{fontWeight:600,color:C.navy,fontSize:"14px"}}>{turno.nombre}</div>
        <div style={{fontSize:"12px",color:C.slate}}>DNI {turno.dni} · {turno.telefono}</div>
        {m&&<div style={{fontSize:"12px",color:C.slate,marginTop:"2px"}}>{m.nombre}</div>}
      </div>
      {!cancelado&&<Btn variant="danger" sm onClick={()=>onCancel(turno.id)}>Cancelar</Btn>}
    </div>
  </Card>);
}

// ─── MODAL MÉDICO ─────────────────────────────────────────────────────────────────
function ModalMedico({medico,estudios,onSave,onClose}){
  const[nombre,setNombre]=useState(medico?.nombre||"");
  const[matricula,setMatricula]=useState(medico?.matricula||"");
  const[especialidad,setEspecialidad]=useState(medico?.especialidad||"");
  const[selEst,setSelEst]=useState(medico?.estudios||[]);
  const[saving,setSaving]=useState(false);
  const[horario,setHorario]=useState(()=>{const h={};for(let d=1;d<=5;d++){const sl=medico?.horario?.[d];h[d]=sl&&sl.length>0?{desde:sl[0],hasta:sl[sl.length-1],intervalo:30,activo:true}:{desde:"09:00",hasta:"12:00",intervalo:30,activo:false};}return h;});
  function toggleD(d){setHorario(h=>({...h,[d]:{...h[d],activo:!h[d].activo}}));}
  function toggleE(id){setSelEst(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);}
  function buildH(){const h={};for(let d=1;d<=5;d++){if(horario[d].activo){const sl=generateSlots(horario[d].desde,horario[d].hasta,horario[d].intervalo);if(sl.length>0)h[d]=sl;}}return h;}
  const ok=nombre&&especialidad&&selEst.length>0&&Object.values(horario).some(d=>d.activo);
  async function handleSave(){setSaving(true);await onSave({id:medico?.id,nombre,matricula,especialidad,estudios:selEst,avatar:initials(nombre),horario:buildH()});setSaving(false);}
  return(<Modal title={medico?"Editar médico":"Nuevo médico"} onClose={onClose}>
    <Fld label="Nombre completo" value={nombre} onChange={setNombre} required placeholder="Ej: Dra. Ana Gómez"/>
    <Fld label="Matrícula" value={matricula} onChange={setMatricula} placeholder="Ej: MP 55.123"/>
    <Fld label="Especialidad" value={especialidad} onChange={setEspecialidad} required placeholder="Ej: Cardiología Clínica"/>
    <div style={{marginBottom:"14px"}}><div style={{fontSize:"12px",fontWeight:700,color:C.slate,marginBottom:"8px",textTransform:"uppercase",letterSpacing:"0.5px"}}>Estudios que realiza *</div><div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>{estudios.map(e=><button key={e.id} onClick={()=>toggleE(e.id)} style={{padding:"5px 11px",borderRadius:"99px",border:`1.5px solid ${selEst.includes(e.id)?e.color:C.border}`,background:selEst.includes(e.id)?e.color+"18":C.white,color:selEst.includes(e.id)?e.color:C.slate,fontWeight:600,fontSize:"12px",cursor:"pointer"}}>{e.icon} {e.label}</button>)}</div></div>
    <div style={{marginBottom:"18px"}}><div style={{fontSize:"12px",fontWeight:700,color:C.slate,marginBottom:"8px",textTransform:"uppercase",letterSpacing:"0.5px"}}>Días y horarios *</div>
      {[1,2,3,4,5].map(d=><div key={d} style={{marginBottom:"10px"}}>
        <label style={{display:"flex",alignItems:"center",gap:"6px",cursor:"pointer",fontWeight:600,color:C.navy,fontSize:"14px",marginBottom:"6px"}}><input type="checkbox" checked={horario[d].activo} onChange={()=>toggleD(d)} style={{width:16,height:16,cursor:"pointer"}}/>{DAY_NAMES[d]}</label>
        {horario[d].activo&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px",paddingLeft:"22px"}}>
          <div><div style={{fontSize:"11px",color:C.slate,marginBottom:"3px"}}>Desde</div><input type="time" value={horario[d].desde} onChange={e=>setHorario(h=>({...h,[d]:{...h[d],desde:e.target.value}}))} style={{width:"100%",padding:"6px 8px",borderRadius:"7px",border:`1px solid ${C.border}`,fontSize:"13px"}}/></div>
          <div><div style={{fontSize:"11px",color:C.slate,marginBottom:"3px"}}>Hasta</div><input type="time" value={horario[d].hasta} onChange={e=>setHorario(h=>({...h,[d]:{...h[d],hasta:e.target.value}}))} style={{width:"100%",padding:"6px 8px",borderRadius:"7px",border:`1px solid ${C.border}`,fontSize:"13px"}}/></div>
          <div><div style={{fontSize:"11px",color:C.slate,marginBottom:"3px"}}>Cada (min)</div><select value={horario[d].intervalo} onChange={e=>setHorario(h=>({...h,[d]:{...h[d],intervalo:Number(e.target.value)}}))} style={{width:"100%",padding:"6px 8px",borderRadius:"7px",border:`1px solid ${C.border}`,fontSize:"13px"}}>{[15,20,30,45,60].map(n=><option key={n} value={n}>{n}</option>)}</select></div>
        </div>}
      </div>)}
    </div>
    <div style={{display:"flex",gap:"10px",justifyContent:"flex-end"}}>
      <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
      <Btn disabled={!ok||saving} onClick={handleSave}>{saving?"Guardando...":medico?"Guardar cambios":"Agregar médico"}</Btn>
    </div>
  </Modal>);
}

// ─── MODAL ESTUDIO ────────────────────────────────────────────────────────────────
function ModalEstudio({estudio,onSave,onClose}){
  const[label,setLabel]=useState(estudio?.label||"");const[duracion,setDuracion]=useState(estudio?.duracion||30);const[color,setColor]=useState(estudio?.color||COLORS_PRESET[0]);const[icon,setIcon]=useState(estudio?.icon||ICONS_PRESET[0]);const[saving,setSaving]=useState(false);
  const ok=label&&duracion>0;
  async function handleSave(){setSaving(true);await onSave({id:estudio?.id,label,duracion,color,icon});setSaving(false);}
  return(<Modal title={estudio?"Editar estudio":"Nuevo estudio"} onClose={onClose}>
    <Fld label="Nombre del estudio" value={label} onChange={setLabel} required placeholder="Ej: Holter de presión"/>
    <Fld label="Duración (minutos)" type="number" value={duracion} onChange={v=>setDuracion(Number(v))} required min="5" max="240"/>
    <div style={{marginBottom:"14px"}}><div style={{fontSize:"12px",fontWeight:700,color:C.slate,marginBottom:"8px",textTransform:"uppercase",letterSpacing:"0.5px"}}>Ícono</div><div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>{ICONS_PRESET.map(ic=><button key={ic} onClick={()=>setIcon(ic)} style={{width:38,height:38,fontSize:"20px",borderRadius:"8px",border:`2px solid ${icon===ic?C.blue:C.border}`,background:icon===ic?C.bluePale:C.white,cursor:"pointer"}}>{ic}</button>)}</div></div>
    <div style={{marginBottom:"18px"}}><div style={{fontSize:"12px",fontWeight:700,color:C.slate,marginBottom:"8px",textTransform:"uppercase",letterSpacing:"0.5px"}}>Color</div><div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>{COLORS_PRESET.map(c=><button key={c} onClick={()=>setColor(c)} style={{width:30,height:30,borderRadius:"50%",background:c,cursor:"pointer",border:`3px solid ${color===c?"#000":"transparent"}`}}/>)}</div></div>
    <div style={{display:"flex",alignItems:"center",gap:"10px",padding:"10px 14px",borderRadius:"10px",background:C.mist,marginBottom:"18px"}}><span style={{fontSize:"24px"}}>{icon}</span><span style={{fontWeight:700,color:C.navy,fontSize:"15px"}}>{label||"Vista previa"}</span><span style={{marginLeft:"auto",fontSize:"12px",padding:"2px 8px",borderRadius:"99px",background:color+"18",color,fontWeight:600}}>{duracion} min</span></div>
    <div style={{display:"flex",gap:"10px",justifyContent:"flex-end"}}>
      <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
      <Btn disabled={!ok||saving} onClick={handleSave}>{saving?"Guardando...":estudio?"Guardar cambios":"Agregar estudio"}</Btn>
    </div>
  </Modal>);
}

// ─── CONFIG PANEL ─────────────────────────────────────────────────────────────────
function ConfigPanel({medicos,estudios,onUpdateMedicos,onUpdateEstudios}){
  const[sec,setSec]=useState("medicos");const[modM,setModM]=useState(null);const[modE,setModE]=useState(null);const[conf,setConf]=useState(null);
  return(<div>
    <div style={{display:"flex",gap:"8px",marginBottom:"16px"}}>{[["medicos","👨‍⚕️ Médicos"],["estudios","🔬 Estudios"]].map(([v,l])=><button key={v} onClick={()=>setSec(v)} style={{padding:"7px 16px",borderRadius:"9px",border:"1.5px solid",borderColor:sec===v?C.blue:C.border,background:sec===v?C.bluePale:C.white,color:sec===v?C.blue:C.slate,fontWeight:600,fontSize:"14px",cursor:"pointer"}}>{l}</button>)}</div>
    {sec==="medicos"&&<>{medicos.map(m=><Card key={m.id} style={{marginBottom:"10px"}}><div style={{display:"flex",alignItems:"center",gap:"12px"}}><Av ini={m.avatar||initials(m.nombre)} size={40}/><div style={{flex:1,minWidth:0}}><div style={{fontWeight:700,color:C.navy,fontSize:"15px"}}>{m.nombre}</div><div style={{fontSize:"12px",color:C.slate}}>{m.especialidad} · {m.matricula}</div><div style={{fontSize:"11px",color:C.slate,marginTop:"3px"}}>Estudios: {(m.estudios||[]).map(id=>estudios.find(e=>e.id===id)?.label||id).join(", ")}</div><div style={{fontSize:"11px",color:C.slate}}>Días: {Object.keys(m.horario||{}).map(d=>DAY_NAMES[d]).join(", ")}</div></div><div style={{display:"flex",flexDirection:"column",gap:"6px"}}><Btn sm variant="outline" onClick={()=>setModM(m)}>Editar</Btn><Btn sm variant="danger" onClick={()=>setConf({tipo:"medico",id:m.id,nombre:m.nombre})}>Quitar</Btn></div></div></Card>)}<Btn variant="success" onClick={()=>setModM("nuevo")} style={{marginTop:"8px"}}>+ Agregar médico</Btn></>}
    {sec==="estudios"&&<>{estudios.map(e=><Card key={e.id} style={{marginBottom:"10px"}}><div style={{display:"flex",alignItems:"center",gap:"12px"}}><span style={{fontSize:"28px"}}>{e.icon}</span><div style={{flex:1}}><div style={{display:"flex",alignItems:"center",gap:"8px"}}><span style={{fontWeight:700,color:C.navy,fontSize:"15px"}}>{e.label}</span><span style={{width:12,height:12,borderRadius:"50%",background:e.color,display:"inline-block"}}/></div><div style={{fontSize:"12px",color:C.slate}}>{e.duracion} min · {medicos.filter(m=>(m.estudios||[]).includes(e.id)).length} médico(s)</div></div><div style={{display:"flex",flexDirection:"column",gap:"6px"}}><Btn sm variant="outline" onClick={()=>setModE(e)}>Editar</Btn><Btn sm variant="danger" onClick={()=>setConf({tipo:"estudio",id:e.id,nombre:e.label})}>Quitar</Btn></div></div></Card>)}<Btn variant="success" onClick={()=>setModE("nuevo")} style={{marginTop:"8px"}}>+ Agregar estudio</Btn></>}
    {modM&&<ModalMedico medico={modM==="nuevo"?null:modM} estudios={estudios} onSave={async m=>{await onUpdateMedicos(m,modM==="nuevo");setModM(null);}} onClose={()=>setModM(null)}/>}
    {modE&&<ModalEstudio estudio={modE==="nuevo"?null:modE} onSave={async e=>{await onUpdateEstudios(e,modE==="nuevo");setModE(null);}} onClose={()=>setModE(null)}/>}
    {conf&&<Modal title="Confirmar" onClose={()=>setConf(null)}><p style={{color:C.navy,marginTop:0}}>¿Querés quitar <b>{conf.nombre}</b>?</p><div style={{display:"flex",gap:"10px",justifyContent:"flex-end"}}><Btn variant="ghost" onClick={()=>setConf(null)}>Cancelar</Btn><Btn variant="danger" onClick={async()=>{if(conf.tipo==="medico")await onUpdateMedicos({id:conf.id},false,true);else await onUpdateEstudios({id:conf.id},false,true);setConf(null);}}>Sí, quitar</Btn></div></Modal>}
  </div>);
}

// ─── MODAL NUEVO TURNO ────────────────────────────────────────────────────────────
function ModalNuevoTurno({medicos,estudios,turnos,onSave,onClose}){
  const[selMedico,setSelMedico]=useState(medicos[0]?.id||"");
  const[selEstudio,setSelEstudio]=useState("");
  const[fecha,setFecha]=useState(todayIso());
  const[hora,setHora]=useState("");
  const[horaExtra,setHoraExtra]=useState("09:00");
  const[esExtra,setEsExtra]=useState(false);
  const[tipo,setTipo]=useState("presencial");
  const[form,setForm]=useState({nombre:"",dni:"",telefono:"",email:""});
  const[saving,setSaving]=useState(false);
  const mMap=Object.fromEntries(medicos.map(m=>[m.id,m]));
  const medico=mMap[selMedico];
  const estudiosDelMedico=estudios.filter(e=>(medico?.estudios||[]).includes(e.id));
  const dow=dayOfWeek(fecha);
  const slotsNormales=medico?.horario?.[dow]||[];
  const ocupados=turnos.filter(t=>t.medico_id===selMedico&&t.fecha===fecha&&t.estado!=="cancelado").map(t=>t.hora);
  const slotsLibres=slotsNormales.filter(h=>!ocupados.includes(h));
  function cambiarMedico(id){setSelMedico(id);setSelEstudio("");setHora("");}
  const horaFinal=esExtra?horaExtra:hora;
  const ok=selMedico&&selEstudio&&fecha&&horaFinal&&form.nombre&&form.dni&&form.telefono;
  async function handleSave(){setSaving(true);await onSave({id:genId("t"),medico_id:selMedico,estudio_id:selEstudio,fecha,hora:horaFinal,estado:"confirmado",tipo_origen:tipo,...form});setSaving(false);}
  return(<Modal title="Nuevo turno" onClose={onClose}>
    <div style={{display:"flex",gap:"8px",marginBottom:"18px"}}>
      {[["presencial","🏥 Presencial"],["extra","⚡ Turno extra"]].map(([v,l])=>(
        <button key={v} onClick={()=>setTipo(v)} style={{flex:1,padding:"10px",borderRadius:"10px",border:`1.5px solid ${tipo===v?C.blue:C.border}`,background:tipo===v?C.bluePale:C.white,color:tipo===v?C.blue:C.slate,fontWeight:600,fontSize:"13px",cursor:"pointer"}}>{l}</button>
      ))}
    </div>
    {tipo==="extra"&&<div style={{fontSize:"13px",color:C.warn,background:C.warnPale,padding:"8px 12px",borderRadius:"8px",marginBottom:"14px"}}>⚡ Podés elegir cualquier fecha y horario, incluso fuera del habitual.</div>}
    <div style={{marginBottom:"14px"}}>
      <div style={{fontSize:"12px",fontWeight:700,color:C.slate,marginBottom:"6px",textTransform:"uppercase",letterSpacing:"0.5px"}}>Médico *</div>
      <select value={selMedico} onChange={e=>cambiarMedico(e.target.value)} style={{width:"100%",padding:"10px 13px",borderRadius:"9px",border:`1.5px solid ${C.border}`,fontSize:"15px",color:C.navy,background:C.white}}>
        {medicos.map(m=><option key={m.id} value={m.id}>{m.nombre}</option>)}
      </select>
    </div>
    <div style={{marginBottom:"14px"}}>
      <div style={{fontSize:"12px",fontWeight:700,color:C.slate,marginBottom:"6px",textTransform:"uppercase",letterSpacing:"0.5px"}}>Estudio o consulta *</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>{estudiosDelMedico.map(e=><button key={e.id} onClick={()=>setSelEstudio(e.id)} style={{padding:"6px 12px",borderRadius:"99px",border:`1.5px solid ${selEstudio===e.id?e.color:C.border}`,background:selEstudio===e.id?e.color+"18":C.white,color:selEstudio===e.id?e.color:C.slate,fontWeight:600,fontSize:"13px",cursor:"pointer"}}>{e.icon} {e.label}</button>)}</div>
    </div>
    <div style={{marginBottom:"14px"}}>
      <div style={{fontSize:"12px",fontWeight:700,color:C.slate,marginBottom:"6px",textTransform:"uppercase",letterSpacing:"0.5px"}}>Fecha *</div>
      <input type="date" value={fecha} onChange={e=>{setFecha(e.target.value);setHora("");}} style={{width:"100%",padding:"10px 13px",borderRadius:"9px",border:`1.5px solid ${C.border}`,fontSize:"15px",color:C.navy,boxSizing:"border-box"}}/>
    </div>
    <div style={{marginBottom:"18px"}}>
      <div style={{fontSize:"12px",fontWeight:700,color:C.slate,marginBottom:"6px",textTransform:"uppercase",letterSpacing:"0.5px"}}>Horario *</div>
      {tipo==="presencial"?(
        slotsLibres.length>0?(<>
          <div style={{display:"flex",flexWrap:"wrap",gap:"8px",marginBottom:"8px"}}>{slotsLibres.map(h=><button key={h} onClick={()=>{setHora(h);setEsExtra(false);}} style={{padding:"7px 13px",borderRadius:"9px",border:"1.5px solid",borderColor:hora===h&&!esExtra?C.blue:"#CBD5E1",background:hora===h&&!esExtra?C.blue:C.white,color:hora===h&&!esExtra?"#fff":C.navy,fontWeight:hora===h&&!esExtra?700:400,fontSize:"14px",cursor:"pointer"}}>{h}</button>)}</div>
          <button onClick={()=>setEsExtra(true)} style={{fontSize:"13px",color:C.warn,background:"none",border:"none",cursor:"pointer",padding:0,fontWeight:600}}>+ Agregar horario fuera del habitual</button>
          {esExtra&&<input type="time" value={horaExtra} onChange={e=>setHoraExtra(e.target.value)} style={{marginTop:"8px",width:"100%",padding:"10px 13px",borderRadius:"9px",border:`1.5px solid ${C.warn}`,fontSize:"15px",color:C.navy,boxSizing:"border-box"}}/>}
        </>):(
          <><p style={{color:C.slate,fontSize:"13px",margin:"0 0 8px"}}>Sin turnos disponibles este día. Ingresá un horario:</p><input type="time" value={horaExtra} onChange={e=>{setHoraExtra(e.target.value);setEsExtra(true);}} style={{width:"100%",padding:"10px 13px",borderRadius:"9px",border:`1.5px solid ${C.warn}`,fontSize:"15px",color:C.navy,boxSizing:"border-box"}}/></>
        )
      ):(
        <input type="time" value={horaExtra} onChange={e=>{setHoraExtra(e.target.value);setEsExtra(true);}} style={{width:"100%",padding:"10px 13px",borderRadius:"9px",border:`1.5px solid ${C.border}`,fontSize:"15px",color:C.navy,boxSizing:"border-box"}}/>
      )}
    </div>
    <div style={{borderTop:`1px solid ${C.border}`,paddingTop:"16px",marginBottom:"4px"}}>
      <div style={{fontSize:"12px",fontWeight:700,color:C.slate,marginBottom:"12px",textTransform:"uppercase",letterSpacing:"0.5px"}}>Datos del paciente</div>
      <Fld label="Nombre y apellido" value={form.nombre} onChange={v=>setForm(f=>({...f,nombre:v}))} required placeholder="Ej: María García"/>
      <Fld label="DNI" value={form.dni} onChange={v=>setForm(f=>({...f,dni:v}))} required placeholder="Ej: 32145678"/>
      <Fld label="Teléfono / WhatsApp" value={form.telefono} onChange={v=>setForm(f=>({...f,telefono:v}))} required placeholder="Ej: 11-1234-5678"/>
      <Fld label="Email" type="email" value={form.email} onChange={v=>setForm(f=>({...f,email:v}))} placeholder="Opcional"/>
    </div>
    <div style={{display:"flex",gap:"10px",justifyContent:"flex-end",marginTop:"8px"}}>
      <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
      <Btn disabled={!ok||saving} onClick={handleSave}>{saving?"Guardando...":"Confirmar turno"}</Btn>
    </div>
  </Modal>);
}


// ─── PANEL DE BLOQUEOS ────────────────────────────────────────────────────────────
function BloqueoPanel({medicos,bloqueos,setBloqueos}){
  const[modBloqueo,setModBloqueo]=useState(false);
  const[conf,setConf]=useState(null);
  const mMap=Object.fromEntries(medicos.map(m=>[m.id,m]));
  const proximos=bloqueos.filter(b=>b.fecha_hasta>=todayIso()).sort((a,b)=>a.fecha_desde.localeCompare(b.fecha_desde));
  const pasados=bloqueos.filter(b=>b.fecha_hasta<todayIso());
  async function eliminar(id){await dbDelete("bloqueos",id);setBloqueos(p=>p.filter(x=>x.id!==id));}
  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
      <div style={{fontWeight:700,color:C.navy,fontSize:"16px"}}>Bloqueos de agenda</div>
      <Btn sm variant="danger" onClick={()=>setModBloqueo(true)}>+ Nuevo bloqueo</Btn>
    </div>
    {proximos.length===0&&<Card><p style={{color:C.slate,textAlign:"center",margin:0}}>No hay bloqueos activos o futuros.</p></Card>}
    {proximos.map(b=>{
      const m=b.medico_id?mMap[b.medico_id]:null;
      return(<Card key={b.id} style={{marginBottom:"10px",borderLeft:`4px solid ${C.danger}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"10px"}}>
          <div>
            <div style={{fontWeight:700,color:C.navy,fontSize:"14px"}}>{b.motivo||"Sin motivo"}</div>
            <div style={{fontSize:"13px",color:C.slate,marginTop:"3px"}}>
              {m?m.nombre:"Todos los médicos"} · {b.fecha_desde===b.fecha_hasta?formatDate(b.fecha_desde):`${formatDate(b.fecha_desde)} al ${formatDate(b.fecha_hasta)}`}
            </div>
            {b.tipo==="horario"&&b.hora_desde&&<div style={{fontSize:"12px",color:C.slate}}>Horario: {b.hora_desde} a {b.hora_hasta}</div>}
            <span style={{fontSize:"11px",padding:"2px 8px",borderRadius:"99px",background:b.tipo==="dia_completo"?C.dangerPale:C.warnPale,color:b.tipo==="dia_completo"?C.danger:C.warn,fontWeight:600,marginTop:"4px",display:"inline-block"}}>
              {b.tipo==="dia_completo"?"Día completo":"Horario específico"}
            </span>
          </div>
          <Btn sm variant="danger" onClick={()=>setConf(b.id)}>Quitar</Btn>
        </div>
      </Card>);
    })}
    {pasados.length>0&&<div style={{marginTop:"16px"}}><div style={{fontSize:"12px",fontWeight:700,color:C.slate,marginBottom:"8px",textTransform:"uppercase",letterSpacing:"0.5px"}}>Bloqueos pasados</div>{pasados.map(b=>{const m=b.medico_id?mMap[b.medico_id]:null;return(<Card key={b.id} style={{marginBottom:"8px",opacity:0.55}}><div style={{fontSize:"13px",color:C.slate}}>{m?m.nombre:"Todos"} · {formatDate(b.fecha_desde)}{b.fecha_desde!==b.fecha_hasta?` al ${formatDate(b.fecha_hasta)}`:""} · {b.motivo||"Sin motivo"}</div></Card>);})}</div>}
    {modBloqueo&&<ModalBloqueo medicos={medicos} onSave={async b=>{const nuevo={...b,id:genId("blq")};await dbInsert("bloqueos",nuevo);setBloqueos(p=>[...p,nuevo]);setModBloqueo(false);setBloqueos(await dbGetBloqueos());}} onClose={()=>setModBloqueo(false)}/>}
    {conf&&<Modal title="Confirmar" onClose={()=>setConf(null)}><p style={{color:C.navy,marginTop:0}}>¿Querés eliminar este bloqueo?</p><div style={{display:"flex",gap:"10px",justifyContent:"flex-end"}}><Btn variant="ghost" onClick={()=>setConf(null)}>Cancelar</Btn><Btn variant="danger" onClick={async()=>{await eliminar(conf);setConf(null);}}>Sí, quitar</Btn></div></Modal>}
  </div>);
}

function ModalBloqueo({medicos,onSave,onClose}){
  const[tipo,setTipo]=useState("dia_completo");
  const[medicoId,setMedicoId]=useState("");
  const[fechaDesde,setFechaDesde]=useState(todayIso());
  const[fechaHasta,setFechaHasta]=useState(todayIso());
  const[horaDesde,setHoraDesde]=useState("08:00");
  const[horaHasta,setHoraHasta]=useState("12:00");
  const[motivo,setMotivo]=useState("");
  const[saving,setSaving]=useState(false);
  const ok=fechaDesde&&fechaHasta&&fechaHasta>=fechaDesde;
  async function handleSave(){setSaving(true);await onSave({medico_id:medicoId||null,tipo,fecha_desde:fechaDesde,fecha_hasta:fechaHasta,
  return(<Modal title="Nuevo bloqueo" onClose={onClose}>
    <div style={{display:"flex",gap:"8px",marginBottom:"18px"}}>
      {[["dia_completo","📅 Día completo"],["horario","🕐 Horario específico"]].map(([v,l])=>(
        <button key={v} onClick={()=>setTipo(v)} style={{flex:1,padding:"10px",borderRadius:"10px",border:`1.5px solid ${tipo===v?C.danger:C.border}`,background:tipo===v?C.dangerPale:C.white,color:tipo===v?C.danger:C.slate,fontWeight:600,fontSize:"13px",cursor:"pointer"}}>{l}</button>
      ))}
    </div>
    <div style={{marginBottom:"14px"}}>
      <div style={{fontSize:"12px",fontWeight:700,color:C.slate,marginBottom:"6px",textTransform:"uppercase",letterSpacing:"0.5px"}}>Médico afectado</div>
      <select value={medicoId} onChange={e=>setMedicoId(e.target.value)} style={{width:"100%",padding:"10px 13px",borderRadius:"9px",border:`1.5px solid ${C.border}`,fontSize:"15px",color:C.navy,background:C.white}}>
        <option value="">Todos los médicos</option>
        {medicos.map(m=><option key={m.id} value={m.id}>{m.nombre}</option>)}
      </select>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"14px"}}>
      <div><div style={{fontSize:"12px",fontWeight:700,color:C.slate,marginBottom:"6px",textTransform:"uppercase",letterSpacing:"0.5px"}}>Desde *</div><input type="date" value={fechaDesde} onChange={e=>{setFechaDesde(e.target.value);if(e.target.value>fechaHasta)setFechaHasta(e.target.value);}} style={{width:"100%",padding:"10px 13px",borderRadius:"9px",border:`1.5px solid ${C.border}`,fontSize:"15px",color:C.navy,boxSizing:"border-box"}}/></div>
      <div><div style={{fontSize:"12px",fontWeight:700,color:C.slate,marginBottom:"6px",textTransform:"uppercase",letterSpacing:"0.5px"}}>Hasta *</div><input type="date" value={fechaHasta} onChange={e=>setFechaHasta(e.target.value)} min={fechaDesde} style={{width:"100%",padding:"10px 13px",borderRadius:"9px",border:`1.5px solid ${C.border}`,fontSize:"15px",color:C.navy,boxSizing:"border-box"}}/></div>
    </div>
    {tipo==="horario"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"14px"}}>
      <div><div style={{fontSize:"12px",fontWeight:700,color:C.slate,marginBottom:"6px",textTransform:"uppercase",letterSpacing:"0.5px"}}>Hora desde</div><input type="time" value={horaDesde} onChange={e=>setHoraDesde(e.target.value)} style={{width:"100%",padding:"10px 13px",borderRadius:"9px",border:`1.5px solid ${C.border}`,fontSize:"15px",color:C.navy,boxSizing:"border-box"}}/></div>
      <div><div style={{fontSize:"12px",fontWeight:700,color:C.slate,marginBottom:"6px",textTransform:"uppercase",letterSpacing:"0.5px"}}>Hora hasta</div><input type="time" value={horaHasta} onChange={e=>setHoraHasta(e.target.value)} style={{width:"100%",padding:"10px 13px",borderRadius:"9px",border:`1.5px solid ${C.border}`,fontSize:"15px",color:C.navy,boxSizing:"border-box"}}/></div>
    </div>}
    <Fld label="Motivo" value={motivo} onChange={setMotivo} placeholder="Ej: Vacaciones, Feriado, Congreso..."/>
    <div style={{display:"flex",gap:"10px",justifyContent:"flex-end",marginTop:"8px"}}>
      <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
      <Btn disabled={!ok||saving} onClick={handleSave}>{saving?"Guardando...":"Crear bloqueo"}</Btn>
    </div>
  </Modal>);
}

// ─── ADMIN VIEW ───────────────────────────────────────────────────────────────────
function AdminView({turnos,medicos,estudios,bloqueos=[],setBloqueos,onCancel,onUpdateMedico,onUpdateEstudio,onBook}){
  const[tab,setTab]=useState("agenda");const[va,setVa]=useState("dia");const[selFecha,setSelFecha]=useState(todayIso());const[filtr,setFiltr]=useState("todos");
  const[modalNuevoTurno,setModalNuevoTurno]=useState(false);
  const eMap=Object.fromEntries(estudios.map(e=>[e.id,e]));const mMap=Object.fromEntries(medicos.map(m=>[m.id,m]));
  const turnosDia=turnos.filter(t=>t.fecha===selFecha&&(filtr==="todos"||t.medico_id===filtr)).sort((a,b)=>a.hora.localeCompare(b.hora));
  const proximos=turnos.filter(t=>t.fecha>=todayIso()&&t.estado!=="cancelado"&&(filtr==="todos"||t.medico_id===filtr)).sort((a,b)=>a.fecha===b.fecha?a.hora.localeCompare(b.hora):a.fecha.localeCompare(b.fecha)).slice(0,30);
  const stats={hoy:turnos.filter(t=>t.fecha===todayIso()&&t.estado!=="cancelado").length,semana:turnos.filter(t=>{const d=new Date(t.fecha+"T12:00:00");const h=new Date();const ini=new Date(h);ini.setDate(h.getDate()-h.getDay());const fin=new Date(ini);fin.setDate(ini.getDate()+6);return d>=ini&&d<=fin&&t.estado!=="cancelado";}).length,total:turnos.filter(t=>t.estado!=="cancelado").length};
  return(<div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"10px",marginBottom:"18px"}}>{[["Hoy",stats.hoy],["Semana",stats.semana],["Total",stats.total]].map(([l,v])=><Card key={l} style={{textAlign:"center",padding:"14px"}}><div style={{fontSize:"26px",fontWeight:800,color:C.blue}}>{v}</div><div style={{fontSize:"11px",color:C.slate,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.4px"}}>{l}</div></Card>)}</div>
    <div style={{display:"flex",gap:"8px",marginBottom:"16px",overflowX:"auto",paddingBottom:"2px"}}>{[["agenda","📅 Agenda"],["bloqueos","🔒 Bloqueos"],["config","⚙️ Configuración"]].map(([v,l])=><button key={v} onClick={()=>setTab(v)} style={{padding:"8px 16px",borderRadius:"9px",border:"1.5px solid",whiteSpace:"nowrap",borderColor:tab===v?C.blue:C.border,background:tab===v?C.bluePale:C.white,color:tab===v?C.blue:C.slate,fontWeight:600,fontSize:"14px",cursor:"pointer"}}>{l}</button>)}</div>
    {tab==="agenda"&&<>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px",gap:"8px",flexWrap:"wrap"}}><div style={{overflowX:"auto",display:"flex",gap:"8px",paddingBottom:"4px"}}><Chip active={filtr==="todos"} onClick={()=>setFiltr("todos")}>Todos</Chip>{medicos.map(m=><Chip key={m.id} active={filtr===m.id} onClick={()=>setFiltr(m.id)} color={C.blue}>{m.avatar||initials(m.nombre)}</Chip>)}</div><Btn sm variant="success" onClick={()=>setModalNuevoTurno(true)}>+ Nuevo turno</Btn></div>
      <div style={{display:"flex",gap:"8px",marginBottom:"16px"}}>{[["dia","Vista diaria"],["proximos","Próximos"]].map(([v,l])=><button key={v} onClick={()=>setVa(v)} style={{padding:"8px 16px",borderRadius:"9px",border:"1.5px solid",borderColor:va===v?C.blue:C.border,background:va===v?C.bluePale:C.white,color:va===v?C.blue:C.slate,fontWeight:600,fontSize:"14px",cursor:"pointer"}}>{l}</button>)}</div>
      {va==="dia"&&<><Card style={{marginBottom:"14px"}}><MiniCalendar selected={selFecha} onSelect={setSelFecha} turnos={turnos} medicoId={filtr==="todos"?null:filtr} adminMode/></Card><div style={{fontWeight:700,color:C.navy,marginBottom:"10px",fontSize:"15px"}}>{formatDate(selFecha)} <span style={{fontSize:"13px",fontWeight:400,color:C.slate}}>{turnosDia.filter(t=>t.estado!=="cancelado").length} activos</span></div>{turnosDia.length===0?<Card><p style={{color:C.slate,textAlign:"center",margin:0}}>Sin turnos este día.</p></Card>:turnosDia.map(t=><TurnoCard key={t.id} turno={t} onCancel={onCancel} eMap={eMap} mMap={mMap}/>)}</>}
      {va==="proximos"&&<><div style={{fontWeight:700,color:C.navy,marginBottom:"10px"}}>Próximos turnos</div>{proximos.length===0?<Card><p style={{color:C.slate,textAlign:"center",margin:0}}>No hay turnos próximos.</p></Card>:proximos.map(t=><TurnoCard key={t.id} turno={t} onCancel={onCancel} eMap={eMap} mMap={mMap} showFecha/>)}</>}
    </>}
    {tab==="config"&&<ConfigPanel medicos={medicos} estudios={estudios} onUpdateMedicos={onUpdateMedico} onUpdateEstudios={onUpdateEstudio}/>}
    {tab==="bloqueos"&&<BloqueoPanel medicos={medicos} bloqueos={bloqueos} setBloqueos={setBloqueos}/>}
    {modalNuevoTurno&&<ModalNuevoTurno medicos={medicos} estudios={estudios} turnos={turnos} onSave={async t=>{await onBook(t);setModalNuevoTurno(false);}} onClose={()=>setModalNuevoTurno(false)}/>}
  </div>);
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────────
function LoginConsultorio({onLogin}){
  const[pass,setPass]=useState("");const[err,setErr]=useState(false);
  function intentar(){if(pass===PASSWORD_CONSULTORIO){onLogin();setErr(false);}else{setErr(true);setPass("");}}
  return(<div style={{minHeight:"70vh",display:"flex",alignItems:"center",justifyContent:"center"}}><Card style={{maxWidth:360,width:"100%",textAlign:"center"}}><div style={{fontSize:"40px",marginBottom:"12px"}}>🔒</div><h2 style={{color:C.navy,margin:"0 0 6px",fontSize:"20px"}}>Acceso al consultorio</h2><p style={{color:C.slate,fontSize:"14px",marginBottom:"24px"}}>Ingresá la contraseña para continuar</p><input type="password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&intentar()} placeholder="••••••••" style={{width:"100%",padding:"12px 14px",borderRadius:"10px",border:`1.5px solid ${err?C.danger:C.border}`,fontSize:"16px",outline:"none",boxSizing:"border-box",marginBottom:"8px",textAlign:"center",letterSpacing:"4px"}}/>{err&&<p style={{color:C.danger,fontSize:"13px",margin:"0 0 10px"}}>Contraseña incorrecta</p>}<Btn full onClick={intentar} extraStyle={{marginTop:"8px"}}>Entrar</Btn><p style={{color:C.slate,fontSize:"12px",marginTop:"16px",marginBottom:0}}>Solo para uso del consultorio Punto Med</p></Card></div>);
}

// ─── APP ──────────────────────────────────────────────────────────────────────────
export default function App(){
  const[medicos,setMedicos]=useState([]);
  const[estudios,setEstudios]=useState([]);
  const[turnos,setTurnos]=useState([]);
  const[bloqueos,setBloqueos]=useState([]);
  const[loading,setLoading]=useState(true);
  const[vista,setVista]=useState("paciente");
  const[authed,setAuthed]=useState(false);
  const[toast,setToast]=useState(null);

  // ── Cargar datos desde Supabase ──
  const cargarDatos = useCallback(async()=>{
    try{
      const[estDs,medDs,turDs,bloqDs]=await Promise.all([
        dbGet("estudios","order=orden"),
        dbGet("medicos","order=nombre"),
        dbGet("turnos","order=fecha,hora&estado=neq.cancelado&fecha=gte."+todayIso()),
        dbGetBloqueos(),
      ]);
      setBloqueos(bloqDs);
      // Si no hay datos, sembrar con los datos iniciales
      if(estDs.length===0){ await Promise.all(ESTUDIOS_SEED.map(e=>dbInsert("estudios",e))); const fresh=await dbGet("estudios","order=orden"); setEstudios(fresh); }
      else setEstudios(estDs);
      if(medDs.length===0){ await Promise.all(MEDICOS_SEED.map(m=>dbInsert("medicos",m))); const fresh=await dbGet("medicos","order=nombre"); setMedicos(fresh); }
      else setMedicos(medDs);
      setTurnos(turDs);
    }catch(e){ console.error(e); setToast({msg:"Error conectando a la base de datos",type:"danger"}); }
    setLoading(false);
  },[]);

  useEffect(()=>{cargarDatos();},[cargarDatos]);

  // ── Turnos ──
  async function handleBook(t){
    try{
      await dbInsert("turnos",t);
      setTurnos(p=>[...p,t]);
      setToast({msg:"✅ Turno reservado",type:"success"});
    }catch(e){
      if(e.message.includes("turnos_unico")||e.message.includes("unique")){
        throw new Error("ese horario ya fue tomado");
      }
      throw e;
    }
  }
  async function handleCancel(id){
    await dbUpdate("turnos",id,{estado:"cancelado"});
    setTurnos(p=>p.map(t=>t.id===id?{...t,estado:"cancelado"}:t));
    setToast({msg:"Turno cancelado",type:"warn"});
  }

  // ── Médicos ──
  async function handleUpdateMedico(m, esNuevo, eliminar=false){
    if(eliminar){ await dbDelete("medicos",m.id); setMedicos(p=>p.filter(x=>x.id!==m.id)); setToast({msg:"Médico eliminado",type:"warn"}); return; }
    if(esNuevo){ const nuevo={...m,id:genId("med")}; await dbInsert("medicos",nuevo); setMedicos(p=>[...p,nuevo]); setToast({msg:"Médico agregado",type:"success"}); }
    else{ await dbUpdate("medicos",m.id,m); setMedicos(p=>p.map(x=>x.id===m.id?m:x)); setToast({msg:"Médico actualizado",type:"success"}); }
  }

  // ── Estudios ──
  async function handleUpdateEstudio(e, esNuevo, eliminar=false){
    if(eliminar){ await dbDelete("estudios",e.id); setEstudios(p=>p.filter(x=>x.id!==e.id)); setToast({msg:"Estudio eliminado",type:"warn"}); return; }
    if(esNuevo){ const nuevo={...e,id:genId("est"),orden:estudios.length+1}; await dbInsert("estudios",nuevo); setEstudios(p=>[...p,nuevo]); setToast({msg:"Estudio agregado",type:"success"}); }
    else{ await dbUpdate("estudios",e.id,e); setEstudios(p=>p.map(x=>x.id===e.id?e:x)); setToast({msg:"Estudio actualizado",type:"success"}); }
  }

  if(loading)return(<div style={{fontFamily:"'Inter','Segoe UI',sans-serif",background:C.mist,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{textAlign:"center"}}><div style={{fontSize:"40px",marginBottom:"12px"}}>🫀</div><Spinner/><p style={{color:C.slate,marginTop:"12px"}}>Cargando Punto Med...</p></div></div>);

  return(<div style={{fontFamily:"'Inter','Segoe UI',sans-serif",background:C.mist,minHeight:"100vh"}}>
    <div style={{background:C.navyMid,padding:"0 20px",position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 12px rgba(0,0,0,0.18)"}}>
      <div style={{maxWidth:680,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",height:"58px"}}>
        <div style={{display:"flex",alignItems:"center",gap:"10px"}}><span style={{fontSize:"22px"}}>🫀</span><div><div style={{fontWeight:800,color:"#fff",fontSize:"15px",letterSpacing:"0.3px"}}>Punto Med</div><div style={{fontSize:"11px",color:"#94A3B8",letterSpacing:"0.5px",textTransform:"uppercase"}}>Cardiología</div></div></div>
        <div style={{display:"flex",gap:"6px"}}>{[["paciente","Turnos"],["consultorio","Consultorio"]].map(([v,l])=><button key={v} onClick={()=>setVista(v)} style={{padding:"6px 14px",borderRadius:"8px",border:"none",background:vista===v?"rgba(255,255,255,0.18)":"transparent",color:vista===v?"#fff":"#94A3B8",fontWeight:600,fontSize:"13px",cursor:"pointer"}}>{l}</button>)}</div>
      </div>
    </div>
    <div style={{maxWidth:680,margin:"0 auto",padding:"20px 16px 60px"}}>
      {vista==="paciente"&&<PatientView turnos={turnos} medicos={medicos} estudios={estudios} onBook={handleBook} onCancel={handleCancel}/>}
      {vista==="consultorio"&&(authed?<AdminView turnos={turnos} medicos={medicos} estudios={estudios} onCancel={handleCancel} onUpdateMedico={handleUpdateMedico} onUpdateEstudio={handleUpdateEstudio} onBook={handleBook}/>:<LoginConsultorio onLogin={()=>setAuthed(true)}/>)}
    </div>
    {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
  </div>);
}

