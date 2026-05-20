
import { useState, useMemo, useRef, useEffect } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const CURRENCIES = [
  {code:"USD",symbol:"$"},{code:"EUR",symbol:"€"},{code:"INR",symbol:"₹"},
  {code:"GBP",symbol:"£"},{code:"JPY",symbol:"¥"},{code:"AUD",symbol:"A$"},
  {code:"CAD",symbol:"C$"},{code:"CNY",symbol:"¥"},{code:"BRL",symbol:"R$"},
  {code:"MXN",symbol:"MX$"},{code:"AED",symbol:"د.إ"},{code:"SGD",symbol:"S$"},
];
const CATEGORIES = [
  {name:"Food",icon:"🍔",color:"#FF6B6B",bg:"rgba(255,107,107,0.15)"},
  {name:"Transport",icon:"🚗",color:"#4ECDC4",bg:"rgba(78,205,196,0.15)"},
  {name:"Housing",icon:"🏠",color:"#45B7D1",bg:"rgba(69,183,209,0.15)"},
  {name:"Health",icon:"💊",color:"#6BCB77",bg:"rgba(107,203,119,0.15)"},
  {name:"Entertainment",icon:"🎬",color:"#FFD93D",bg:"rgba(255,217,61,0.15)"},
  {name:"Shopping",icon:"🛍️",color:"#C77DFF",bg:"rgba(199,125,255,0.15)"},
  {name:"Others",icon:"📦",color:"#94A3B8",bg:"rgba(148,163,184,0.15)"},
];
const FALLBACK = {USD:1,EUR:0.92,INR:83.5,GBP:0.79,JPY:149,AUD:1.53,CAD:1.36,CNY:7.24,BRL:4.97,MXN:17.2,AED:3.67,SGD:1.34};
const GRAD = "linear-gradient(135deg,#6366F1 0%,#8B5CF6 50%,#A855F7 100%)";
const GRAD2 = "linear-gradient(135deg,#06B6D4 0%,#6366F1 100%)";
const TH = {
  dark:{bg:"#080B14",card:"rgba(255,255,255,0.04)",solid:"#0E1322",border:"rgba(255,255,255,0.08)",txt:"#F0F2FF",sub:"#6B7280",ibg:"rgba(255,255,255,0.05)",ibr:"rgba(255,255,255,0.1)",cbg:"#0A0D1A",mbg:"rgba(255,255,255,0.06)"},
  light:{bg:"#F3F6FF",card:"rgba(255,255,255,0.9)",solid:"#FFFFFF",border:"rgba(0,0,0,0.07)",txt:"#0F172A",sub:"#64748B",ibg:"#F8FAFF",ibr:"rgba(0,0,0,0.1)",cbg:"#F0F4FF",mbg:"rgba(0,0,0,0.05)"},
};
const today=()=>new Date().toISOString().split("T")[0];
const curMonth=()=>new Date().toISOString().slice(0,7);
const fmtAmt=(a,s)=>`${s}${Number(a).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const fmtDate=d=>new Date(d).toLocaleDateString("en-US",{month:"short",day:"numeric"});
const fmtDay=d=>new Date(d).toLocaleDateString("en-US",{weekday:"short"});
const getCat=n=>CATEGORIES.find(c=>c.name===n)||CATEGORIES[6];
const prevMonthStr=m=>{const[y,mo]=m.split("-").map(Number);const d=new Date(y,mo-2,1);return d.toISOString().slice(0,7);};



export default function App() {
  const [dark,setDark]=useState(true);
  const T=TH[dark?"dark":"light"];
  const [expenses,setExpenses]=useState(mkSample);
  const [currency,setCurrency]=useState(CURRENCIES[0]);
  const [view,setView]=useState("dashboard");
  const [timeView,setTimeView]=useState("weekly");
  const [form,setForm]=useState({amount:"",category:"Food",desc:"",date:today(),currency:"USD"});
  const [editId,setEditId]=useState(null);
  const [deleteId,setDeleteId]=useState(null);
  const [budgets,setBudgets]=useState({Food:0,Transport:0,Housing:0,Health:0,Entertainment:0,Shopping:0,Others:0});
  const [budgetModal,setBudgetModal]=useState(false);
  const [reportMonth,setReportMonth]=useState(curMonth());
  const [rates,setRates]=useState(FALLBACK);
  const [convertAll,setConvertAll]=useState(false);
  const [chatOpen,setChatOpen]=useState(false);
  const [msgs,setMsgs]=useState([{role:"assistant",content:"👋 Hi! I'm your personal finance assistant.\n\nAsk me anything — like *\"What's my biggest category?\"* or *\"How can I save money?\"*"}]);
  const [chatIn,setChatIn]=useState("");
  const [chatLoad,setChatLoad]=useState(false);
  const chatEnd=useRef(null);
  const sym=currency.symbol;

  useEffect(()=>{
    fetch("https://api.exchangerate-api.com/v4/latest/USD")
      .then(r=>r.json()).then(d=>{if(d.rates)setRates(d.rates);}).catch(()=>{});
  },[]);
  useEffect(()=>{chatEnd.current?.scrollIntoView({behavior:"smooth"});},[msgs,chatLoad]);

  const convert=(amt,from)=>{
    if(from===currency.code)return Number(amt);
    return(Number(amt)/(rates[from]||1))*(rates[currency.code]||1);
  };
  const disp=e=>convertAll?{a:convert(e.amount,e.currency),s:sym}:{a:Number(e.amount),s:CURRENCIES.find(c=>c.code===e.currency)?.symbol||"$"};

  const working=useMemo(()=>(convertAll?expenses:expenses.filter(e=>e.currency===currency.code)).map(e=>({...e,_v:convert(e.amount,e.currency)})),[expenses,currency,convertAll,rates]);
  const total=working.reduce((s,e)=>s+e._v,0);
  const avgDaily=useMemo(()=>{if(!working.length)return 0;const ds=[...new Set(working.map(e=>e.date))];return total/ds.length;},[working,total]);
  const biggest=working.reduce((m,e)=>Math.max(m,e._v),0);

  const catData=useMemo(()=>CATEGORIES.map(c=>({...c,value:working.filter(e=>e.category===c.name).reduce((s,e)=>s+e._v,0)})).filter(c=>c.value>0),[working]);

  const barData=useMemo(()=>{
    const now=new Date();
    if(timeView==="daily")return Array.from({length:7},(_,i)=>{const d=new Date(now);d.setDate(d.getDate()-(6-i));const ds=d.toISOString().split("T")[0];return{label:fmtDay(ds),amount:working.filter(e=>e.date===ds).reduce((s,e)=>s+e._v,0)};});
    return Array.from({length:4},(_,i)=>{const ws=new Date(now);ws.setDate(ws.getDate()-(3-i)*7-ws.getDay());const we=new Date(ws);we.setDate(ws.getDate()+6);const[wss,wes]=[ws.toISOString().split("T")[0],we.toISOString().split("T")[0]];return{label:fmtDate(wss),amount:working.filter(e=>e.date>=wss&&e.date<=wes).reduce((s,e)=>s+e._v,0)};});
  },[working,timeView]);

  const monthExp=useMemo(()=>working.filter(e=>e.date.startsWith(reportMonth)),[working,reportMonth]);
  const prevExp=useMemo(()=>{const pm=prevMonthStr(reportMonth);return working.filter(e=>e.date.startsWith(pm));},[working,reportMonth]);
  const monthTotal=monthExp.reduce((s,e)=>s+e._v,0);
  const prevTotal=prevExp.reduce((s,e)=>s+e._v,0);
  const monthDelta=prevTotal>0?((monthTotal-prevTotal)/prevTotal*100):null;
  const monthCats=useMemo(()=>CATEGORIES.map(c=>({...c,value:monthExp.filter(e=>e.category===c.name).reduce((s,e)=>s+e._v,0)})).filter(c=>c.value>0),[monthExp]);
  const monthDaily=useMemo(()=>{
    const[y,m]=reportMonth.split("-").map(Number);
    const days=new Date(y,m,0).getDate();
    return Array.from({length:days},(_,i)=>{const day=String(i+1).padStart(2,"0");const ds=`${reportMonth}-${day}`;return{label:String(i+1),amount:monthExp.filter(e=>e.date===ds).reduce((s,e)=>s+e._v,0)};});
  },[monthExp,reportMonth]);

  const budgetMonth=useMemo(()=>working.filter(e=>e.date.startsWith(curMonth())),[working]);
  const catSpent=n=>budgetMonth.filter(e=>e.category===n).reduce((s,e)=>s+e._v,0);
  const hasBudgets=Object.values(budgets).some(v=>v>0);

  const submitForm=()=>{
    if(!form.amount||isNaN(form.amount)||Number(form.amount)<=0)return;
    if(editId!==null){setExpenses(p=>p.map(e=>e.id===editId?{...form,id:editId,amount:Number(form.amount)}:e));setEditId(null);}
    else setExpenses(p=>[...p,{...form,id:Date.now(),amount:Number(form.amount)}]);
    setForm({amount:"",category:"Food",desc:"",date:today(),currency:currency.code});setView("dashboard");
  };
  const startEdit=e=>{setForm({amount:e.amount,category:e.category,desc:e.desc,date:e.date,currency:e.currency});setEditId(e.id);setView("add");};

  const sendChat=async()=>{
    const q=chatIn.trim();if(!q||chatLoad)return;
    const um={role:"user",content:q};setMsgs(p=>[...p,um]);setChatIn("");setChatLoad(true);
    const sum=`Expenses: ${expenses.map(e=>`${e.desc||e.category}: ${e.currency} ${e.amount} [${e.category}] ${e.date}`).join("; ")}. Total ${currency.code}: ${sym}${total.toFixed(2)}. This month: ${sym}${monthTotal.toFixed(2)}.`;
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:`You are a friendly personal finance assistant in an app called ExpenseGlobe. Answer questions about spending, give insights and tips. Be concise, use emojis. Never mention AI or technology behind you.\n\nDATA:\n${sum}`,messages:[...msgs,um].map(m=>({role:m.role,content:m.content}))})});
      const d=await res.json();
      setMsgs(p=>[...p,{role:"assistant",content:d.content?.map(b=>b.text||"").join("")||"Sorry, couldn't respond."}]);
    }catch{setMsgs(p=>[...p,{role:"assistant",content:"⚠️ Connection issue. Try again."}]);}
    setChatLoad(false);
  };

  const card={background:T.card,backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderRadius:20,border:`1px solid ${T.border}`,boxShadow:dark?"0 8px 32px rgba(0,0,0,0.4)":"0 8px 24px rgba(0,0,0,0.07)"};
  const inp={width:"100%",boxSizing:"border-box",padding:"13px 16px",borderRadius:14,border:`1.5px solid ${T.ibr}`,fontSize:14,background:T.ibg,color:T.txt,outline:"none",fontFamily:"inherit",transition:"border 0.2s"};
  const lbl={fontSize:11,fontWeight:700,color:T.sub,textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:8};
  const ttStyle={borderRadius:12,border:`1px solid ${T.border}`,background:T.solid,color:T.txt,fontSize:12,boxShadow:"0 8px 24px rgba(0,0,0,0.2)"};

  const BudgetBar=({name,icon,color,bg})=>{
    const spent=catSpent(name),limit=budgets[name];
    if(!limit)return null;
    const pct=Math.min((spent/limit)*100,100),over=spent>limit,warn=pct>80&&!over;
    return(
      <div style={{background:T.ibg,borderRadius:14,padding:"12px 14px",border:`1px solid ${over?"rgba(255,107,107,0.3)":T.ibr}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <span style={{fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:17}}>{icon}</span>{name}</span>
          <span style={{fontSize:11,fontWeight:700,color:over?"#FF6B6B":warn?"#FFD93D":color}}>{fmtAmt(spent,sym)} / {fmtAmt(limit,sym)}</span>
        </div>
        <div style={{height:6,borderRadius:4,background:T.border}}>
          <div style={{height:"100%",borderRadius:4,width:`${pct}%`,background:over?"linear-gradient(90deg,#FF6B6B,#EE4444)":warn?"#FFD93D":color,transition:"width 0.5s ease"}}/>
        </div>
        {over&&<div style={{fontSize:10,color:"#FF6B6B",marginTop:5,fontWeight:700}}>⚠️ Over by {fmtAmt(spent-limit,sym)}</div>}
        {warn&&<div style={{fontSize:10,color:"#FFD93D",marginTop:5,fontWeight:700}}>⚡ {(100-pct).toFixed(0)}% remaining</div>}
      </div>
    );
  };

  return(
    <div style={{fontFamily:"'Inter','Segoe UI',sans-serif",minHeight:"100vh",background:T.bg,color:T.txt,transition:"background 0.3s,color 0.3s"}}>
      <style>{`
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.8)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(99,102,241,0.4);border-radius:4px}
        input[type=date]::-webkit-calendar-picker-indicator,input[type=month]::-webkit-calendar-picker-indicator{filter:${dark?"invert(1)":"none"};opacity:.5}
        input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
        select option{background:${dark?"#1a1d27":"#fff"};color:${T.txt}}
      `}</style>

      {/* Orbs */}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",overflow:"hidden",zIndex:0}}>
        <div style={{position:"absolute",top:-120,left:-80,width:420,height:420,borderRadius:"50%",background:"radial-gradient(circle,rgba(99,102,241,0.18) 0%,transparent 70%)"}}/>
        <div style={{position:"absolute",top:220,right:-100,width:360,height:360,borderRadius:"50%",background:"radial-gradient(circle,rgba(168,85,247,0.14) 0%,transparent 70%)"}}/>
        <div style={{position:"absolute",bottom:-80,left:"30%",width:300,height:300,borderRadius:"50%",background:"radial-gradient(circle,rgba(6,182,212,0.1) 0%,transparent 70%)"}}/>
      </div>

      <div style={{position:"relative",zIndex:1}}>
        {/* Header */}
        <div style={{padding:"22px 20px 64px",background:dark?"linear-gradient(180deg,rgba(99,102,241,0.12) 0%,transparent 100%)":"linear-gradient(180deg,rgba(99,102,241,0.06) 0%,transparent 100%)"}}>
          <div style={{maxWidth:680,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:42,height:42,borderRadius:14,background:GRAD,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,boxShadow:"0 4px 16px rgba(99,102,241,0.5)"}}>💰</div>
              <div>
                <div style={{fontSize:18,fontWeight:800,letterSpacing:"-0.5px",background:GRAD,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>ExpenseGlobe</div>
                <div style={{fontSize:11,color:T.sub}}>Personal Finance Tracker</div>
              </div>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <select value={currency.code} onChange={e=>setCurrency(CURRENCIES.find(c=>c.code===e.target.value))}
                style={{background:T.ibg,border:`1px solid ${T.ibr}`,color:T.txt,borderRadius:12,padding:"8px 10px",fontSize:12,cursor:"pointer",fontFamily:"inherit",outline:"none"}}>
                {CURRENCIES.map(c=><option key={c.code} value={c.code}>{c.code} {c.symbol}</option>)}
              </select>
              <button onClick={()=>setDark(x=>!x)} style={{width:38,height:38,borderRadius:12,border:`1px solid ${T.ibr}`,background:T.ibg,cursor:"pointer",fontSize:17,display:"flex",alignItems:"center",justifyContent:"center"}}>{dark?"☀️":"🌙"}</button>
            </div>
          </div>
        </div>

        {/* Hero */}
        <div style={{maxWidth:680,margin:"-50px auto 0",padding:"0 20px"}}>
          <div style={{borderRadius:22,padding:"22px 24px",background:GRAD,boxShadow:"0 16px 48px rgba(99,102,241,0.4)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.65)",letterSpacing:1,textTransform:"uppercase",marginBottom:5}}>Total Spent · {currency.code}</div>
                <div style={{fontSize:38,fontWeight:800,color:"#fff",letterSpacing:"-2px",lineHeight:1}}>{fmtAmt(total,sym)}</div>
              </div>
              <button onClick={()=>setConvertAll(x=>!x)}
                style={{background:convertAll?"rgba(255,255,255,0.3)":"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.25)",borderRadius:12,padding:"8px 13px",cursor:"pointer",color:"#fff",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",gap:5,transition:"all 0.2s",flexShrink:0}}>
                💱 {convertAll?"On":"Convert All"}
              </button>
            </div>
            {convertAll&&<div style={{fontSize:10,color:"rgba(255,255,255,0.55)",marginTop:5}}>Live rates · All converted to {currency.code}</div>}
            <div style={{display:"flex",gap:22,marginTop:18}}>
              {[["Avg / Day",fmtAmt(avgDaily,sym)],["Biggest",fmtAmt(biggest,sym)],["Entries",expenses.length]].map(([l,v])=>(
                <div key={l}><div style={{fontSize:10,color:"rgba(255,255,255,0.6)",marginBottom:3}}>{l}</div><div style={{fontSize:14,fontWeight:700,color:"#fff"}}>{v}</div></div>
              ))}
            </div>
          </div>
        </div>

        {/* Nav */}
        <div style={{maxWidth:680,margin:"16px auto 0",padding:"0 20px"}}>
          <div style={{display:"flex",gap:5,background:T.card,backdropFilter:"blur(20px)",borderRadius:16,padding:5,border:`1px solid ${T.border}`}}>
            {[["dashboard","📊","Dash"],["add",editId?"✏️":"➕",editId?"Edit":"Add"],["reports","📅","Reports"],["list","📋","All"]].map(([v,ic,l])=>(
              <button key={v} onClick={()=>setView(v)}
                style={{flex:1,padding:"9px 4px",borderRadius:12,border:"none",cursor:"pointer",fontSize:10,fontWeight:700,display:"flex",flexDirection:"column",alignItems:"center",gap:2,background:view===v?GRAD:"transparent",color:view===v?"#fff":T.sub,transition:"all 0.25s",boxShadow:view===v?"0 4px 14px rgba(99,102,241,0.3)":"none"}}>
                <span style={{fontSize:15}}>{ic}</span>{l}
              </button>
            ))}
          </div>
        </div>

        <div style={{maxWidth:680,margin:"14px auto",padding:"0 20px 110px"}}>

          {/* ── DASHBOARD ── */}
          {view==="dashboard"&&(
            <div style={{display:"flex",flexDirection:"column",gap:14,animation:"slideUp 0.3s ease"}}>

              {/* Budget */}
              <div style={{...card,padding:"20px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:hasBudgets?16:0}}>
                  <div style={{fontWeight:700,fontSize:15}}>💰 Monthly Budgets</div>
                  <button onClick={()=>setBudgetModal(true)} style={{fontSize:11,fontWeight:700,padding:"6px 14px",borderRadius:10,border:`1px solid ${T.ibr}`,background:T.ibg,color:T.sub,cursor:"pointer"}}>
                    {hasBudgets?"Manage":"+ Set Limits"}
                  </button>
                </div>
                {hasBudgets
                  ?<div style={{display:"flex",flexDirection:"column",gap:9}}>{CATEGORIES.map(c=><BudgetBar key={c.name} name={c.name} icon={c.icon} color={c.color} bg={c.bg}/>)}</div>
                  :<div style={{textAlign:"center",color:T.sub,fontSize:13,padding:"12px 0 4px"}}>Set monthly limits per category to stay on track 🎯</div>}
              </div>

              {/* Trend */}
              <div style={{...card,padding:"20px 18px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                  <div style={{fontWeight:700,fontSize:15}}>Spending Trend</div>
                  <div style={{display:"flex",gap:5,background:T.ibg,borderRadius:10,padding:4,border:`1px solid ${T.ibr}`}}>
                    {["daily","weekly"].map(t=>(
                      <button key={t} onClick={()=>setTimeView(t)} style={{padding:"4px 10px",borderRadius:8,border:"none",cursor:"pointer",fontSize:10,fontWeight:700,background:timeView===t?GRAD:"transparent",color:timeView===t?"#fff":T.sub,transition:"all 0.2s"}}>
                        {t[0].toUpperCase()+t.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={170}>
                  <BarChart data={barData} barSize={26}>
                    <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366F1"/><stop offset="100%" stopColor="#A855F7"/></linearGradient></defs>
                    <XAxis dataKey="label" tick={{fontSize:10,fill:T.sub,fontWeight:600}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:10,fill:T.sub}} axisLine={false} tickLine={false} width={34}/>
                    <Tooltip formatter={v=>[fmtAmt(v,sym),"Spent"]} contentStyle={ttStyle} cursor={{fill:"rgba(99,102,241,0.07)",radius:6}}/>
                    <Bar dataKey="amount" fill="url(#g1)" radius={[8,8,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Categories */}
              <div style={{...card,padding:"20px 18px"}}>
                <div style={{fontWeight:700,fontSize:15,marginBottom:16}}>Category Breakdown</div>
                {catData.length===0
                  ?<div style={{textAlign:"center",color:T.sub,padding:"22px 0",fontSize:13}}>No data yet</div>
                  :<div style={{display:"flex",gap:12,alignItems:"center"}}>
                    <ResponsiveContainer width="44%" height={150}>
                      <PieChart><Pie data={catData} cx="50%" cy="50%" innerRadius={38} outerRadius={68} dataKey="value" paddingAngle={4} strokeWidth={0}>
                        {catData.map((c,i)=><Cell key={i} fill={c.color}/>)}
                      </Pie><Tooltip formatter={v=>[fmtAmt(v,sym),""]} contentStyle={ttStyle}/></PieChart>
                    </ResponsiveContainer>
                    <div style={{flex:1,display:"flex",flexDirection:"column",gap:9}}>
                      {catData.map((c,i)=>(
                        <div key={i}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                            <span style={{fontSize:11,color:T.sub,display:"flex",alignItems:"center",gap:4}}><span style={{width:7,height:7,borderRadius:"50%",background:c.color,display:"inline-block"}}/>{c.icon} {c.name}</span>
                            <span style={{fontSize:11,fontWeight:700,color:T.txt}}>{fmtAmt(c.value,sym)}</span>
                          </div>
                          <div style={{height:4,borderRadius:4,background:T.border}}><div style={{height:"100%",borderRadius:4,background:c.color,width:`${(c.value/total)*100}%`,transition:"width 0.6s ease"}}/></div>
                        </div>
                      ))}
                    </div>
                  </div>}
              </div>

              {/* Recent */}
              <div style={{...card,padding:"20px 18px"}}>
                <div style={{fontWeight:700,fontSize:15,marginBottom:14}}>Recent Transactions</div>
                {expenses.length===0&&<div style={{textAlign:"center",color:T.sub,fontSize:13,padding:"16px 0"}}>No transactions yet</div>}
                {[...expenses].reverse().slice(0,5).map((e,idx)=>{const cat=getCat(e.category);const da=disp(e);return(
                  <div key={e.id} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 0",borderBottom:idx<4&&expenses.length>1?`1px solid ${T.border}`:"none"}}>
                    <div style={{width:40,height:40,borderRadius:13,background:cat.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0,border:`1px solid ${cat.color}30`}}>{cat.icon}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:600,marginBottom:2}}>{e.desc||e.category}</div>
                      <div style={{fontSize:10,color:T.sub,display:"flex",alignItems:"center",gap:5}}>
                        <span style={{background:cat.bg,color:cat.color,padding:"2px 7px",borderRadius:20,fontSize:9,fontWeight:700}}>{e.category}</span>{fmtDate(e.date)}
                      </div>
                    </div>
                    <div style={{fontSize:14,fontWeight:800,color:T.txt}}>{da.s}{Number(da.a).toLocaleString(undefined,{maximumFractionDigits:2})}</div>
                  </div>
                );})}
              </div>
            </div>
          )}

          {/* ── ADD / EDIT ── */}
          {view==="add"&&(
            <div style={{...card,padding:"24px 20px",animation:"slideUp 0.3s ease"}}>
              <div style={{fontWeight:800,fontSize:17,marginBottom:22,letterSpacing:"-0.5px"}}>{editId?"✏️ Edit Transaction":"➕ New Transaction"}</div>
              <label style={lbl}>Amount</label>
              <div style={{display:"flex",gap:8,marginBottom:18}}>
                <select value={form.currency} onChange={e=>setForm(f=>({...f,currency:e.target.value}))} style={{...inp,width:"auto",flex:1,fontWeight:600}}>
                  {CURRENCIES.map(c=><option key={c.code} value={c.code}>{c.code} {c.symbol}</option>)}
                </select>
                <input type="number" placeholder="0.00" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} style={{...inp,flex:2.5,fontSize:24,fontWeight:800,color:"#6366F1"}}/>
              </div>
              <label style={lbl}>Category</label>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:18}}>
                {CATEGORIES.map(c=>(
                  <button key={c.name} onClick={()=>setForm(f=>({...f,category:c.name}))}
                    style={{padding:"11px 4px",borderRadius:13,border:`2px solid ${form.category===c.name?c.color:"transparent"}`,background:form.category===c.name?c.bg:T.ibg,cursor:"pointer",fontSize:9,fontWeight:800,color:form.category===c.name?c.color:T.sub,transition:"all 0.2s",textTransform:"uppercase",letterSpacing:.5}}>
                    <div style={{fontSize:20,marginBottom:3}}>{c.icon}</div>{c.name}
                  </button>
                ))}
              </div>
              <label style={lbl}>Description</label>
              <input placeholder="What was this for?" value={form.desc} onChange={e=>setForm(f=>({...f,desc:e.target.value}))} style={{...inp,marginBottom:16}}/>
              <label style={lbl}>Date</label>
              <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} style={{...inp,marginBottom:24}}/>
              <div style={{display:"flex",gap:10}}>
                <button onClick={()=>{setView("dashboard");setEditId(null);setForm({amount:"",category:"Food",desc:"",date:today(),currency:currency.code});}}
                  style={{flex:1,padding:13,borderRadius:13,border:`1px solid ${T.ibr}`,background:T.ibg,color:T.sub,fontWeight:700,cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>Cancel</button>
                <button onClick={submitForm} style={{flex:2,padding:13,borderRadius:13,border:"none",background:GRAD,color:"#fff",fontWeight:800,cursor:"pointer",fontSize:13,fontFamily:"inherit",boxShadow:"0 6px 20px rgba(99,102,241,0.35)"}}>
                  {editId?"Save Changes":"Add Transaction"}
                </button>
              </div>
            </div>
          )}

          {/* ── REPORTS ── */}
          {view==="reports"&&(
            <div style={{display:"flex",flexDirection:"column",gap:14,animation:"slideUp 0.3s ease"}}>
              <div style={{...card,padding:"18px 20px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontWeight:700,fontSize:15}}>📅 Monthly Report</div>
                  <input type="month" value={reportMonth} onChange={e=>setReportMonth(e.target.value)} style={{...inp,width:"auto",padding:"8px 12px",fontSize:12,fontWeight:600}}/>
                </div>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div style={{...card,padding:"18px 16px"}}>
                  <div style={{fontSize:10,color:T.sub,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Month Total</div>
                  <div style={{fontSize:24,fontWeight:800,letterSpacing:"-1px"}}>{fmtAmt(monthTotal,sym)}</div>
                  {monthDelta!==null&&<div style={{fontSize:11,marginTop:6,color:monthDelta>0?"#FF6B6B":"#6BCB77",fontWeight:700}}>{monthDelta>0?"▲":"▼"} {Math.abs(monthDelta).toFixed(1)}% vs prev month</div>}
                </div>
                <div style={{...card,padding:"18px 16px"}}>
                  <div style={{fontSize:10,color:T.sub,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Transactions</div>
                  <div style={{fontSize:24,fontWeight:800}}>{monthExp.length}</div>
                  <div style={{fontSize:11,color:T.sub,marginTop:6}}>Avg {fmtAmt(monthExp.length?monthTotal/monthExp.length:0,sym)} each</div>
                </div>
              </div>

              <div style={{...card,padding:"20px 18px"}}>
                <div style={{fontWeight:700,fontSize:15,marginBottom:16}}>Daily Activity</div>
                {monthExp.length===0
                  ?<div style={{textAlign:"center",color:T.sub,fontSize:13,padding:"20px 0"}}>No transactions this month</div>
                  :<ResponsiveContainer width="100%" height={160}>
                    <BarChart data={monthDaily} barSize={7}>
                      <defs><linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366F1"/><stop offset="100%" stopColor="#A855F7"/></linearGradient></defs>
                      <XAxis dataKey="label" tick={{fontSize:9,fill:T.sub}} axisLine={false} tickLine={false} interval={4}/>
                      <YAxis tick={{fontSize:9,fill:T.sub}} axisLine={false} tickLine={false} width={28}/>
                      <Tooltip formatter={v=>[fmtAmt(v,sym),"Spent"]} contentStyle={ttStyle}/>
                      <Bar dataKey="amount" fill="url(#g2)" radius={[4,4,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>}
              </div>

              <div style={{...card,padding:"20px 18px"}}>
                <div style={{fontWeight:700,fontSize:15,marginBottom:16}}>Category Breakdown</div>
                {monthCats.length===0
                  ?<div style={{textAlign:"center",color:T.sub,fontSize:13,padding:"16px 0"}}>No data this month</div>
                  :monthCats.map((c,i)=>(
                    <div key={i} style={{marginBottom:14}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                        <span style={{fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:17}}>{c.icon}</span>{c.name}</span>
                        <div style={{textAlign:"right"}}>
                          <div style={{fontSize:13,fontWeight:800}}>{fmtAmt(c.value,sym)}</div>
                          <div style={{fontSize:10,color:T.sub}}>{((c.value/monthTotal)*100).toFixed(1)}%</div>
                        </div>
                      </div>
                      <div style={{height:7,borderRadius:5,background:T.border}}><div style={{height:"100%",borderRadius:5,background:c.color,width:`${(c.value/monthTotal)*100}%`,transition:"width 0.6s ease"}}/></div>
                    </div>
                  ))}
              </div>

              {monthExp.length>0&&<div style={{...card,padding:"20px 18px"}}>
                <div style={{fontWeight:700,fontSize:15,marginBottom:14}}>Transactions This Month</div>
                {[...monthExp].reverse().map((e,idx)=>{const cat=getCat(e.category);const da=disp(e);return(
                  <div key={e.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:idx<monthExp.length-1?`1px solid ${T.border}`:"none"}}>
                    <div style={{width:36,height:36,borderRadius:11,background:cat.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{cat.icon}</div>
                    <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600}}>{e.desc||e.category}</div><div style={{fontSize:10,color:T.sub}}>{fmtDate(e.date)}</div></div>
                    <div style={{fontSize:13,fontWeight:800}}>{da.s}{Number(da.a).toLocaleString(undefined,{maximumFractionDigits:2})}</div>
                  </div>
                );})}
              </div>}
            </div>
          )}

          {/* ── ALL LIST ── */}
          {view==="list"&&(
            <div style={{...card,padding:"20px 18px",animation:"slideUp 0.3s ease"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                <div style={{fontWeight:700,fontSize:15}}>All Transactions</div>
                <div style={{fontSize:11,color:T.sub,background:T.ibg,padding:"4px 12px",borderRadius:20,border:`1px solid ${T.ibr}`}}>{expenses.length} entries</div>
              </div>
              {expenses.length===0&&<div style={{textAlign:"center",color:T.sub,padding:30,fontSize:13}}>No transactions yet</div>}
              {[...expenses].reverse().map((e,idx)=>{const cat=getCat(e.category);const da=disp(e);return(
                <div key={e.id} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 0",borderBottom:idx<expenses.length-1?`1px solid ${T.border}`:"none"}}>
                  <div style={{width:38,height:38,borderRadius:12,background:cat.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}>{cat.icon}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{e.desc||e.category}</div>
                    <div style={{fontSize:10,color:T.sub}}>{e.category} · {fmtDate(e.date)} · {e.currency}</div>
                  </div>
                  <div style={{fontSize:13,fontWeight:800,marginRight:4}}>{da.s}{Number(da.a).toLocaleString(undefined,{maximumFractionDigits:2})}</div>
                  <button onClick={()=>startEdit(e)} style={{width:30,height:30,borderRadius:9,border:`1px solid ${T.ibr}`,background:T.ibg,cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"}}>✏️</button>
                  <button onClick={()=>setDeleteId(e.id)} style={{width:30,height:30,borderRadius:9,border:"1px solid rgba(255,107,107,0.2)",background:"rgba(255,107,107,0.07)",cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"}}>🗑️</button>
                </div>
              );})}
            </div>
          )}
        </div>
      </div>

      {/* ── BUDGET MODAL ── */}
      {budgetModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(8px)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:400,animation:"fadeIn 0.2s ease"}}>
          <div style={{background:T.solid,borderRadius:"24px 24px 0 0",padding:"24px 20px 32px",width:"100%",maxWidth:680,border:`1px solid ${T.border}`,boxShadow:"0 -16px 48px rgba(0,0,0,0.3)",maxHeight:"85vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div style={{fontWeight:800,fontSize:17}}>💰 Monthly Budget Limits</div>
              <button onClick={()=>setBudgetModal(false)} style={{width:32,height:32,borderRadius:10,border:`1px solid ${T.ibr}`,background:T.ibg,cursor:"pointer",color:T.sub,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>✕</button>
            </div>
            <div style={{fontSize:12,color:T.sub,marginBottom:20}}>Set a monthly limit per category. Leave at 0 for no limit. Shown in {currency.code}.</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {CATEGORIES.map(c=>(
                <div key={c.name} style={{display:"flex",alignItems:"center",gap:12,background:T.ibg,borderRadius:14,padding:"12px 14px",border:`1px solid ${T.ibr}`}}>
                  <div style={{width:36,height:36,borderRadius:11,background:c.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{c.icon}</div>
                  <div style={{flex:1,fontSize:13,fontWeight:600}}>{c.name}</div>
                  <span style={{fontSize:13,color:T.sub}}>{sym}</span>
                  <input type="number" value={budgets[c.name]||""} placeholder="0"
                    onChange={e=>setBudgets(b=>({...b,[c.name]:Number(e.target.value)||0}))}
                    style={{width:90,padding:"8px 10px",borderRadius:10,border:`1px solid ${T.ibr}`,background:T.bg,color:T.txt,fontSize:13,fontWeight:700,outline:"none",textAlign:"right",fontFamily:"inherit"}}/>
                </div>
              ))}
            </div>
            <button onClick={()=>setBudgetModal(false)} style={{width:"100%",marginTop:20,padding:14,borderRadius:14,border:"none",background:GRAD,color:"#fff",fontWeight:800,cursor:"pointer",fontSize:14,fontFamily:"inherit",boxShadow:"0 6px 20px rgba(99,102,241,0.35)"}}>
              Save Budgets
            </button>
          </div>
        </div>
      )}

      {/* ── DELETE MODAL ── */}
      {deleteId!==null&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:400,padding:24,animation:"fadeIn 0.2s ease"}}>
          <div style={{background:T.solid,borderRadius:24,padding:28,maxWidth:290,width:"100%",textAlign:"center",border:`1px solid ${T.border}`,boxShadow:"0 24px 64px rgba(0,0,0,0.4)"}}>
            <div style={{width:52,height:52,borderRadius:16,background:"rgba(255,107,107,0.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,margin:"0 auto 12px"}}>🗑️</div>
            <div style={{fontWeight:800,fontSize:16,marginBottom:8}}>Remove Transaction?</div>
            <div style={{color:T.sub,fontSize:12,marginBottom:22,lineHeight:1.5}}>This action is permanent and cannot be reversed.</div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setDeleteId(null)} style={{flex:1,padding:12,borderRadius:13,border:`1px solid ${T.ibr}`,background:T.ibg,color:T.sub,fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:13}}>Cancel</button>
              <button onClick={()=>{setExpenses(p=>p.filter(e=>e.id!==deleteId));setDeleteId(null);}} style={{flex:1,padding:12,borderRadius:13,border:"none",background:"linear-gradient(135deg,#FF6B6B,#EE4444)",color:"#fff",fontWeight:800,cursor:"pointer",fontFamily:"inherit",fontSize:13,boxShadow:"0 4px 14px rgba(255,107,107,0.4)"}}>Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* ── CHAT ── */}
      {chatOpen&&(
        <div style={{position:"fixed",bottom:90,right:20,width:315,height:465,background:T.solid,borderRadius:22,boxShadow:"0 16px 64px rgba(0,0,0,0.4)",display:"flex",flexDirection:"column",zIndex:300,overflow:"hidden",border:`1px solid ${T.border}`,animation:"slideUp 0.3s ease"}}>
          <div style={{background:GRAD,padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:32,height:32,borderRadius:11,background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>💬</div>
              <div>
                <div style={{fontWeight:700,color:"#fff",fontSize:13}}>Finance Assistant</div>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.6)",display:"flex",alignItems:"center",gap:4}}><span style={{width:6,height:6,borderRadius:"50%",background:"#4ADE80",display:"inline-block"}}/>Online</div>
              </div>
            </div>
            <button onClick={()=>setChatOpen(false)} style={{width:28,height:28,borderRadius:9,background:"rgba(255,255,255,0.15)",border:"none",cursor:"pointer",color:"#fff",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"14px 12px",display:"flex",flexDirection:"column",gap:10,background:T.cbg}}>
            {msgs.map((m,i)=>(
              <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
                {m.role==="assistant"&&<div style={{width:26,height:26,borderRadius:9,background:GRAD,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,marginRight:7,flexShrink:0,alignSelf:"flex-end"}}>💬</div>}
                <div style={{maxWidth:"78%",padding:"9px 13px",borderRadius:m.role==="user"?"18px 18px 4px 18px":"18px 18px 18px 4px",background:m.role==="user"?GRAD:T.mbg,color:m.role==="user"?"#fff":T.txt,fontSize:12.5,lineHeight:1.55,whiteSpace:"pre-wrap",boxShadow:m.role==="user"?"0 4px 12px rgba(99,102,241,0.3)":"none",border:m.role!=="user"?`1px solid ${T.border}`:"none"}}>
                  {m.content}
                </div>
              </div>
            ))}
            {chatLoad&&(
              <div style={{display:"flex",alignItems:"flex-end",gap:7}}>
                <div style={{width:26,height:26,borderRadius:9,background:GRAD,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>💬</div>
                <div style={{background:T.mbg,border:`1px solid ${T.border}`,borderRadius:"18px 18px 18px 4px",padding:"11px 14px",display:"flex",gap:4,alignItems:"center"}}>
                  {[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:"#6366F1",animation:"pulse 1.2s infinite",animationDelay:`${i*.2}s`}}/>)}
                </div>
              </div>
            )}
            <div ref={chatEnd}/>
          </div>
          <div style={{padding:"10px 12px",borderTop:`1px solid ${T.border}`,display:"flex",gap:7,background:T.solid,flexShrink:0}}>
            <input value={chatIn} onChange={e=>setChatIn(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendChat()} placeholder="Ask about your finances..."
              style={{flex:1,padding:"10px 13px",borderRadius:13,border:`1.5px solid ${T.ibr}`,background:T.ibg,color:T.txt,fontSize:12.5,outline:"none",fontFamily:"inherit"}}/>
            <button onClick={sendChat} disabled={chatLoad||!chatIn.trim()}
              style={{width:40,height:40,borderRadius:12,border:"none",background:chatLoad||!chatIn.trim()?T.ibg:GRAD,color:chatLoad||!chatIn.trim()?T.sub:"#fff",fontWeight:800,cursor:chatLoad||!chatIn.trim()?"not-allowed":"pointer",fontSize:17,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:!chatLoad&&chatIn.trim()?"0 4px 14px rgba(99,102,241,0.4)":"none",transition:"all 0.2s"}}>↑</button>
          </div>
        </div>
      )}

      {/* FABs */}
      <div style={{position:"fixed",bottom:24,right:20,display:"flex",flexDirection:"column",gap:10,zIndex:200}}>
        <button onClick={()=>setChatOpen(x=>!x)} style={{width:48,height:48,borderRadius:15,background:chatOpen?"#4F46E5":GRAD2,border:"none",color:"#fff",fontSize:19,cursor:"pointer",boxShadow:"0 6px 20px rgba(6,182,212,0.45)",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.25s"}}>
          {chatOpen?"✕":"💬"}
        </button>
        {view!=="add"&&<button onClick={()=>{setEditId(null);setForm({amount:"",category:"Food",desc:"",date:today(),currency:currency.code});setView("add");}} style={{width:48,height:48,borderRadius:15,background:GRAD,border:"none",color:"#fff",fontSize:22,cursor:"pointer",boxShadow:"0 6px 20px rgba(99,102,241,0.5)",display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>}
      </div>
    </div>
  );
}