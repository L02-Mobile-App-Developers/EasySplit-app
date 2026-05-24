const base = 'http://localhost:8080/api/v1';
const pw = '123456';
const now = Date.now();
const emailA = `copilotA.${now}@esplit.app`;
const emailB = `copilotB.${now}@esplit.app`;

async function req(path, opts={}){
  const res = await fetch(base+path, opts);
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch(e){ body = text }
  if (!res.ok) throw { status: res.status, body };
  return body;
}

(async()=>{
  try{
    const regA = await req('/auth/register', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({email: emailA, displayName: 'Copilot A', password: pw}) });
    const regB = await req('/auth/register', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({email: emailB, displayName: 'Copilot B', password: pw}) });
    const loginA = await req('/auth/login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({email: emailA, password: pw}) });
    const loginB = await req('/auth/login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({email: emailB, password: pw}) });
    const tokenA = loginA.data.accessToken;
    const tokenB = loginB.data.accessToken;

    const send = await req('/friends', { method: 'POST', headers: {'Content-Type':'application/json', Authorization: `Bearer ${tokenA}`}, body: JSON.stringify({ email: emailB }) });
    const requestsB = await req('/friends/requests', { method: 'GET', headers: { Authorization: `Bearer ${tokenB}` } });
    const accept = await req(`/friends/${send.data.id}/accept`, { method: 'POST', headers: { Authorization: `Bearer ${tokenB}` } });
    const friendsA = await req('/friends', { method: 'GET', headers: { Authorization: `Bearer ${tokenA}` } });
    const friendsB = await req('/friends', { method: 'GET', headers: { Authorization: `Bearer ${tokenB}` } });

    console.log(JSON.stringify({ emailA, emailB, send, requestsB, accept, friendsA, friendsB }, null, 2));
  }catch(err){
    console.error('ERROR', JSON.stringify(err, null, 2));
    process.exit(1);
  }
})();
