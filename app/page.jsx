'use client';
import {useEffect,useState} from 'react';
export default function Inbox(){
 const [data,setData]=useState(null),[error,setError]=useState(false),[query,setQuery]=useState('');
 useEffect(()=>{let active=true; async function refresh(){try{const res=await fetch(process.env.NEXT_PUBLIC_BASE_PATH + '/api/stories.php',{cache:'no-store'});if(!res.ok)throw Error();const value=await res.json();if(active){setData(value);setError(false)}}catch{if(active)setError(true)}}refresh();const timer=setInterval(refresh,60000);return()=>{active=false;clearInterval(timer)}},[]);
 const stories=(data?.stories??[]).filter(s=>[s.title,...s.articles.map(a=>a.source)].join(' ').toLowerCase().includes(query.toLowerCase().trim()));
 return <main className="mx-auto max-w-5xl px-6 py-12"><p className="font-semibold tracking-widest text-cyan-300">NEWSDESK</p><h1 className="mt-4 text-4xl font-bold">Story inbox</h1><p className="mt-2 text-slate-400">Track approved feeds and compare publisher coverage.</p>
 <label className="mt-8 block">Search headlines or sources<input className="mt-2 block w-full rounded-lg border border-slate-700 bg-slate-900 p-3" value={query} onChange={e=>setQuery(e.target.value)} /></label>
 <p role="status" className="my-5 text-sm text-slate-400">{error?'Could not refresh the inbox.':!data?'Loading inbox…':data.updated_at?'Snapshot: '+data.updated_at:'No snapshot yet. Run ingestion first.'}</p>
 {data&&!stories.length&&<p>No matching stories.</p>}
 <div className="space-y-4">{stories.map(s=><article key={s.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5"><h2 className="text-lg font-semibold">{s.title}</h2><ul className="mt-3 space-y-1">{s.articles.map(a=><li key={a.url}><a className="text-cyan-300 underline" href={a.url} target="_blank" rel="noopener noreferrer">{a.source} · {a.title}</a></li>)}</ul></article>)}</div></main>
}
