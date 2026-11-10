const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
export async function api(req,env){
const url=new URL(req.url),path=url.pathname,user=req.headers.get('oai-authenticated-user-id');
if(!user)return reply({error:'ログインが必要です'},401);
if(path==='/api/identity'&&req.method==='GET')return reply({userId:user,ready:!!env.OWNER_USER_ID&&env.OWNER_USER_ID===user,realData:env.REAL_DATA_ENABLED==='true'});
if(!env.OWNER_USER_ID)return reply({error:'本人アカウントの固定とアクセス検証が未完了です。登録は停止中です。'},423);
if(user!==env.OWNER_USER_ID)return reply({error:'アクセスできません'},403);
if(!env.DB)return reply({error:'保存先が未設定です'},503);
if(!['GET','POST','PUT'].includes(req.method))return reply({error:'Method not allowed'},405);
if(req.method!=='GET'){
if(req.headers.get('Origin')!==url.origin||req.headers.get('Sec-Fetch-Site')==='cross-site')return reply({error:'送信元を確認できません'},403);
if(!(req.headers.get('Content-Type')||'').startsWith('application/json'))return reply({error:'JSON only'},415);
if(Number(req.headers.get('Content-Length')||0)>4096)return reply({error:'Too large'},413);
}
try{
if(path==='/api/state'&&req.method==='GET'){
const fans=await env.DB.prepare('SELECT id,name,created_at FROM fans WHERE owner_id=? ORDER BY created_at').bind(user).all();
const lives=await env.DB.prepare('SELECT id,date,title FROM lives WHERE owner_id=? ORDER BY date DESC').bind(user).all();
const visits=await env.DB.prepare('SELECT fan_id,live_id FROM visits WHERE owner_id=?').bind(user).all();
return reply({fans:fans.results,lives:lives.results,visits:visits.results,realData:env.REAL_DATA_ENABLED==='true'});}
if(req.method==='GET')return reply({error:'Not found'},404);
const raw=await req.text();if(raw.length>4096)return reply({error:'Too large'},413);const b=JSON.parse(raw);
if(!b||typeof b!=='object'||Array.isArray(b))return reply({error:'入力を確認してください'},400);
if(path==='/api/fans'&&req.method==='POST'){
if(Object.keys(b).some(k=>k!=='name')||typeof b.name!=='string'||!b.name.trim()||b.name.length>60||/[\u0000-\u001f]/.test(b.name))return reply({error:'チェキネームを1〜60文字で入力してください'},400);
if(env.REAL_DATA_ENABLED!=='true'&&b.name!=='テスト用ファン')return reply({error:'確認中は「テスト用ファン」だけ登録できます。実データはまだ登録できません'},423);
const id=crypto.randomUUID();await env.DB.prepare('INSERT INTO fans(id,owner_id,name,created_at) VALUES(?,?,?,?)').bind(id,user,b.name.trim(),new Date().toISOString()).run();return reply({id},201);}
if(path==='/api/lives'&&req.method==='POST'){
if(Object.keys(b).some(k=>!['date','title'].includes(k))||typeof b.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(b.date)||new Date(b.date+'T00:00:00Z').toISOString().slice(0,10)!==b.date||typeof b.title!=='string'||!b.title.trim()||b.title.length>100)return reply({error:'日付と公演名を確認してください'},400);
if(env.REAL_DATA_ENABLED!=='true'&&b.title!=='テスト公演')return reply({error:'検証中はテスト公演のみ登録できます'},423);
const id=crypto.randomUUID();await env.DB.prepare('INSERT INTO lives(id,owner_id,date,title) VALUES(?,?,?,?)').bind(id,user,b.date,b.title.trim()).run();return reply({id},201);}
if(path==='/api/visits'&&req.method==='PUT'){
if(Object.keys(b).some(k=>!['fanId','liveId','present'].includes(k))||typeof b.fanId!=='string'||typeof b.liveId!=='string'||typeof b.present!=='boolean')return reply({error:'入力を確認してください'},400);
const fan=await env.DB.prepare('SELECT id FROM fans WHERE id=? AND owner_id=?').bind(b.fanId,user).first(),live=await env.DB.prepare('SELECT id FROM lives WHERE id=? AND owner_id=?').bind(b.liveId,user).first();
if(!fan||!live)return reply({error:'Not found'},404);
await env.DB.prepare(b.present?'INSERT OR IGNORE INTO visits(owner_id,fan_id,live_id) VALUES(?,?,?)':'DELETE FROM visits WHERE owner_id=? AND fan_id=? AND live_id=?').bind(user,b.fanId,b.liveId).run();return reply({ok:true});}
return reply({error:'Not found'},404);
}catch(e){return reply({error:'処理できませんでした。入力と保存状態を確認してください'},400);}
}
