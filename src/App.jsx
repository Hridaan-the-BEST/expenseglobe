import { useState, useMemo, useRef, useEffect } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Area, AreaChart } from "recharts";

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

// Smart chatbot - no API needed
const smartChat=(q,expenses,total,currency,monthTotal,catData,avgDaily,biggest)=>{
  const ql=q.toLowerCase();
  const sym=currency.symbol;
  const topCat=catData.sort((a,b)=>b.value-a.value)[0];

  if(ql.includes("total")||ql.includes("spent")||ql.includes("spend"))
    return `💰 You've spent a total of **${fmtAmt(total,sym)}** in ${currency.code}. This month: **${fmtAmt(monthTotal,sym)}**.`;

  if(ql.includes("average")||ql.includes("avg")||ql.includes("daily"))
    return `📅 Your average daily spending is **${fmtAmt(avgDaily,sym)}**. Try to keep it consistent!`;

  if(ql.includes("biggest")||ql.includes("largest")||ql.includes("most expensive"))
    return `🔝 Your biggest single expense is **${fmtAmt(biggest,sym)}**. Make sure big purchases are planned!`;

  if(ql.includes("category")||ql.includes("categories"))
    return `📊 Your top spending category is **${topCat?.name||"none"}** at **${fmtAmt(topCat?.value||0,sym)}**. ${topCat?.name==="Food"?"Consider meal prepping to save!":topCat?.name==="Shopping"?"Try the 24-hour rule before buying!":"Keep tracking to stay on budget!"}`;

  if(ql.includes("save")||ql.includes("saving")||ql.includes("tip"))
    return `💡 Here are 3 smart tips:\n1. Follow the **50/30/20 rule** — 50% needs, 30% wants, 20% savings\n2. Set monthly budget limits for each category\n3. Review your spending every Sunday evening`;

  if(ql.includes("food")||ql.includes("eating")||ql.includes("restaurant")){
    const foodSpent=catData.find(c=>c.name==="Food")?.value||0;
    return `🍔 You've spent **${fmtAmt(foodSpent,sym)}** on food. ${foodSpent>200?"That's quite high! Try cooking at home more often 🥗":"Great job keeping food costs reasonable!"}`;
  }

  if(ql.includes("transport")||ql.includes("travel")||ql.includes("commute")){
    const tSpent=catData.find(c=>c.name==="Transport")?.value||0;
    return `🚗 Transport spending: **${fmtAmt(tSpent,sym)}**. ${tSpent>150?"Consider carpooling or public transport to save!":"You're managing transport costs well!"}`;
  }

  if(ql.includes("how many")||ql.includes("count")||ql.includes("entries")||ql.includes("transactions"))
    return `📋 You have **${expenses.length} transactions** recorded in total.`;

  if(ql.includes("budget"))
    return `🎯 Set monthly budget limits in the **Dashboard → Budget Limits** section. I'll warn you when you're getting close to overspending!`;

  if(ql.includes("hello")||ql.includes("hi")||ql.includes("hey"))
    return `👋 Hello! I'm your SpendSmart assistant. Ask me about your spending, tips to save money, or anything finance related!`;

  if(ql.includes("report")||ql.includes("summary")||ql.includes("overview"))
    return `📊 **Financial Summary:**\n• Total spent: ${fmtAmt(total,sym)}\n• This month: ${fmtAmt(monthTotal,sym)}\n• Daily average: ${fmtAmt(avgDaily,sym)}\n• Biggest expense: ${fmtAmt(biggest,sym)}\n• Transactions: ${expenses.length}`;

  if(ql.includes("retire")||ql.includes("retirement"))
    return `🏖️ Smart retirement tip: Save at least **15% of your income** monthly. Even small amounts grow significantly over time thanks to compound interest!`;

  if(ql.includes("student")||ql.includes("school")||ql.includes("college"))
    return `🎓 Student finance tips:\n1. Track every expense — even small ones add up\n2. Cook at home instead of eating out\n3. Use student discounts whenever possible\n4. Set a weekly budget and stick to it!`;

  return `🤔 I can help you with:\n• Spending totals & averages\n• Category breakdowns\n• Money saving tips\n• Budget advice\n• Financial summaries\n\nTry asking: *"How much have I spent on food?"* or *"Give me saving tips"*`;
};

export default function App() {
  const [expenses,setExpenses]=useState(()=>{try{return JSON.parse(localStorage.getItem("ss_expenses")||"[]");}catch{return[];}});
  const [currency,setCurrency]=useState(()=>CURRENCIES.find(c=>c.code===(localStorage.getItem("ss_currency")||"USD"))||CURRENCIES[0]);
  const [budgets,setBudgets]=useState(()=>{try{return JSON.parse(localStorage.getItem("ss_budgets")||"null")||{Food:0,Transport:0,Housing:0,Health:0,Entertainment:0,Shopping:0,Others:0};}catch{return{Food:0,Transport:0,Housing:0,Health:0,Entertainment:0,Shopping:0,Others:0};}});
  const dark=true;
  const [view,setView]=useState("dashboard");
  const [timeView,setTimeView]=useState("weekly");
  const [form,setForm]=useState({amount:"",category:"Food",desc:"",date:today(),currency:"USD"});
  const [editId,setEditId]=useState(null);
  const [deleteId,setDeleteId]=useState(null);
  const [budgetModal,setBudgetModal]=useState(false);
  const [reportMonth,setReportMonth]=useState(curMonth());
  const [rates,setRates]=useState(FALLBACK);
  const [convertAll,setConvertAll]=useState(false);
  const [chatOpen,setChatOpen]=useState(false);
  const [msgs,setMsgs]=useState([{role:"assistant",content:"👋 Welcome to SpendSmart!\n\nI'm your personal finance assistant. Ask me anything about your spending, saving tips, or financial advice!"}]);
  const [chatIn,setChatIn]=useState("");
  const [goalModal,setGoalModal]=useState(false);
  const [goals,setGoals]=useState(()=>{try{return JSON.parse(localStorage.getItem("ss_goals")||"[]");}catch{return[];}});
  const [goalForm,setGoalForm]=useState({name:"",target:"",saved:""});
  const chatEnd=useRef(null);
  const sym=currency.symbol;

  useEffect(()=>localStorage.setItem("ss_expenses",JSON.stringify(expenses)),[expenses]);
  useEffect(()=>localStorage.setItem("ss_currency",currency.code),[currency]);
  useEffect(()=>localStorage.setItem("ss_budgets",JSON.stringify(budgets)),[budgets]);

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
  const monthDaily=useMemo(()=>{const[y,m]=reportMonth.split("-").map(Number);const days=new Date(y,m,0).getDate();return Array.from({length:days},(_,i)=>{const day=String(i+1).padStart(2,"0");const ds=`${reportMonth}-${day}`;return{label:String(i+1),amount:monthExp.filter(e=>e.date===ds).reduce((s,e)=>s+e._v,0)};});},[monthExp,reportMonth]);

  const budgetMonth=useMemo(()=>working.filter(e=>e.date.startsWith(curMonth())),[working]);
  const catSpent=n=>budgetMonth.filter(e=>e.category===n).reduce((s,e)=>s+e._v,0);
  const hasBudgets=Object.values(budgets).some(v=>v>0);

  const exportCSV=()=>{
    const rows=[["Date","Description","Category","Amount","Currency"],...expenses.map(e=>[e.date,e.desc||e.category,e.category,e.amount,e.currency])];
    const csv=rows.map(r=>r.join(",")).join("\n");
    const blob=new Blob([csv],{type:"text/csv"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download="spendsmart_expenses.csv";a.click();
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

    // === HUMANIZED COLORS ===
  const bg = "#0A0A0F";
  const card = "rgba(255,255,255,0.07)";
  const solid = "#12121A";
  const border = "rgba(255,255,255,0.1)";
  const txt = "#F0F0FF";
  const sub = "#A0A0C0";
  const ibg = "rgba(255,255,255,0.06)";
  const ibr = "rgba(255,255,255,0.15)";

  const MAIN = "linear-gradient(135deg,#6D28D9 0%,#DB2777 100%)";
  const MAIN2 = "linear-gradient(135deg,#3B82F6 0%,#8B5CF6 100%)";
  const MAIN3 = "linear-gradient(135deg,#E0115F 0%,#FF4757 100%)";

  const cardStyle = {background:card,backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",borderRadius:24,border:`1px solid ${border}`,boxShadow:"0 10px 40px rgba(0,0,0,0.5)"};
  const inpStyle = {width:"100%",boxSizing:"border-box",padding:"14px 16px",borderRadius:16,border:`1.5px solid ${ibr}`,fontSize:15,background:ibg,color:txt,outline:"none",fontFamily:"inherit"};
  const lbl = {fontSize:11,fontWeight:700,color:sub,textTransform:"uppercase",letterSpacing:0.8,display:"block",marginBottom:8};
  const BudgetBar=({name,icon,color})=>{
    const spent=catSpent(name),limit=budgets[name];
    if(!limit)return null;
    const pct=Math.min((spent/limit)*100,100),over=spent>limit,warn=pct>80&&!over;
    return(
      <div style={{background:ibg,borderRadius:14,padding:"12px 14px",border:`1px solid ${over?"rgba(255,71,87,0.3)":ibr}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <span style={{fontSize:12,fontWeight:700,display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:16}}>{icon}</span>{name}</span>
          <span style={{fontSize:11,fontWeight:800,color:over?"#FF4757":warn?"#FFA502":color}}>{fmtAmt(spent,sym)} / {fmtAmt(limit,sym)}</span>
        </div>
        <div style={{height:6,borderRadius:4,background:border}}>
          <div style={{height:"100%",borderRadius:4,width:`${pct}%`,background:over?"linear-gradient(90deg,#FF4757,#FF6B81)":warn?"#FFA502":color,transition:"width 0.5s ease"}}/>
        </div>
        {over&&<div style={{fontSize:10,color:"#FF4757",marginTop:5,fontWeight:700}}>⚠️ Over budget by {fmtAmt(spent-limit,sym)}</div>}
        {warn&&<div style={{fontSize:10,color:"#FFA502",marginTop:5,fontWeight:700}}>⚡ {(100-pct).toFixed(0)}% remaining</div>}
      </div>
    );
  };

  return(
    <div style={{fontFamily:"'Inter','Segoe UI',sans-serif",minHeight:"100vh",background:bg,color:txt,transition:"all 0.3s"}}>
      <style>{`
        @keyframes float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-35px) rotate(8deg); }
}

@keyframes floatTip {
  0%, 100% { transform: translateY(0) scale(1); opacity: 0.5; }
  50% { transform: translateY(-60px) scale(1.05); opacity: 0.85; }
}
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.75)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes glow{0%,100%{box-shadow:0 0 20px rgba(123,47,255,0.4)}50%{box-shadow:0 0 40px rgba(224,17,95,0.6)}}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(123,47,255,0.4);border-radius:4px}
        input[type=date]::-webkit-calendar-picker-indicator,input[type=month]::-webkit-calendar-picker-indicator{filter:${dark?"invert(1)":"none"};opacity:.4}
        input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
        select option{background:${dark?"#12121A":"#fff"};color:${txt}}
        .nav-btn:hover{transform:scale(1.03)}
      `}</style>

      {/* BG */}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",overflow:"hidden",zIndex:0}}>
        <div style={{position:"absolute",top:-150,left:-100,width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle,rgba(123,47,255,0.15) 0%,transparent 70%)"}}/>
        <div style={{position:"absolute",top:300,right:-120,width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(224,17,95,0.1) 0%,transparent 70%)"}}/>
        <div style={{position:"absolute",bottom:-100,left:"40%",width:350,height:350,borderRadius:"50%",background:"radial-gradient(circle,rgba(30,144,255,0.1) 0%,transparent 70%)"}}/>
      </div>

            <div style={{position:"relative",zIndex:1}}>

        {/* === NEW: Floating Doodles & Tips === */}
        <div style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          overflow: "hidden"
        }}>
          {/* Floating Doodles */}
          {[
            {emoji: "💰", left: "8%", top: "20%", delay: "0s", size: "28px"},
            {emoji: "📊", left: "85%", top: "35%", delay: "1.2s", size: "26px"},
            {emoji: "☕", left: "15%", top: "65%", delay: "0.8s", size: "24px"},
            {emoji: "🪙", left: "78%", top: "72%", delay: "2.1s", size: "30px"},
            {emoji: "📈", left: "22%", top: "28%", delay: "3s", size: "22px"},
            {emoji: "🍵", left: "88%", top: "18%", delay: "1.5s", size: "26px"},
          ].map((item, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: item.left,
                top: item.top,
                fontSize: item.size,
                opacity: 0.12,
                animation: `float 18s infinite ease-in-out ${item.delay}`,
                zIndex: 0,
              }}
            >
              {item.emoji}
            </div>
          ))}

          {/* Floating Finance Tips */}
          {[
            {text: "Track every ₹20", left: "12%", top: "45%", delay: "4s"},
            {text: "50/30/20 works", left: "82%", top: "52%", delay: "7s"},
            {text: "Chai > Latte", left: "18%", top: "78%", delay: "2.5s"},
            {text: "Review weekly", left: "75%", top: "25%", delay: "5.5s"},
          ].map((tip, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: tip.left,
                top: tip.top,
                fontSize: "11px",
                color: "#A0A0C0",
                background: "rgba(255,255,255,0.05)",
                padding: "4px 10px",
                borderRadius: "20px",
                border: "1px solid rgba(255,255,255,0.1)",
                whiteSpace: "nowrap",
                opacity: 0.6,
                animation: `floatTip 25s infinite ease-in-out ${tip.delay}`,
                zIndex: 0,
              }}
            >
              {tip.text}
            </div>
          ))}
        </div>

        {/* Your existing content */}
        {/* Header, Hero, Nav, etc. */}
                
               {/* Header - More Human */}
        <div style={{padding:"24px 20px 68px",background:dark?"linear-gradient(180deg,rgba(109,40,217,0.12) 0%,transparent 100%)":"linear-gradient(180deg,rgba(109,40,217,0.06) 0%,transparent 100%)"}}>
          <div style={{maxWidth:700,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:14}}>
              <div style={{width:48,height:48,borderRadius:18,background:MAIN,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,boxShadow:"0 6px 25px rgba(109,40,217,0.45)"}}>💸</div>
              <div>
                <div style={{fontSize:27,fontWeight:800,letterSpacing:"-1.4px"}}>SpendSmart</div>
                <div style={{fontSize:12,color:sub,marginTop:-2}}> Created by Hridaan Uniyal -- RANCE.co.ai __ A tiny tracker I actually use</div>
              </div>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <select value={currency.code} onChange={e=>setCurrency(CURRENCIES.find(c=>c.code===e.target.value))}
                style={{background:ibg,border:`1px solid ${ibr}`,color:txt,borderRadius:12,padding:"8px 12px",fontSize:13,cursor:"pointer",fontFamily:"inherit",outline:"none"}}>
                {CURRENCIES.map(c=><option key={c.code} value={c.code}>{c.code} {c.symbol}</option>)}
              </select>
              <button onClick={()=>setDark(x=>!x)} style={{width:40,height:40,borderRadius:12,border:`1px solid ${ibr}`,background:ibg,cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>{dark?"☀️":"🌙"}</button>
            </div>
          </div>
        </div>

        {/* Hero Card */}
        <div style={{maxWidth:700,margin:"-52px auto 0",padding:"0 20px"}}>
          <div style={{borderRadius:24,padding:"24px 26px",background:MAIN,boxShadow:"0 20px 60px rgba(123,47,255,0.45)",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:-30,right:-30,width:160,height:160,borderRadius:"50%",background:"rgba(255,255,255,0.06)"}}/>
            <div style={{position:"absolute",bottom:-40,left:"40%",width:120,height:120,borderRadius:"50%",background:"rgba(255,255,255,0.04)"}}/>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",position:"relative"}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.6)",letterSpacing:1.2,textTransform:"uppercase",marginBottom:6}}>Total Spent · {currency.code}</div>
                <div style={{fontSize:42,fontWeight:900,color:"#fff",letterSpacing:"-2px",lineHeight:1}}>{fmtAmt(total,sym)}</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8,alignItems:"flex-end"}}>
                <button onClick={()=>setConvertAll(x=>!x)}
                  style={{background:convertAll?"rgba(255,255,255,0.3)":"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:12,padding:"7px 12px",cursor:"pointer",color:"#fff",fontSize:10,fontWeight:800,letterSpacing:0.5}}>
                  💱 {convertAll?"LIVE RATES ON":"CONVERT ALL"}
                </button>
                <button onClick={exportCSV}
                  style={{background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:12,padding:"7px 12px",cursor:"pointer",color:"#fff",fontSize:10,fontWeight:800,letterSpacing:0.5}}>
                  📥 EXPORT CSV
                </button>
              </div>
            </div>
            <div style={{display:"flex",gap:24,marginTop:20,position:"relative"}}>
              {[["Avg/Day",fmtAmt(avgDaily,sym)],["Biggest",fmtAmt(biggest,sym)],["Entries",expenses.length],["This Month",fmtAmt(monthTotal,sym)]].map(([l,v])=>(
                <div key={l}><div style={{fontSize:9,color:"rgba(255,255,255,0.55)",marginBottom:4,fontWeight:700,letterSpacing:0.8,textTransform:"uppercase"}}>{l}</div><div style={{fontSize:13,fontWeight:800,color:"#fff"}}>{v}</div></div>
              ))}
            </div>
          </div>
        </div>

        {/* Nav */}
        <div style={{maxWidth:700,margin:"16px auto 0",padding:"0 20px"}}>
          <div style={{display:"flex",gap:5,background:card,backdropFilter:"blur(20px)",borderRadius:18,padding:6,border:`1px solid ${border}`}}>
            {[["dashboard","📊","Dashboard"],["add",editId?"✏️":"➕",editId?"Edit":"Add"],["reports","📅","Reports"],["goals","🎯","Goals"],["list","📋","All"]].map(([v,ic,l])=>(
              <button key={v} onClick={()=>setView(v)} className="nav-btn"
                style={{flex:1,padding:"9px 2px",borderRadius:13,border:"none",cursor:"pointer",fontSize:9,fontWeight:800,display:"flex",flexDirection:"column",alignItems:"center",gap:2,
                  background:view===v?MAIN:"transparent",color:view===v?"#fff":sub,transition:"all 0.2s",textTransform:"uppercase",letterSpacing:0.5,
                  boxShadow:view===v?"0 4px 16px rgba(123,47,255,0.35)":"none"}}>
                <span style={{fontSize:16}}>{ic}</span>{l}
              </button>
            ))}
          </div>
        </div>

        <div style={{maxWidth:700,margin:"14px auto",padding:"0 20px 110px"}}>

          {/* DASHBOARD */}
          {view==="dashboard"&&(
            <div style={{display:"flex",flexDirection:"column",gap:14,animation:"slideUp 0.3s ease"}}>

              {/* Budget */}
              <div style={{...cardStyle,padding:"22px 20px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:hasBudgets?16:0}}>
                  <div style={{fontWeight:800,fontSize:15,letterSpacing:"-0.3px"}}>💰 Monthly Budgets</div>
                  <button onClick={()=>setBudgetModal(true)} style={{fontSize:11,fontWeight:800,padding:"7px 16px",borderRadius:10,border:`1px solid ${ibr}`,background:ibg,color:sub,cursor:"pointer",letterSpacing:0.3}}>
                    {hasBudgets?"Manage ›":"+ Set Limits"}
                  </button>
                </div>
                {hasBudgets
                  ?<div style={{display:"flex",flexDirection:"column",gap:9}}>{CATEGORIES.map(c=><BudgetBar key={c.name} name={c.name} icon={c.icon} color={c.color}/>)}</div>
                  :<div style={{textAlign:"center",color:sub,fontSize:13,padding:"14px 0 4px",lineHeight:1.6}}>Set monthly limits per category to stay on track 🎯<br/><span style={{fontSize:11}}>Get alerts before you overspend</span></div>}
              </div>

              {/* Trend */}
              <div style={{...cardStyle,padding:"22px 20px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                  <div style={{fontWeight:800,fontSize:15}}>Spending Trend</div>
                  <div style={{display:"flex",gap:5,background:ibg,borderRadius:10,padding:4,border:`1px solid ${ibr}`}}>
                    {["daily","weekly"].map(t=>(
                      <button key={t} onClick={()=>setTimeView(t)} style={{padding:"4px 12px",borderRadius:8,border:"none",cursor:"pointer",fontSize:10,fontWeight:800,background:timeView===t?MAIN:"transparent",color:timeView===t?"#fff":sub,transition:"all 0.2s",textTransform:"uppercase",letterSpacing:0.3}}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={170}>
                  <AreaChart data={barData}>
                    <defs>
                      <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7B2FFF" stopOpacity={0.6}/>
                        <stop offset="100%" stopColor="#E0115F" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="label" tick={{fontSize:10,fill:sub,fontWeight:700}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:10,fill:sub}} axisLine={false} tickLine={false} width={32}/>
                    <Tooltip formatter={v=>[fmtAmt(v,sym),"Spent"]} contentStyle={{borderRadius:12,border:`1px solid ${border}`,background:solid,color:txt,fontSize:12}}/>
                    <Area type="monotone" dataKey="amount" stroke="#7B2FFF" strokeWidth={2.5} fill="url(#ag)"/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Categories */}
              <div style={{...cardStyle,padding:"22px 20px"}}>
                <div style={{fontWeight:800,fontSize:15,marginBottom:16}}>Category Breakdown</div>
                {catData.length===0
                  ?<div style={{textAlign:"center",color:sub,padding:"24px 0",fontSize:13}}>Add your first expense to see breakdown 📊</div>
                  :<div style={{display:"flex",gap:16,alignItems:"center"}}>
                    <ResponsiveContainer width="42%" height={155}>
                      <PieChart><Pie data={catData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={4} strokeWidth={0}>
                        {catData.map((c,i)=><Cell key={i} fill={c.color}/>)}
                      </Pie><Tooltip formatter={v=>[fmtAmt(v,sym),""]} contentStyle={{borderRadius:12,border:`1px solid ${border}`,background:solid,color:txt,fontSize:12}}/></PieChart>
                    </ResponsiveContainer>
                    <div style={{flex:1,display:"flex",flexDirection:"column",gap:9}}>
                      {catData.map((c,i)=>(
                        <div key={i}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                            <span style={{fontSize:11,color:sub,display:"flex",alignItems:"center",gap:5,fontWeight:600}}><span style={{width:8,height:8,borderRadius:"50%",background:c.color,display:"inline-block"}}/>{c.icon} {c.name}</span>
                            <span style={{fontSize:11,fontWeight:800,color:txt}}>{fmtAmt(c.value,sym)}</span>
                          </div>
                          <div style={{height:4,borderRadius:4,background:ibg}}><div style={{height:"100%",borderRadius:4,background:c.color,width:`${(c.value/total)*100}%`,transition:"width 0.6s ease"}}/></div>
                        </div>
                      ))}
                    </div>
                  </div>}
              </div>

              {/* Recent */}
              <div style={{...cardStyle,padding:"22px 20px"}}>
                <div style={{fontWeight:800,fontSize:15,marginBottom:14}}>Recent Transactions</div>
                {expenses.length===0&&<div style={{textAlign:"center",color:sub,fontSize:13,padding:"20px 0",lineHeight:1.8}}>No transactions yet 💸<br/><span style={{fontSize:11}}>Tap + to add your first expense</span></div>}
                {[...expenses].reverse().slice(0,5).map((e,idx)=>{const cat=getCat(e.category);const da=disp(e);return(
                  <div key={e.id} style={{display:"flex",alignItems:"center",gap:13,padding:"12px 0",borderBottom:idx<4&&expenses.length>1?`1px solid ${border}`:"none"}}>
                    <div style={{width:42,height:42,borderRadius:14,background:cat.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:19,flexShrink:0,border:`1px solid ${cat.color}25`}}>{cat.icon}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:700,marginBottom:3}}>{e.desc||e.category}</div>
                      <div style={{fontSize:10,color:sub,display:"flex",alignItems:"center",gap:6}}>
                        <span style={{background:cat.bg,color:cat.color,padding:"2px 8px",borderRadius:20,fontSize:9,fontWeight:800,textTransform:"uppercase",letterSpacing:0.3}}>{e.category}</span>{fmtDate(e.date)}
                      </div>
                    </div>
                    <div style={{fontSize:14,fontWeight:900,color:txt}}>{da.s}{Number(da.a).toLocaleString(undefined,{maximumFractionDigits:2})}</div>
                  </div>
                );})}
              </div>
            </div>
          )}

          {/* ADD */}
          {view==="add"&&(
            <div style={{...cardStyle,padding:"26px 22px",animation:"slideUp 0.3s ease"}}>
              <div style={{fontWeight:900,fontSize:18,marginBottom:22,letterSpacing:"-0.5px"}}>{editId?"✏️ Edit Transaction":"➕ New Transaction"}</div>
              <label style={lbl}>Amount</label>
              <div style={{display:"flex",gap:8,marginBottom:18}}>
                <select value={form.currency} onChange={e=>setForm(f=>({...f,currency:e.target.value}))} style={{...inpStyle,width:"auto",flex:1,fontWeight:700}}>
                  {CURRENCIES.map(c=><option key={c.code} value={c.code}>{c.code} {c.symbol}</option>)}
                </select>
                <input type="number" placeholder="0.00" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} style={{...inpStyle,flex:2.5,fontSize:26,fontWeight:900,color:"#7B2FFF"}}/>
              </div>
              <label style={lbl}>Category</label>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:18}}>
                {CATEGORIES.map(c=>(
                  <button key={c.name} onClick={()=>setForm(f=>({...f,category:c.name}))}
                    style={{padding:"12px 4px",borderRadius:14,border:`2px solid ${form.category===c.name?c.color:"transparent"}`,background:form.category===c.name?c.bg:ibg,cursor:"pointer",fontSize:9,fontWeight:800,color:form.category===c.name?c.color:sub,transition:"all 0.2s",textTransform:"uppercase",letterSpacing:0.5}}>
                    <div style={{fontSize:22,marginBottom:4}}>{c.icon}</div>{c.name}
                  </button>
                ))}
              </div>
              <label style={lbl}>Description</label>
              <input placeholder="What was this for?" value={form.desc} onChange={e=>setForm(f=>({...f,desc:e.target.value}))} style={{...inpStyle,marginBottom:16}}/>
              <label style={lbl}>Date</label>
              <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} style={{...inpStyle,marginBottom:26}}/>
              <div style={{display:"flex",gap:10}}>
                <button onClick={()=>{setView("dashboard");setEditId(null);setForm({amount:"",category:"Food",desc:"",date:today(),currency:currency.code});}}
                  style={{flex:1,padding:14,borderRadius:14,border:`1px solid ${ibr}`,background:ibg,color:sub,fontWeight:800,cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>Cancel</button>
                <button onClick={submitForm} style={{flex:2,padding:14,borderRadius:14,border:"none",background:MAIN,color:"#fff",fontWeight:900,cursor:"pointer",fontSize:13,fontFamily:"inherit",boxShadow:"0 6px 20px rgba(123,47,255,0.4)"}}>
                  {editId?"Save Changes":"Add Transaction"}
                </button>
              </div>
            </div>
          )}

          {/* REPORTS */}
          {view==="reports"&&(
            <div style={{display:"flex",flexDirection:"column",gap:14,animation:"slideUp 0.3s ease"}}>
              <div style={{...cardStyle,padding:"20px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontWeight:800,fontSize:15}}>📅 Monthly Report</div>
                  <input type="month" value={reportMonth} onChange={e=>setReportMonth(e.target.value)} style={{...inpStyle,width:"auto",padding:"8px 12px",fontSize:12,fontWeight:700}}/>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div style={{...cardStyle,padding:"20px 16px"}}>
                  <div style={{fontSize:10,color:sub,fontWeight:800,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Month Total</div>
                  <div style={{fontSize:26,fontWeight:900,letterSpacing:"-1px"}}>{fmtAmt(monthTotal,sym)}</div>
                  {monthDelta!==null&&<div style={{fontSize:11,marginTop:6,color:monthDelta>0?"#FF4757":"#2ED573",fontWeight:800}}>{monthDelta>0?"▲":"▼"} {Math.abs(monthDelta).toFixed(1)}% vs last month</div>}
                </div>
                <div style={{...cardStyle,padding:"20px 16px"}}>
                  <div style={{fontSize:10,color:sub,fontWeight:800,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Transactions</div>
                  <div style={{fontSize:26,fontWeight:900}}>{monthExp.length}</div>
                  <div style={{fontSize:11,color:sub,marginTop:6,fontWeight:600}}>Avg {fmtAmt(monthExp.length?monthTotal/monthExp.length:0,sym)} each</div>
                </div>
              </div>
              <div style={{...cardStyle,padding:"22px 20px"}}>
                <div style={{fontWeight:800,fontSize:15,marginBottom:16}}>Daily Activity</div>
                {monthExp.length===0?<div style={{textAlign:"center",color:sub,fontSize:13,padding:"20px 0"}}>No transactions this month</div>
                  :<ResponsiveContainer width="100%" height={160}>
                    <BarChart data={monthDaily} barSize={6}>
                      <defs><linearGradient id="mg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7B2FFF"/><stop offset="100%" stopColor="#E0115F"/></linearGradient></defs>
                      <XAxis dataKey="label" tick={{fontSize:9,fill:sub}} axisLine={false} tickLine={false} interval={4}/>
                      <YAxis tick={{fontSize:9,fill:sub}} axisLine={false} tickLine={false} width={28}/>
                      <Tooltip formatter={v=>[fmtAmt(v,sym),"Spent"]} contentStyle={{borderRadius:12,border:`1px solid ${border}`,background:solid,color:txt,fontSize:12}}/>
                      <Bar dataKey="amount" fill="url(#mg)" radius={[4,4,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>}
              </div>
              <div style={{...cardStyle,padding:"22px 20px"}}>
                <div style={{fontWeight:800,fontSize:15,marginBottom:16}}>Category Breakdown</div>
                {monthCats.length===0?<div style={{textAlign:"center",color:sub,fontSize:13,padding:"16px 0"}}>No data this month</div>
                  :monthCats.map((c,i)=>(
                    <div key={i} style={{marginBottom:14}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                        <span style={{fontSize:13,fontWeight:700,display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:17}}>{c.icon}</span>{c.name}</span>
                        <div style={{textAlign:"right"}}><div style={{fontSize:13,fontWeight:900}}>{fmtAmt(c.value,sym)}</div><div style={{fontSize:10,color:sub,fontWeight:600}}>{((c.value/monthTotal)*100).toFixed(1)}%</div></div>
                      </div>
                      <div style={{height:7,borderRadius:5,background:ibg}}><div style={{height:"100%",borderRadius:5,background:c.color,width:`${(c.value/monthTotal)*100}%`,transition:"width 0.6s ease"}}/></div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* GOALS */}
          {view==="goals"&&(
            <div style={{display:"flex",flexDirection:"column",gap:14,animation:"slideUp 0.3s ease"}}>
              <div style={{...cardStyle,padding:"22px 20px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:goals.length?20:0}}>
                  <div style={{fontWeight:800,fontSize:15}}>🎯 Financial Goals</div>
                  <button onClick={()=>setGoalModal(true)} style={{fontSize:11,fontWeight:800,padding:"7px 16px",borderRadius:10,border:`1px solid ${ibr}`,background:ibg,color:sub,cursor:"pointer"}}>+ Add Goal</button>
                </div>
                {goals.length===0
                  ?<div style={{textAlign:"center",color:sub,fontSize:13,padding:"20px 0",lineHeight:1.8}}>No goals yet! 🌟<br/><span style={{fontSize:11}}>Set a savings goal to stay motivated</span></div>
                  :goals.map((g,i)=>{
                    const pct=Math.min((Number(g.saved)/Number(g.target))*100,100);
                    const done=pct>=100;
                    return(
                      <div key={i} style={{background:ibg,borderRadius:16,padding:"16px",border:`1px solid ${ibr}`,marginBottom:10}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                          <div style={{fontWeight:800,fontSize:14}}>{done?"✅":""} {g.name}</div>
                          <button onClick={()=>setGoals(p=>p.filter((_,j)=>j!==i))} style={{background:"rgba(255,71,87,0.1)",border:"none",borderRadius:8,padding:"4px 8px",cursor:"pointer",fontSize:11,color:"#FF4757"}}>✕</button>
                        </div>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                          <span style={{fontSize:12,color:sub,fontWeight:600}}>Saved: {sym}{Number(g.saved).toLocaleString()}</span>
                          <span style={{fontSize:12,fontWeight:800,color:done?"#2ED573":"#7B2FFF"}}>{pct.toFixed(0)}%</span>
                        </div>
                        <div style={{height:8,borderRadius:5,background:border}}>
                          <div style={{height:"100%",borderRadius:5,background:done?"#2ED573":MAIN,width:`${pct}%`,transition:"width 0.6s ease"}}/>
                        </div>
                        <div style={{fontSize:11,color:sub,marginTop:8,fontWeight:600}}>Target: {sym}{Number(g.target).toLocaleString()} {done?"🎉 Goal reached!":""}</div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* ALL */}
          {view==="list"&&(
            <div style={{...cardStyle,padding:"22px 20px",animation:"slideUp 0.3s ease"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                <div style={{fontWeight:800,fontSize:15}}>All Transactions</div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <button onClick={exportCSV} style={{fontSize:10,fontWeight:800,padding:"6px 12px",borderRadius:10,border:`1px solid ${ibr}`,background:ibg,color:sub,cursor:"pointer"}}>📥 CSV</button>
                  <div style={{fontSize:11,color:sub,background:ibg,padding:"4px 12px",borderRadius:20,border:`1px solid ${ibr}`,fontWeight:700}}>{expenses.length} entries</div>
                </div>
              </div>
              {expenses.length===0&&<div style={{textAlign:"center",color:sub,padding:32,fontSize:13}}>No transactions yet</div>}
              {[...expenses].reverse().map((e,idx)=>{const cat=getCat(e.category);const da=disp(e);return(
                <div key={e.id} style={{display:"flex",alignItems:"center",gap:11,padding:"11px 0",borderBottom:idx<expenses.length-1?`1px solid ${border}`:"none"}}>
                  <div style={{width:38,height:38,borderRadius:12,background:cat.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}>{cat.icon}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{e.desc||e.category}</div>
                    <div style={{fontSize:10,color:sub,fontWeight:600}}>{e.category} · {fmtDate(e.date)} · {e.currency}</div>
                  </div>
                  <div style={{fontSize:13,fontWeight:900,marginRight:4}}>{da.s}{Number(da.a).toLocaleString(undefined,{maximumFractionDigits:2})}</div>
                  <button onClick={()=>startEdit(e)} style={{width:30,height:30,borderRadius:9,border:`1px solid ${ibr}`,background:ibg,cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"}}>✏️</button>
                  <button onClick={()=>setDeleteId(e.id)} style={{width:30,height:30,borderRadius:9,border:"1px solid rgba(255,71,87,0.2)",background:"rgba(255,71,87,0.07)",cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"}}>🗑️</button>
                </div>
              );})}
            </div>
          )}
        </div>
      </div>

      {/* Budget Modal */}
      {budgetModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(8px)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:400,animation:"fadeIn 0.2s ease"}}>
          <div style={{background:solid,borderRadius:"24px 24px 0 0",padding:"24px 20px 32px",width:"100%",maxWidth:700,border:`1px solid ${border}`,boxShadow:"0 -16px 48px rgba(0,0,0,0.3)",maxHeight:"85vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div style={{fontWeight:900,fontSize:17}}>💰 Monthly Budget Limits</div>
              <button onClick={()=>setBudgetModal(false)} style={{width:32,height:32,borderRadius:10,border:`1px solid ${ibr}`,background:ibg,cursor:"pointer",color:sub,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>✕</button>
            </div>
            <div style={{fontSize:12,color:sub,marginBottom:20,fontWeight:600}}>Set a monthly limit per category in {currency.code}. Leave at 0 for no limit.</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {CATEGORIES.map(c=>(
                <div key={c.name} style={{display:"flex",alignItems:"center",gap:12,background:ibg,borderRadius:14,padding:"12px 14px",border:`1px solid ${ibr}`}}>
                  <div style={{width:36,height:36,borderRadius:11,background:c.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{c.icon}</div>
                  <div style={{flex:1,fontSize:13,fontWeight:700}}>{c.name}</div>
                  <span style={{fontSize:13,color:sub,fontWeight:600}}>{sym}</span>
                  <input type="number" value={budgets[c.name]||""} placeholder="0"
                    onChange={e=>setBudgets(b=>({...b,[c.name]:Number(e.target.value)||0}))}
                    style={{width:90,padding:"8px 10px",borderRadius:10,border:`1px solid ${ibr}`,background:bg,color:txt,fontSize:13,fontWeight:800,outline:"none",textAlign:"right",fontFamily:"inherit"}}/>
                </div>
              ))}
            </div>
            <button onClick={()=>setBudgetModal(false)} style={{width:"100%",marginTop:20,padding:14,borderRadius:14,border:"none",background:MAIN,color:"#fff",fontWeight:900,cursor:"pointer",fontSize:14,fontFamily:"inherit",boxShadow:"0 6px 20px rgba(123,47,255,0.35)"}}>
              Save Budgets
            </button>
          </div>
        </div>
      )}

      {/* Goal Modal */}
      {goalModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:400,padding:24,animation:"fadeIn 0.2s ease"}}>
          <div style={{background:solid,borderRadius:24,padding:28,maxWidth:340,width:"100%",border:`1px solid ${border}`,boxShadow:"0 24px 64px rgba(0,0,0,0.4)"}}>
            <div style={{fontWeight:900,fontSize:17,marginBottom:20}}>🎯 New Financial Goal</div>
            <label style={lbl}>Goal Name</label>
            <input placeholder="e.g. New Laptop, Vacation..." value={goalForm.name} onChange={e=>setGoalForm(f=>({...f,name:e.target.value}))} style={{...inpStyle,marginBottom:14}}/>
            <label style={lbl}>Target Amount ({sym})</label>
            <input type="number" placeholder="0.00" value={goalForm.target} onChange={e=>setGoalForm(f=>({...f,target:e.target.value}))} style={{...inpStyle,marginBottom:14}}/>
            <label style={lbl}>Already Saved ({sym})</label>
            <input type="number" placeholder="0.00" value={goalForm.saved} onChange={e=>setGoalForm(f=>({...f,saved:e.target.value}))} style={{...inpStyle,marginBottom:22}}/>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>{setGoalModal(false);setGoalForm({name:"",target:"",saved:""}); }} style={{flex:1,padding:13,borderRadius:13,border:`1px solid ${ibr}`,background:ibg,color:sub,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
              <button onClick={()=>{if(!goalForm.name||!goalForm.target)return;setGoals(p=>[...p,goalForm]);setGoalModal(false);setGoalForm({name:"",target:"",saved:""}); }}
                style={{flex:2,padding:13,borderRadius:13,border:"none",background:MAIN,color:"#fff",fontWeight:900,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 6px 20px rgba(123,47,255,0.35)"}}>Add Goal</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteId!==null&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:400,padding:24,animation:"fadeIn 0.2s ease"}}>
          <div style={{background:solid,borderRadius:24,padding:28,maxWidth:290,width:"100%",textAlign:"center",border:`1px solid ${border}`,boxShadow:"0 24px 64px rgba(0,0,0,0.4)"}}>
            <div style={{width:52,height:52,borderRadius:16,background:"rgba(255,71,87,0.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,margin:"0 auto 12px"}}>🗑️</div>
            <div style={{fontWeight:900,fontSize:16,marginBottom:8}}>Remove Transaction?</div>
            <div style={{color:sub,fontSize:12,marginBottom:22,lineHeight:1.6,fontWeight:600}}>This action is permanent and cannot be reversed.</div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setDeleteId(null)} style={{flex:1,padding:12,borderRadius:13,border:`1px solid ${ibr}`,background:ibg,color:sub,fontWeight:800,cursor:"pointer",fontFamily:"inherit",fontSize:13}}>Cancel</button>
              <button onClick={()=>{setExpenses(p=>p.filter(e=>e.id!==deleteId));setDeleteId(null);}} style={{flex:1,padding:12,borderRadius:13,border:"none",background:MAIN3,color:"#fff",fontWeight:900,cursor:"pointer",fontFamily:"inherit",fontSize:13,boxShadow:"0 4px 14px rgba(255,71,87,0.4)"}}>Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* Chat */}
      {chatOpen&&(
        <div style={{position:"fixed",bottom:90,right:20,width:320,height:470,background:solid,borderRadius:22,boxShadow:"0 16px 64px rgba(0,0,0,0.5)",display:"flex",flexDirection:"column",zIndex:300,overflow:"hidden",border:`1px solid ${border}`,animation:"slideUp 0.3s ease"}}>
          <div style={{background:MAIN,padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:32,height:32,borderRadius:11,background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>💬</div>
              <div>
                <div style={{fontWeight:800,color:"#fff",fontSize:13,letterSpacing:"-0.3px"}}>Finance Assistant</div>
                <div style={{fontSize:9,color:"rgba(255,255,255,0.6)",display:"flex",alignItems:"center",gap:4,fontWeight:700,letterSpacing:0.5,textTransform:"uppercase"}}><span style={{width:5,height:5,borderRadius:"50%",background:"#2ED573",display:"inline-block"}}/>Online · by RANCE.co.ai</div>
              </div>
            </div>
            <button onClick={()=>setChatOpen(false)} style={{width:28,height:28,borderRadius:9,background:"rgba(255,255,255,0.15)",border:"none",cursor:"pointer",color:"#fff",fontSize:13,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"14px 12px",display:"flex",flexDirection:"column",gap:10,background:dark?"#0D0D15":"#F8F8FF"}}>
            {msgs.map((m,i)=>(
              <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",animation:"slideUp 0.2s ease"}}>
                {m.role==="assistant"&&<div style={{width:26,height:26,borderRadius:9,background:MAIN,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,marginRight:7,flexShrink:0,alignSelf:"flex-end"}}>💬</div>}
                <div style={{maxWidth:"78%",padding:"10px 13px",borderRadius:m.role==="user"?"18px 18px 4px 18px":"18px 18px 18px 4px",
                  background:m.role==="user"?MAIN:ibg,color:m.role==="user"?"#fff":txt,fontSize:12.5,lineHeight:1.6,whiteSpace:"pre-wrap",
                  boxShadow:m.role==="user"?"0 4px 12px rgba(123,47,255,0.3)":"none",border:m.role!=="user"?`1px solid ${border}`:"none",fontWeight:m.role==="user"?600:500}}>
                  {m.content}
                </div>
              </div>
            ))}
            <div ref={chatEnd}/>
          </div>
          <div style={{padding:"10px 12px",borderTop:`1px solid ${border}`,display:"flex",gap:7,background:solid,flexShrink:0}}>
            <input value={chatIn} onChange={e=>setChatIn(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendChat()} placeholder="Ask about your finances..."
              style={{flex:1,padding:"10px 13px",borderRadius:13,border:`1.5px solid ${ibr}`,background:ibg,color:txt,fontSize:12.5,outline:"none",fontFamily:"inherit",fontWeight:500}}/>
            <button onClick={sendChat} disabled={!chatIn.trim()}
              style={{width:40,height:40,borderRadius:12,border:"none",background:!chatIn.trim()?ibg:MAIN,color:!chatIn.trim()?sub:"#fff",fontWeight:900,cursor:!chatIn.trim()?"not-allowed":"pointer",fontSize:17,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:chatIn.trim()?"0 4px 14px rgba(123,47,255,0.4)":"none",transition:"all 0.2s"}}>↑</button>
          </div>
        </div>
      )}

      {/* FABs */}
      <div style={{position:"fixed",bottom:24,right:20,display:"flex",flexDirection:"column",gap:10,zIndex:200}}>
        <button onClick={()=>setChatOpen(x=>!x)} style={{width:48,height:48,borderRadius:15,background:chatOpen?"#E0115F":MAIN2,border:"none",color:"#fff",fontSize:19,cursor:"pointer",boxShadow:"0 6px 20px rgba(30,144,255,0.45)",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.25s"}}>
          {chatOpen?"✕":"💬"}
        </button>
        {view!=="add"&&<button onClick={()=>{setEditId(null);setForm({amount:"",category:"Food",desc:"",date:today(),currency:currency.code});setView("add");}} style={{width:48,height:48,borderRadius:15,background:MAIN,border:"none",color:"#fff",fontSize:22,cursor:"pointer",boxShadow:"0 6px 20px rgba(123,47,255,0.5)",display:"flex",alignItems:"center",justifyContent:"center",animation:"glow 3s infinite"}}>+</button>}
      </div>

      {/* Footer */}
     <div                     style={{position:"fixed",bottom:1,left:0,right:0,textAlign:"center",padding:"6px",fontSize:10,color:sub,fontWeight:700,letterSpacing:0.5,background:dark?"rgba(10,10,15,0.95)":"rgba(244,244,255,0.95)",backdropFilter:"blur(10px)",borderTop:`1px solid ${border}`,zIndex:100}}>
        --SPEND_SMART-- · CREATED BY RANCE.co.ai · ALL RIGHTS RESERVED  -__--_--__- Made with too much Tea and Coffee in India.
      </div>
     
    </div>

      <div style={{position:"fixed",bottom:0,left:0,right:0,textAlign:"center",padding:"6px",fontSize:10,color:sub,fontWeight:700,letterSpacing:0.5,background:dark?"rgba(10,10,15,0.95)":"rgba(244,244,255,0.95)",backdropFilter:"blur(10px)",borderTop:`1px solid ${border}`,zIndex:100}}>
       Check out our cool 2D shooter game:https | //melodious-panda-e0aa3a.netlify.app/ or https://tourmaline-pie-dd0ea3.netlify.app/
      </div>

    </div>
  );
}