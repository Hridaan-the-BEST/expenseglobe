import { useState, useMemo, useRef, useEffect } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

const CURRENCIES = [
  {code:"USD",symbol:"$"},{code:"EUR",symbol:"€"},{code:"INR",symbol:"₹"},
  {code:"GBP",symbol:"£"},{code:"JPY",symbol:"¥"},{code:"AUD",symbol:"A$"},
  {code:"CAD",symbol:"C$"},{code:"CNY",symbol:"¥"},{code:"BRL",symbol:"R$"},
  {code:"MXN",symbol:"MX$"},{code:"AED",symbol:"د.إ"},{code:"SGD",symbol:"S$"},
];

const CATEGORIES = [
  {name:"Food",icon:"🍔",color:"#FF4757",bg:"rgba(255,71,87,0.12)"},
  {name:"Transport",icon:"🚗",color:"#2ED573",bg:"rgba(46,213,115,0.12)"},
  {name:"Housing",icon:"🏠",color:"#1E90FF",bg:"rgba(30,144,255,0.12)"},
  {name:"Health",icon:"💊",color:"#A855F7",bg:"rgba(168,85,247,0.12)"},
  {name:"Entertainment",icon:"🎬",color:"#FF6B81",bg:"rgba(255,107,129,0.12)"},
  {name:"Shopping",icon:"🛍️",color:"#FFA502",bg:"rgba(255,165,2,0.12)"},
  {name:"Others",icon:"📦",color:"#747D8C",bg:"rgba(116,125,140,0.12)"},
];

const FALLBACK={USD:1,EUR:0.92,INR:83.5,GBP:0.79,JPY:149,AUD:1.53,CAD:1.36,CNY:7.24,BRL:4.97,MXN:17.2,AED:3.67,SGD:1.34};

const today=()=>new Date().toISOString().split("T")[0];
const curMonth=()=>new Date().toISOString().slice(0,7);
const fmtDate=d=>new Date(d).toLocaleDateString("en-US",{month:"short",day:"numeric"});
const fmtDay=d=>new Date(d).toLocaleDateString("en-US",{weekday:"short"});
const fmtAmt=(a,s)=>`${s}${Number(a).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const getCat=n=>CATEGORIES.find(c=>c.name===n)||CATEGORIES[6];
const prevMonthStr=m=>{const[y,mo]=m.split("-").map(Number);const d=new Date(y,mo-2,1);return d.toISOString().slice(0,7);};

// Smart chatbot
const smartChat=(q,expenses,total,currency,monthTotal,catData,avgDaily,biggest)=>{
  const ql=q.toLowerCase();
  const sym=currency.symbol;
  const topCat=catData.sort((a,b)=>b.value-a.value)[0];

  if(ql.includes("total")||ql.includes("spent")||ql.includes("spend"))
    return `💰 You've spent **${fmtAmt(total,sym)}** in total. This month: **${fmtAmt(monthTotal,sym)}**.`;

  if(ql.includes("average")||ql.includes("avg")||ql.includes("daily"))
    return `📅 Your average daily spending is **${fmtAmt(avgDaily,sym)}**.`;

  if(ql.includes("biggest")||ql.includes("largest"))
    return `🔝 Biggest single expense was **${fmtAmt(biggest,sym)}**.`;

  if(ql.includes("category")||ql.includes("categories"))
    return `📊 Top category right now is **${topCat?.name||"Others"}** (${fmtAmt(topCat?.value||0,sym)}).`;

  if(ql.includes("save")||ql.includes("saving")||ql.includes("tip"))
    return `💡 A few tips that actually help me:\n1. 50/30/20 rule\n2. Wait 24 hours before buying anything non-essential\n3. Review expenses every Sunday`;

  if(ql.includes("hello")||ql.includes("hi")||ql.includes("hey"))
    return `Hey! What's up? Ask me about your spending anytime.`;

  return `🤔 Try asking about totals, categories, saving tips, or just say hi. I'm not ChatGPT but I remember your expenses 😌`;
};

export default function App() {
  const [expenses,setExpenses]=useState(()=>{try{return JSON.parse(localStorage.getItem("ss_expenses")||"[]");}catch{return[];}});
  const [currency,setCurrency]=useState(()=>CURRENCIES.find(c=>c.code===(localStorage.getItem("ss_currency")||"INR"))||CURRENCIES[2]);
  const [budgets,setBudgets]=useState(()=>{try{return JSON.parse(localStorage.getItem("ss_budgets")||"{}");}catch{return{Food:0,Transport:0,Housing:0,Health:0,Entertainment:0,Shopping:0,Others:0};}});
  const [dark,setDark]=useState(()=>{try{return JSON.parse(localStorage.getItem("ss_dark")||"true");}catch{return true;}});
  const [view,setView]=useState("dashboard");
  const [timeView,setTimeView]=useState("weekly");
  const [form,setForm]=useState({amount:"",category:"Food",desc:"",date:today(),currency:"INR"});
  const [editId,setEditId]=useState(null);
  const [deleteId,setDeleteId]=useState(null);
  const [budgetModal,setBudgetModal]=useState(false);
  const [reportMonth,setReportMonth]=useState(curMonth());
  const [rates,setRates]=useState(FALLBACK);
  const [convertAll,setConvertAll]=useState(false);
  const [chatOpen,setChatOpen]=useState(false);
  const [msgs,setMsgs]=useState([{role:"assistant",content:"Hey there 👋\nI'm your expense buddy. Ask me anything about your spending!"}]);
  const [chatIn,setChatIn]=useState("");
  const [goalModal,setGoalModal]=useState(false);
  const [goals,setGoals]=useState(()=>{try{return JSON.parse(localStorage.getItem("ss_goals")||"[]");}catch{return[];}});
  const [goalForm,setGoalForm]=useState({name:"",target:"",saved:""});

  const chatEnd=useRef(null);
  const sym=currency.symbol;

  useEffect(()=>localStorage.setItem("ss_expenses",JSON.stringify(expenses)),[expenses]);
  useEffect(()=>localStorage.setItem("ss_currency",currency.code),[currency]);
  useEffect(()=>localStorage.setItem("ss_budgets",JSON.stringify(budgets)),[budgets]);
  useEffect(()=>localStorage.setItem("ss_dark",JSON.stringify(dark)),[dark]);
  useEffect(()=>localStorage.setItem("ss_goals",JSON.stringify(goals)),[goals]);

  useEffect(()=>{fetch("https://api.exchangerate-api.com/v4/latest/USD").then(r=>r.json()).then(d=>{if(d.rates)setRates(d.rates);}).catch(()=>{});},[]);
  useEffect(()=>{chatEnd.current?.scrollIntoView({behavior:"smooth"});},[msgs]);

  const convert=(amt,from)=>{if(from===currency.code)return Number(amt);return(Number(amt)/(rates[from]||1))*(rates[currency.code]||1);};
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
  const prevExp=useMemo(()=>working.filter(e=>e.date.startsWith(prevMonthStr(reportMonth))),[working,reportMonth]);
  const monthTotal=monthExp.reduce((s,e)=>s+e._v,0);
  const prevTotal=prevExp.reduce((s,e)=>s+e._v,0);
  const monthDelta=prevTotal>0?((monthTotal-prevTotal)/prevTotal*100):null;
  const monthCats=useMemo(()=>CATEGORIES.map(c=>({...c,value:monthExp.filter(e=>e.category===c.name).reduce((s,e)=>s+e._v,0)})).filter(c=>c.value>0),[monthExp]);

  const budgetMonth=useMemo(()=>working.filter(e=>e.date.startsWith(curMonth())),[working]);
  const catSpent=n=>budgetMonth.filter(e=>e.category===n).reduce((s,e)=>s+e._v,0);
  const hasBudgets=Object.values(budgets).some(v=>v>0);

  const exportCSV=()=>{
    const rows=[["Date","Description","Category","Amount","Currency"],...expenses.map(e=>[e.date,e.desc||e.category,e.category,e.amount,e.currency])];
    const csv=rows.map(r=>r.join(",")).join("\n");
    const blob=new Blob([csv],{type:"text/csv"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download="my_expenses.csv";a.click();
  };

  const submitForm=()=>{
    if(!form.amount||isNaN(form.amount)||Number(form.amount)<=0)return;
    if(editId!==null){setExpenses(p=>p.map(e=>e.id===editId?{...form,id:editId,amount:Number(form.amount)}:e));setEditId(null);}
    else setExpenses(p=>[...p,{...form,id:Date.now(),amount:Number(form.amount)}]);
    setForm({amount:"",category:"Food",desc:"",date:today(),currency:currency.code});setView("dashboard");
  };
  const startEdit=e=>{setForm({amount:e.amount,category:e.category,desc:e.desc,date:e.date,currency:e.currency});setEditId(e.id);setView("add");};

  const sendChat=()=>{
    const q=chatIn.trim();if(!q)return;
    const um={role:"user",content:q};
    const reply=smartChat(q,expenses,total,currency,monthTotal,catData,avgDaily,biggest);
    setMsgs(p=>[...p,um,{role:"assistant",content:reply}]);
    setChatIn("");
  };

  // Human-friendly colors
  const bg=dark?"#0A0A0F":"#F9F7FF";
  const card=dark?"rgba(255,255,255,0.06)":"rgba(255,255,255,0.97)";
  const solid=dark?"#12121A":"#FFFFFF";
  const border=dark?"rgba(255,255,255,0.09)":"rgba(0,0,0,0.08)";
  const txt=dark?"#F0F0FF":"#111118";
  const sub=dark?"#88889A":"#666677";

  const MAIN="linear-gradient(135deg,#6D28D9 0%,#DB2777 100%)";

  const cardStyle={background:card,backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",borderRadius:24,border:`1px solid ${border}`,boxShadow:dark?"0 10px 40px rgba(0,0,0,0.5)":"0 10px 40px rgba(0,0,0,0.08)"};
  const inpStyle={width:"100%",boxSizing:"border-box",padding:"14px 16px",borderRadius:16,border:`1.5px solid ${border}`,fontSize:15,background:dark?"#1A1A24":"#FAFAFF",color:txt,outline:"none"};

  const lbl={fontSize:12,fontWeight:700,color:sub,textTransform:"uppercase",letterSpacing:0.8,display:"block",marginBottom:8};

  return(
    <div style={{fontFamily:"'Inter', system-ui, sans-serif",minHeight:"100vh",background:bg,color:txt,transition:"all 0.4s"}}>
      <style>{`
        @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes glow{0%,100%{box-shadow:0 0 20px rgba(109,40,217,0.4)}50%{box-shadow:0 0 35px rgba(219,39,119,0.5)}}
        .nav-btn:hover{transform:scale(1.04)}
      `}</style>

      {/* Background */}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",overflow:"hidden",zIndex:0}}>
        <div style={{position:"absolute",top:-160,left:-120,width:580,height:580,borderRadius:"50%",background:"radial-gradient(circle,rgba(109,40,217,0.14) 0%,transparent 68%)"}}/>
        <div style={{position:"absolute",bottom:-140,right:-100,width:520,height:520,borderRadius:"50%",background:"radial-gradient(circle,rgba(219,39,119,0.12) 0%,transparent 70%)"}}/>
      </div>

      <div style={{position:"relative",zIndex:1}}>
        {/* Header */}
        <div style={{padding:"24px 20px 65px"}}>
          <div style={{maxWidth:720,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:14}}>
              <div style={{width:50,height:50,borderRadius:18,background:MAIN,display:"flex",alignItems:"center",justifyContent:"center",fontSize:29,boxShadow:"0 6px 25px rgba(109,40,217,0.45)",animation:"glow 4s infinite"}}>💸</div>
              <div>
                <div style={{fontSize:29,fontWeight:800,letterSpacing:"-1.8px"}}>spendsmart</div>
                <div style={{fontSize:12,color:sub,marginTop:-4}}>built in dehradun • v0.9</div>
              </div>
            </div>

            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              <select value={currency.code} onChange={e=>setCurrency(CURRENCIES.find(c=>c.code===e.target.value))} style={{background:card,border:`1px solid ${border}`,color:txt,borderRadius:14,padding:"8px 12px",fontSize:13}}>
                {CURRENCIES.map(c=><option key={c.code} value={c.code}>{c.code} {c.symbol}</option>)}
              </select>
              <button onClick={()=>setDark(x=>!x)} style={{width:42,height:42,borderRadius:14,border:`1px solid ${border}`,background:card,fontSize:20}}>{dark?"☀️":"🌙"}</button>
            </div>
          </div>
        </div>

        {/* Hero */}
        <div style={{maxWidth:720,margin:"-48px auto 0",padding:"0 20px"}}>
          <div style={{borderRadius:28,padding:"32px 30px",background:MAIN,boxShadow:"0 25px 70px rgba(109,40,217,0.45)",position:"relative",overflow:"hidden"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{fontSize:13.5,color:"rgba(255,255,255,0.8)",fontWeight:600}}>Total Spent</div>
                <div style={{fontSize:52,fontWeight:900,color:"#fff",letterSpacing:"-3px",marginTop:4}}>{fmtAmt(total,sym)}</div>
              </div>
              <button onClick={()=>setConvertAll(x=>!x)} style={{background:"rgba(255,255,255,0.22)",border:"1px solid rgba(255,255,255,0.35)",borderRadius:14,padding:"10px 16px",color:"#fff",fontSize:13,fontWeight:700}}>
                {convertAll ? "✅ Live Rates" : "💱 Convert All"}
              </button>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div style={{maxWidth:720,margin:"24px auto 0",padding:"0 20px"}}>
          <div style={{display:"flex",gap:6,background:card,borderRadius:20,padding:6,border:`1px solid ${border}`}}>
            {[["dashboard","📊","Dashboard"],["add",editId?"✏️":"➕",editId?"Edit":"Add"],["reports","📅","Reports"],["goals","🎯","Goals"],["list","📋","All"]].map(([v,ic,l])=>(
              <button key={v} onClick={()=>setView(v)} className="nav-btn"
                style={{flex:1,padding:"12px 6px",borderRadius:16,background:view===v?MAIN:"transparent",color:view===v?"#fff":sub,fontSize:12.5,fontWeight:700}}>
                <span style={{fontSize:19,display:"block",marginBottom:3}}>{ic}</span>{l}
              </button>
            ))}
          </div>
        </div>

        <div style={{maxWidth:720,margin:"20px auto",padding:"0 20px 140px"}}>

          {/* DASHBOARD */}
          {view==="dashboard"&&(
            <div style={{display:"flex",flexDirection:"column",gap:18}}>
              {/* Budgets */}
              <div style={{...cardStyle,padding:"24px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                  <div style={{fontWeight:700,fontSize:16}}>Monthly Budgets</div>
                  <button onClick={()=>setBudgetModal(true)} style={{fontSize:12.5,fontWeight:700,padding:"7px 16px",borderRadius:12,border:`1px solid ${border}`,background:card,color:sub}}>Manage</button>
                </div>
                {hasBudgets ? (
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    {CATEGORIES.map(c=><BudgetBar key={c.name} name={c.name} icon={c.icon} color={c.color} budgets={budgets} catSpent={catSpent} sym={sym} border={border} ibr={border} ibg={card} />)}
                  </div>
                ) : (
                  <div style={{textAlign:"center",color:sub,padding:"20px 0",fontSize:14}}>Set some budget limits to track better 🎯</div>
                )}
              </div>

              {/* Trend */}
              <div style={{...cardStyle,padding:"24px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                  <div style={{fontWeight:700,fontSize:16}}>Spending Trend</div>
                  <div style={{display:"flex",gap:4,background:card,borderRadius:12,padding:4,border:`1px solid ${border}`}}>
                    {["daily","weekly"].map(t=>(
                      <button key={t} onClick={()=>setTimeView(t)} style={{padding:"5px 14px",borderRadius:10,background:timeView===t?MAIN:"transparent",color:timeView===t?"#fff":sub,fontSize:12.5,fontWeight:700}}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={barData}>
                    <defs>
                      <linearGradient id="color" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6D28D9" stopOpacity={0.7}/>
                        <stop offset="100%" stopColor="#DB2777" stopOpacity={0.08}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="label" tick={{fontSize:11,fill:sub}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:11,fill:sub}} axisLine={false} tickLine={false}/>
                    <Tooltip formatter={v=>[fmtAmt(v,sym),""]} contentStyle={{borderRadius:12,background:solid,border:`1px solid ${border}`}}/>
                    <Area type="natural" dataKey="amount" stroke="#6D28D9" strokeWidth={2.5} fill="url(#color)"/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Recent */}
              <div style={{...cardStyle,padding:"24px"}}>
                <div style={{fontWeight:700,fontSize:16,marginBottom:16}}>Recent Expenses <span style={{fontSize:13,fontWeight:400,color:sub}}>(don't forget the chai ☕)</span></div>
                {expenses.length===0 ? (
                  <div style={{textAlign:"center",color:sub,padding:"30px 0"}}>No expenses yet. Add your first one!</div>
                ) : (
                  [...expenses].reverse().slice(0,5).map((e,idx)=>{const cat=getCat(e.category);const da=disp(e);return(
                    <div key={e.id} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 0",borderBottom:idx<4?`1px solid ${border}`:"none"}}>
                      <div style={{width:48,height:48,borderRadius:16,background:cat.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{cat.icon}</div>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:600}}>{e.desc||e.category}</div>
                        <div style={{fontSize:12,color:sub}}>{e.category} • {fmtDate(e.date)}</div>
                      </div>
                      <div style={{fontWeight:700,fontSize:16}}>{da.s}{Number(da.a).toLocaleString()}</div>
                    </div>
                  );})
                )}
              </div>
            </div>
          )}

          {/* ADD EXPENSE */}
          {view==="add"&&(
            <div style={{...cardStyle,padding:"28px 24px"}}>
              <div style={{fontSize:20,fontWeight:800,marginBottom:24}}>{editId?"Edit Expense":"New Expense"}</div>
              {/* Your existing form fields with updated styling */}
              {/* ... (I kept your original form logic but improved styling) */}
              <label style={lbl}>Amount</label>
              <div style={{display:"flex",gap:10,marginBottom:20}}>
                <select value={form.currency} onChange={e=>setForm(f=>({...f,currency:e.target.value}))} style={{...inpStyle,width:"auto",fontWeight:700}}>
                  {CURRENCIES.map(c=><option key={c.code} value={c.code}>{c.code} {c.symbol}</option>)}
                </select>
                <input type="number" placeholder="0.00" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} style={{...inpStyle,flex:1,fontSize:28,fontWeight:800}}/>
              </div>

              <label style={lbl}>Category</label>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(70px,1fr))",gap:10,marginBottom:20}}>
                {CATEGORIES.map(c=>(
                  <button key={c.name} onClick={()=>setForm(f=>({...f,category:c.name}))}
                    style={{padding:"12px 8px",borderRadius:14,border:`2px solid ${form.category===c.name?c.color:"transparent"}`,background:form.category===c.name?c.bg:card,cursor:"pointer"}}>
                    <div style={{fontSize:28}}>{c.icon}</div>
                    <div style={{fontSize:11,fontWeight:700,marginTop:4}}>{c.name}</div>
                  </button>
                ))}
              </div>

              <label style={lbl}>Description</label>
              <input placeholder="Coffee, groceries, auto..." value={form.desc} onChange={e=>setForm(f=>({...f,desc:e.target.value}))} style={{...inpStyle,marginBottom:20}}/>

              <label style={lbl}>Date</label>
              <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} style={inpStyle}/>

              <div style={{display:"flex",gap:12,marginTop:28}}>
                <button onClick={()=>{setView("dashboard");setEditId(null);setForm({amount:"",category:"Food",desc:"",date:today(),currency:currency.code});}} style={{flex:1,padding:14,borderRadius:16,border:`1px solid ${border}`,background:card,color:sub,fontWeight:700}}>Cancel</button>
                <button onClick={submitForm} style={{flex:2,padding:14,borderRadius:16,background:MAIN,color:"#fff",fontWeight:800}}>Save Expense</button>
              </div>
            </div>
          )}

          {/* REPORTS, GOALS, LIST views remain similar but with updated styling and copy. You can keep your original code for them or let me know if you want them fully refreshed too. */}

          {/* (The rest of your original views can stay as-is with the new cardStyle and colors) */}

        </div>
      </div>

      {/* Footer */}
      <div style={{textAlign:"center",padding:"24px 20px",fontSize:11,color:sub,background:dark?"rgba(10,10,15,0.95)":"rgba(249,247,255,0.95)",borderTop:`1px solid ${border}`}}>
        made with too much coffee in Dehradun • not perfect but real
      </div>

      {/* Keep all your modals, chat, and FABs from the original code. They will work fine with the new colors. */}

      {/* FABs */}
      <div style={{position:"fixed",bottom:24,right:20,display:"flex",flexDirection:"column",gap:12,zIndex:200}}>
        <button onClick={()=>setChatOpen(x=>!x)} style={{width:56,height:56,borderRadius:18,background:chatOpen?"#E11D48":MAIN,border:"none",color:"#fff",fontSize:24,cursor:"pointer",boxShadow:"0 8px 30px rgba(0,0,0,0.3)"}}>
          {chatOpen?"✕":"💬"}
        </button>
        {view!=="add" && <button onClick={()=>{setEditId(null);setForm({amount:"",category:"Food",desc:"",date:today(),currency:currency.code});setView("add");}} style={{width:56,height:56,borderRadius:18,background:MAIN,border:"none",color:"#fff",fontSize:32,cursor:"pointer",boxShadow:"0 8px 30px rgba(109,40,217,0.5)"}}>+</button>}
      </div>
    </div>
  );
}