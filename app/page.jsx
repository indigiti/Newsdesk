'use client';
import {useCallback,useEffect,useRef,useState} from 'react';

const sections=[['Today','today','#2688ff'],['Stocks','chart','#36c88b'],['Saved','save','#e8a444'],['Topics','grid','#a67bfa'],['Sources','radio','#637df0']];
const topics=[
 ['Markets',/\b(market|markets|stocks?|sensex|nifty|shares|bonds?|equities|wall street|nasdaq)\b/i,'#4ca7ff'],
 ['Economy',/\b(economy|economic|inflation|central bank|interest rates?|gdp|rbi|jobs data|fed)\b/i,'#3cc790'],
 ['Business',/\b(company|business|earnings|profit|revenue|merger|acquisition|ipo)\b/i,'#e47d9b'],
 ['World',/\b(global|world|europe|china|japan|geopolitic\w*|trade war)\b/i,'#e4a449'],
 ['Energy',/\b(oil|gas|opec|crude|energy|petroleum)\b/i,'#a78afa']
];
const companies=[
 ['RELIANCE','Reliance Industries','Energy',/\b(reliance industries|reliance ind)\b/i],
 ['HDFCBANK','HDFC Bank','Financials',/\bhdfc\s?bank\b/i],
 ['BHARTIARTL','Bharti Airtel','Telecom',/\b(bharti airtel|airtel)\b/i],
 ['ICICIBANK','ICICI Bank','Financials',/\bicici\s?bank\b/i],
 ['SBIN','State Bank of India','Financials',/\b(state bank of india|sbi)\b/i],
 ['TCS','Tata Consultancy Services','Technology',/\b(tcs|tata consultancy services)\b/i],
 ['INFY','Infosys','Technology',/\binfosys\b/i],
 ['LT','Larsen & Toubro','Industrials',/\blarsen (?:&|and) toubro\b/i],
 ['SUNPHARMA','Sun Pharmaceutical Industries','Healthcare',/\bsun pharma\w*\b/i]
];
const paths={today:'M3 5h18v14H3z M7 9h10 M7 13h7',chart:'M3 17l6-6 4 3 7-8 M15 6h5v5',save:'M6 4h12v16l-6-4-6 4z',grid:'M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h6v6h-6z',radio:'M12 9v11 M8 6a6 6 0 0 0 0 8 M16 6a6 6 0 0 1 0 8 M5 3a10 10 0 0 0 0 14 M19 3a10 10 0 0 1 0 14',search:'M15 15l5 5 M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',refresh:'M20 7v5h-5 M4 17v-5h5 M5 9a8 8 0 0 1 13-4l2 3 M4 16l2 3a8 8 0 0 0 13-4',arrow:'M6 18L18 6 M8 6h10v10',list:'M4 6h16 M4 12h16 M4 18h16'};
function Icon({name,size=17}){return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]}/></svg>}
function topicOf(story){return topics.filter(([,re])=>re.test(story.title)).map(([name])=>name)}
function dateLabel(time){return time>0?new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'}).format(time*1000):'Time unavailable'}
function LeadArt(){return <svg className="lead-art" viewBox="0 0 660 290" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><pattern id="desk-grid" width="37" height="30" patternUnits="userSpaceOnUse"><path d="M37 0H0v30" fill="none" stroke="#a5cef1" strokeOpacity=".22"/></pattern><linearGradient id="desk-blue"><stop stopColor="#112a4c"/><stop offset="1" stopColor="#155460"/></linearGradient></defs><rect width="660" height="290" fill="url(#desk-blue)"/><rect width="660" height="290" fill="url(#desk-grid)"/><circle cx="530" cy="110" r="94" fill="none" stroke="#80d4c8" opacity=".32"/><circle cx="530" cy="110" r="70" fill="none" stroke="#80d4c8" opacity=".23"/><path d="M0 190L47 160L92 183L144 117L187 139L238 102L278 125L326 90L377 106L421 60L472 75L514 44L563 58L610 29L660 42" fill="none" stroke="#6ee7d5" strokeWidth="3" opacity=".78"/></svg>}

export default function Workspace(){
 const [data,setData]=useState(null),[error,setError]=useState(false),[busy,setBusy]=useState(false),[view,setView]=useState('Today'),[query,setQuery]=useState(''),[topic,setTopic]=useState(''),[source,setSource]=useState(''),[stock,setStock]=useState(''),[saved,setSaved]=useState([]),[theme,setTheme]=useState('system'),[mode,setMode]=useState('grid'),[hydrated,setHydrated]=useState(false);
 const search=useRef(null),inFlight=useRef(null);
 const refresh=useCallback(async()=>{if(inFlight.current)return;const request=new AbortController();inFlight.current=request;setBusy(true);
   try{const response=await fetch((process.env.NEXT_PUBLIC_BASE_PATH??'')+'/api/stories.php',{cache:'no-store',signal:request.signal});if(!response.ok)throw new Error('Inbox unavailable');const value=await response.json();setData({...value,refresh_status:response.headers.get('X-NewsDesk-Refresh')??value.refresh_status});setError(false)}
   catch(e){if(e.name!=='AbortError')setError(true)}
   finally{if(inFlight.current===request){inFlight.current=null;setBusy(false)}}
 },[]);
 useEffect(()=>{refresh();const timer=setInterval(()=>{if(!document.hidden)refresh()},60000);return()=>{clearInterval(timer);inFlight.current?.abort();inFlight.current=null}},[refresh]);
 useEffect(()=>{try{const stored=JSON.parse(localStorage.getItem('newsdesk:saved')??'[]');if(Array.isArray(stored))setSaved(stored);const t=localStorage.getItem('newsdesk:theme');if(['light','system','dark'].includes(t))setTheme(t)}catch{}setHydrated(true)},[]);
 useEffect(()=>{if(hydrated)try{localStorage.setItem('newsdesk:saved',JSON.stringify(saved));localStorage.setItem('newsdesk:theme',theme)}catch{}},[saved,theme,hydrated]);
 useEffect(()=>{const key=e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();search.current?.focus()}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[]);
 const stories=data?.stories??[], term=query.trim().toLowerCase();
 const sources=[...new Set(stories.flatMap(s=>s.articles.map(a=>a.source)))].sort();
 const ticker=companies.find(c=>c[0]===stock);
 const switchView=(name,t='',s='',symbol='')=>{setView(name);setTopic(t);setSource(s);setStock(symbol);setQuery('')};
 const selectTopic=t=>{setTopic(t);setSource('');setStock('');setQuery('');if(view!=='Today'&&view!=='Topics')setView('Topics')};
 const displayed=(view==='Saved'?saved:stories).filter(s=>(!topic||topicOf(s).includes(topic))&&(!source||s.articles.some(a=>a.source===source))&&(!ticker||ticker[3].test(s.title))&&(!term||[s.title,...s.articles.flatMap(a=>[a.source,a.title])].join(' ').toLowerCase().includes(term)));
 const briefing=view==='Today'&&!term&&!topic&&displayed.length>0;
 const lead=briefing?displayed[0]:null, other=briefing?displayed.slice(1,5):[], latest=lead?displayed.slice(1+other.length):displayed;
 const status=error?'Inbox unavailable':!data?'Loading feeds':data.updated_at?'Snapshot available':({feeds_not_configured:'Feeds not configured',refresh_in_progress:'First refresh in progress',refresh_failed:'Feed refresh failed',storage_not_writable:'Storage not writable',retry_cooldown:'Refresh on cooldown'}[data.refresh_status]??'No snapshot yet');
 const save=s=>setSaved(items=>items.some(i=>i.id===s.id)?items.filter(i=>i.id!==s.id):[s,...items].slice(0,250));
 const filterCompanies=companies.filter(c=>c.slice(0,3).join(' ').toLowerCase().includes(term));
 function Coverage({story}){return <ul className="coverage">{story.articles.map(a=><li key={a.url}><a href={a.url} target="_blank" rel="noopener noreferrer"><span>{a.source}</span><Icon name="arrow" size={12}/></a></li>)}</ul>}
 function SaveButton({story}){const active=saved.some(s=>s.id===story.id);return <button className="icon-button" type="button" onClick={()=>save(story)} aria-label={active?'Remove saved story':'Save story'} aria-pressed={active}><Icon name="save"/></button>}
 function StoryCard({story}){return <article className="story-card"><div className="story-meta"><span className="dot"/>{story.articles[0]?.source}<span>·</span>{dateLabel(story.time)}</div><h3>{story.title}</h3><Coverage story={story}/><div className="story-foot"><span>{topicOf(story).join(' · ')||'News'}</span><SaveButton story={story}/></div></article>}
 return <div className="desk" data-theme={theme}>
 <aside className="rail" aria-label="Workspace navigation">
  <div className="brand"><span className="brand-mark"><Icon name="radio" size={20}/></span><div><strong>NewsDesk</strong><small>MARKET INTELLIGENCE</small></div></div>
  <nav className="rail-nav">{sections.map(([label,icon,color])=><button key={label} type="button" aria-current={view===label?'page':undefined} onClick={()=>switchView(label)}><span className="nav-icon" style={{background:color}}><Icon name={icon} size={14}/></span>{label}{label==='Saved'&&saved.length>0&&<small>{saved.length}</small>}</button>)}</nav>
  <div className="rail-topics"><p className="eyebrow">Topics in this snapshot</p>{topics.map(([name,re,color])=><button type="button" key={name} onClick={()=>switchView('Topics',name)} aria-pressed={view==='Topics'&&topic===name}><span className="dot" style={{background:color}}/>{name}<small>{stories.filter(s=>re.test(s.title)).length}</small></button>)}</div>
  <div className="rail-foot"><p role="status"><span className={'dot '+(data?.updated_at&&!error?'ready':'')}/>{status}</p><div className="segmented" aria-label="Appearance">{['light','system','dark'].map(t=><button key={t} type="button" aria-pressed={theme===t} onClick={()=>setTheme(t)}>{t[0].toUpperCase()+t.slice(1)}</button>)}</div></div>
 </aside>
 <div className="workspace">
  <header className="bar"><strong>{view}</strong><label className="search"><Icon name="search"/><input ref={search} value={query} onChange={e=>setQuery(e.target.value)} aria-label="Search headlines or sources" placeholder={view==='Stocks'&&!ticker?'Search ticker, company, sector…':'Search headlines or sources…'}/><kbd>Ctrl K</kbd></label><button className="icon-button" type="button" onClick={refresh} disabled={busy} aria-label="Refresh inbox"><Icon name="refresh"/></button></header>
  <main className="canvas">
   <div className="page-heading"><p className="eyebrow">{view==='Today'?'Market intelligence / Daily briefing':view==='Stocks'?'Market intelligence / NSE equities':'Market intelligence / '+view}</p>
   <h1>{view==='Today'?'Daily briefing':ticker?ticker[0]:view==='Topics'&&topic?topic:view==='Sources'&&source?source:view}</h1>
   <p>{view==='Stocks'?(ticker?ticker[1]+' · News matches by headline':'A starter company directory. Headlines only; no live quotes.'):view==='Saved'?'Stories saved in this browser.':view==='Topics'?'Browse headline-based topic matches.':view==='Sources'?'Browse publishers represented in the current snapshot.':stories.length+' stories · '+sources.length+' sources in the current snapshot'}</p></div>
   {view==='Stocks'&&!ticker?<div className="cards">{filterCompanies.map(([symbol,name,sector,re])=><article className="directory-card" key={symbol}><p className="eyebrow">NSE · {sector}</p><h2>{symbol}</h2><p>{name}</p><button type="button" onClick={()=>switchView('Stocks','','',symbol)}>News stream <span>{stories.filter(s=>re.test(s.title)).length}</span><Icon name="arrow" size={13}/></button></article>)}{!filterCompanies.length&&<p>No matching companies.</p>}</div>:view==='Sources'&&!source?<div className="cards">{sources.filter(s=>s.toLowerCase().includes(term)).map(s=><article className="directory-card" key={s}><p className="eyebrow">Publisher</p><h2>{s}</h2><button type="button" onClick={()=>switchView('Sources','',s)}>News stream <span>{stories.filter(st=>st.articles.some(a=>a.source===s)).length}</span><Icon name="arrow" size={13}/></button></article>)}{!sources.length&&<div className="empty">No sources in the snapshot yet.</div>}{sources.length>0&&!sources.some(s=>s.toLowerCase().includes(term))&&<div className="empty">No matching sources.</div>}</div>:<>
   {lead&&<section className="briefing" aria-labelledby="top-label"><h2 id="top-label">Top stories</h2><div className="brief-grid"><article className="lead"><LeadArt/><div className="lead-content"><p className="eyebrow">Latest lead · {lead.articles.length} {lead.articles.length===1?'source':'sources'}</p><h3>{lead.title}</h3><div className="lead-links"><Coverage story={lead}/><SaveButton story={lead}/></div></div></article><div className="roundup"><p className="eyebrow">Also making news</p>{other.length?other.map(s=><div className="roundup-row" key={s.id}><div className="story-meta"><span className="dot"/>{s.articles[0]?.source} · {s.articles.length} {s.articles.length===1?'source':'sources'}</div><h3>{s.title}</h3><Coverage story={s}/></div>):<p className="muted">More headlines will appear as feeds update.</p>}</div></div></section>}
   <section aria-labelledby="latest-label"><div className="section-head"><h2 id="latest-label">{view==='Today'?'Latest':view==='Saved'?'Saved stories':'News stream'} <span>{latest.length}</span></h2><div className="segmented" aria-label="Story layout"><button type="button" aria-label="Grid view" aria-pressed={mode==='grid'} onClick={()=>setMode('grid')}><Icon name="grid" size={15}/></button><button type="button" aria-label="List view" aria-pressed={mode==='list'} onClick={()=>setMode('list')}><Icon name="list" size={15}/></button></div></div>
   {(view==='Today'||view==='Topics')&&<div className="chips" aria-label="Filter by topic">{['',...topics.map(([t])=>t)].map(t=><button type="button" key={t} aria-pressed={topic===t} onClick={()=>selectTopic(t)}>{t||'All topics'}</button>)}</div>}
   {(ticker||source)&&<button className="back" type="button" onClick={()=>switchView(view)}>← All {ticker?'stocks':'sources'}</button>}
   {latest.length?<div className={'cards '+(mode==='list'?'list':'')}>{latest.map(s=><StoryCard story={s} key={s.id}/>)}</div>:!lead&&<div className="empty">{term?'No matching stories.':view==='Saved'?'Save a story to keep it here.':!data?.updated_at?status+'. Approved feeds will appear here after the first successful refresh.':'No matching stories.'}</div>}
   </section></>}
  </main>
 </div></div>
}
